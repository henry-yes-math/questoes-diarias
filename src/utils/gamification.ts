import { MilestoneInfo } from '../types';

export const MILESTONES: number[] = [
  3,
  5,
  7,
  ...Array.from({ length: 199 }, (_, i) => 10 + i * 5), // 10, 15, 20, 25, 30, 35, 40, 45, 50, ..., 1000
];

/**
 * Retorna a data no formato YYYY-MM-DD no horário local
 */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna a data de ontem no formato YYYY-MM-DD
 */
export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

/**
 * Determina o estado correto de `selectedLetter` sincronizado com o status real
 * de conclusão do ciclo atual, impedindo que a resposta correta fique marcada
 * indevidamente por cache residual de ciclos anteriores.
 */
export function syncSelectedLetterWithCompletion({
  selectedLetter,
  correctLetter,
  hasCompletedToday,
  pendingSubmissionSync,
  isSubmitting,
  isNickModalOpen,
}: {
  selectedLetter: string | null;
  correctLetter?: string | null;
  hasCompletedToday: boolean;
  pendingSubmissionSync: boolean;
  isSubmitting: boolean;
  isNickModalOpen: boolean;
}): string | null {
  if (!correctLetter) return selectedLetter;

  // 1. Se o aluno realmente concluiu o ciclo de hoje ou está com sincronização pendente desta questão,
  // garante que a alternativa correta apareça marcada.
  if (hasCompletedToday || pendingSubmissionSync) {
    return correctLetter;
  }

  // 2. Se a alternativa correta está marcada na tela, mas o aluno NÃO concluiu hoje,
  // NÃO tem sincronização pendente, NÃO está enviando agora e NÃO está no modal de apelido,
  // trata-se de marcação residual de um ciclo anterior -> limpa imediatamente para null.
  if (selectedLetter === correctLetter && !isSubmitting && !isNickModalOpen) {
    return null;
  }

  // 3. Caso contrário (ex: null, alternativa incorreta sendo testada, ou envio em andamento), preserva.
  return selectedLetter;
}

/**
 * Verifica de forma determinística se o aluno já concluiu especificamente
 * a questão ativa (`currentQuestionId`) no ciclo atual (`currentCycleNumber`).
 * Garante que uma nova questão nunca apareça como concluída por herança de outra questão.
 */
export function hasStudentCompletedCurrentQuestion({
  isCycleLoaded,
  currentCycleNumber,
  currentQuestionId,
  mySubmission,
  profile,
}: {
  isCycleLoaded: boolean;
  currentCycleNumber: number;
  currentQuestionId: string;
  mySubmission: { cycleNumber?: number; questionId?: string } | null;
  profile: { lastCompletedCycle?: number; lastCompletedQuestionId?: string } | null;
}): boolean {
  if (!isCycleLoaded || !currentCycleNumber || !currentQuestionId) {
    return false;
  }

  const questionIdStr = String(currentQuestionId);

  // 1. Se temos a submissão do aluno para o ciclo atual, ela é a fonte da verdade sobre qual questão foi resolvida
  if (mySubmission && mySubmission.cycleNumber === currentCycleNumber) {
    if (!mySubmission.questionId) {
      return true;
    }
    return String(mySubmission.questionId) === questionIdStr;
  }

  // 2. Se o perfil indica conclusão neste ciclo E registra exatamente o ID desta questão
  if (
    profile &&
    profile.lastCompletedCycle === currentCycleNumber &&
    profile.lastCompletedQuestionId &&
    String(profile.lastCompletedQuestionId) === questionIdStr
  ) {
    return true;
  }

  return false;
}

/**
 * Calcula o progresso, metas e comemorações com base no total acumulado
 */
export function calculateMilestone(
  currentTotal: number,
  previousTotal: number
): MilestoneInfo {
  const isFirstQuestion = currentTotal === 1;

  // Encontra o próximo marco
  let nextMilestone =
    MILESTONES.find((m) => m > currentTotal) ||
    (Math.floor(currentTotal / 5) + 1) * 5;
  let target = nextMilestone;

  // Verifica se acabou de desbloquear um marco (pega o maior se pulou mais de um)
  const justUnlocked = [...MILESTONES]
    .reverse()
    .find((m) => previousTotal < m && currentTotal >= m);

  const isMilestoneJustUnlocked = Boolean(justUnlocked);
  const unlockedTarget = justUnlocked;

  // Se acabou de desbloquear, o target atual exibido é o marco conquistado
  // e o nextTarget é o próximo
  let nextTarget = target;
  if (isMilestoneJustUnlocked && unlockedTarget) {
    const nextIdx = MILESTONES.findIndex((m) => m === unlockedTarget);
    nextTarget =
      nextIdx !== -1 && nextIdx + 1 < MILESTONES.length
        ? MILESTONES[nextIdx + 1]
        : unlockedTarget + 5;
  }

  // Cálculo percentual alinhado diretamente com o placar exibido:
  // Se acabou de desbloquear um marco, a barra mira no próximo marco (ex: 3 de 5 = 60%).
  // No dia a dia regular, a barra mira na meta vigente (ex: 8 de 10 = 80%).
  const effectiveTarget =
    isMilestoneJustUnlocked && nextTarget ? nextTarget : target;
  const progressPercentage =
    effectiveTarget > 0
      ? Math.min(100, Math.round((currentTotal / effectiveTarget) * 100))
      : 100;

  const remaining = Math.max(0, target - currentTotal);

  let celebrationMessage: string | undefined;
  let nextMilestonePrompt: string | undefined;
  if (isMilestoneJustUnlocked && unlockedTarget) {
    if (unlockedTarget === 3) {
      celebrationMessage =
        'Você começou com o pé direito e está construindo um hábito forte!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã tem questão nova no WhatsApp para você manter o embalo rumo às 5!`;
    } else if (unlockedTarget === 5) {
      celebrationMessage =
        '5 questões concluídas! Seu ritmo de estudos está cada dia mais firme!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã tem mais no WhatsApp para a gente buscar a meta de 7!`;
    } else if (unlockedTarget === 7) {
      celebrationMessage =
        '7 questões concluídas! Você está mostrando uma consistência incrível nos estudos!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã tem mais uma no WhatsApp para você abrir o caminho dos dois dígitos!`;
    } else if (unlockedTarget === 10) {
      celebrationMessage =
        '10 questões batidas! Você entrou oficialmente no clube dos dois dígitos!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã a gente dá a largada rumo ao marco de 15!`;
    } else if (unlockedTarget === 15) {
      celebrationMessage =
        '15 questões resolvidas! Metade de um mês de evolução sólida na matemática!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã no WhatsApp continuamos firmes rumo ao marco de ${nextTarget}!`;
    } else if (unlockedTarget === 20) {
      celebrationMessage =
        '20 questões resolvidas! 4 semanas de evolução e disciplina diária!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã no WhatsApp continuamos firmes rumo ao marco de ${nextTarget}!`;
    } else if (unlockedTarget === 25) {
      celebrationMessage =
        '25 questões concluídas! Sua dedicação aos estudos é inspiradora!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã no WhatsApp continuamos firmes rumo ao marco de ${nextTarget}!`;
    } else if (unlockedTarget === 30) {
      celebrationMessage =
        '30 questões! Um mês inteiro de matemática no seu dia a dia!';
      nextMilestonePrompt =
        `Faltam ${remaining} questões para o próximo nível. Amanhã no WhatsApp continuamos firmes rumo ao marco de ${nextTarget}!`;
    } else {
      celebrationMessage = `Incrível! Você superou o marco de ${unlockedTarget} questões!`;
      nextMilestonePrompt =
        `Faltam ${remaining} ${remaining === 1 ? 'questão' : 'questões'} para o próximo nível. Amanhã no WhatsApp continuamos firmes rumo ao marco de ${nextTarget}!`;
    }
  }

  return {
    currentTotal,
    target,
    isFirstQuestion,
    isMilestoneJustUnlocked,
    unlockedTarget,
    nextTarget,
    progressPercentage,
    remaining,
    celebrationMessage,
    nextMilestonePrompt,
  };
}

export const MAX_STREAK_SHIELDS = 2;
export const QUESTIONS_PER_SHIELD = 6;
export const STREAK_DAYS_PER_SHIELD = QUESTIONS_PER_SHIELD;

/**
 * Calcula quantas questões faltam para o aluno desbloquear o próximo Escudo de Ofensiva
 * (1º escudo na 2ª questão, e depois a cada 6 questões resolvidas: 6, 12, 18, 24, 30...)
 */
export function getQuestionsUntilNextShield(
  totalSolved: number = 0,
  currentShields: number = 0
): {
  nextShieldTarget: number;
  remainingQuestions: number;
} {
  const safeTotal = Math.max(0, totalSolved || 0);
  const nextShieldTarget =
    safeTotal < 2
      ? 2
      : (Math.floor(safeTotal / QUESTIONS_PER_SHIELD) + 1) * QUESTIONS_PER_SHIELD;

  if (currentShields >= MAX_STREAK_SHIELDS) {
    return {
      nextShieldTarget,
      remainingQuestions: 0,
    };
  }

  return {
    nextShieldTarget,
    remainingQuestions: Math.max(1, nextShieldTarget - safeTotal),
  };
}

export interface StreakShieldCalculationResult {
  newStreak: number;
  newMaxStreak: number;
  newShields: number;
  shieldWasUsed: boolean;
  shieldsUsed?: number;
  earnedNewShield: boolean;
  usedInCycle?: number;
  wasRescued?: boolean;
  previousStreakBeforeRescue?: number;
}

/**
 * Formata o apelido do aluno para caber rigorosamente em uma única linha curta no WhatsApp mobile,
 * reduzindo repetições excessivas de caracteres (ex: "reeeeeeeeeeeeeeeeeenato" -> "reeeeenato").
 */
export function formatWhatsAppNickname(nickname: string): string {
  const clean = (nickname || 'Estudante').trim().replace(/\s+/g, ' ');
  // Reduz qualquer letra repetida mais de 5 vezes seguidas para 5 repetições
  const collapsed = clean.replace(/(.)\1{5,}/gi, '$1$1$1$1$1');
  if (collapsed.length <= 22) {
    return collapsed;
  }
  return collapsed.slice(0, 21).trimEnd() + '…';
}

/**
 * Calcula a ofensiva (streak), o recorde histórico (maxStreakDays) e o gerenciamento de
 * Protetores de Chama (Shields) com base nos ciclos diários acionados pelo professor.
 * Concede +1 escudo na 2ª questão (onboarding) e +1 escudo a cada 6 questões resolvidas
 * no total acumulado (6, 12, 18, 24...), sem exigir dias consecutivos, até o teto de 2 escudos.
 * Quando `isRescueDay` está ativo, alunos com recorde histórico `maxStreakDays >= 2`
 * cuja ofensiva normal ficaria abaixo de `maxStreakDays + 1` resgatam sua ofensiva para `maxStreakDays + 1`.
 */
export function calculateNewStreakWithShield(
  lastCompletedCycle: number | undefined | null,
  currentStreak: number,
  currentCycleNumber: number,
  currentShields: number = 0,
  newTotal?: number,
  isRescueDay: boolean = false,
  maxStreakDays: number = 0
): StreakShieldCalculationResult {
  const safeCurrentStreak = Math.max(0, currentStreak || 0);
  const historicalMax = Math.max(safeCurrentStreak, maxStreakDays || 0);
  const safeShields = Math.max(0, Math.min(MAX_STREAK_SHIELDS, currentShields || 0));

  // Verifica se o aluno ganha +1 escudo nesta questão (na 2ª questão ou em múltiplos de 6 questões resolvidas)
  const evaluateShieldEarned = (
    baseShields: number,
    fallbackQuestionCount?: number
  ): { shields: number; earned: boolean } => {
    if (baseShields >= MAX_STREAK_SHIELDS) {
      return { shields: baseShields, earned: false };
    }

    const effectiveTotal =
      newTotal !== undefined && newTotal !== null ? newTotal : fallbackQuestionCount;

    if (effectiveTotal !== undefined && effectiveTotal !== null) {
      const isSecondQuestionOnboarding = newTotal === 2;
      const isMultipleOfSixQuestions =
        effectiveTotal >= QUESTIONS_PER_SHIELD &&
        effectiveTotal % QUESTIONS_PER_SHIELD === 0;

      if (isSecondQuestionOnboarding || isMultipleOfSixQuestions) {
        return { shields: baseShields + 1, earned: true };
      }
    }

    return { shields: baseShields, earned: false };
  };

  const applyRescueIfEligible = (
    baseResult: Omit<StreakShieldCalculationResult, 'newMaxStreak'>
  ): StreakShieldCalculationResult => {
    if (
      isRescueDay &&
      lastCompletedCycle !== currentCycleNumber &&
      historicalMax >= 2 &&
      baseResult.newStreak < historicalMax + 1
    ) {
      const rescuedStreak = historicalMax + 1;
      const earnedCheck = evaluateShieldEarned(safeShields, rescuedStreak);
      return {
        ...baseResult,
        newStreak: rescuedStreak,
        newMaxStreak: Math.max(historicalMax, rescuedStreak),
        newShields: earnedCheck.shields,
        shieldWasUsed: false,
        shieldsUsed: 0,
        earnedNewShield: earnedCheck.earned,
        usedInCycle: undefined,
        wasRescued: true,
        previousStreakBeforeRescue: historicalMax,
      };
    }

    return {
      ...baseResult,
      newMaxStreak: Math.max(historicalMax, baseResult.newStreak),
      wasRescued: false,
    };
  };

  // 1. Aluno sem histórico ou iniciando agora
  if (lastCompletedCycle === undefined || lastCompletedCycle === null || lastCompletedCycle <= 0) {
    const earnedCheck = evaluateShieldEarned(safeShields);
    return applyRescueIfEligible({
      newStreak: 1,
      newShields: earnedCheck.shields,
      shieldWasUsed: false,
      shieldsUsed: 0,
      earnedNewShield: earnedCheck.earned,
    });
  }

  // 2. Se já concluiu este mesmo ciclo anteriormente, mantém a ofensiva e escudos
  if (lastCompletedCycle === currentCycleNumber) {
    const keptStreak = Math.max(1, safeCurrentStreak);
    return {
      newStreak: keptStreak,
      newMaxStreak: Math.max(historicalMax, keptStreak),
      newShields: safeShields,
      shieldWasUsed: false,
      shieldsUsed: 0,
      earnedNewShield: false,
      wasRescued: false,
    };
  }

  // 3. Concluiu exatamente o ciclo imediatamente anterior (consecutivo, sem falta)
  if (lastCompletedCycle === currentCycleNumber - 1) {
    const nextStreak = Math.max(1, safeCurrentStreak) + 1;
    const earnedCheck = evaluateShieldEarned(safeShields, nextStreak);
    return applyRescueIfEligible({
      newStreak: nextStreak,
      newShields: earnedCheck.shields,
      shieldWasUsed: false,
      shieldsUsed: 0,
      earnedNewShield: earnedCheck.earned,
    });
  }

  // 4. Pulou ciclos. Quantos ciclos foram perdidos?
  const missedCycles = currentCycleNumber - 1 - lastCompletedCycle;

  // Se faltou 1 ou mais ciclos e tem protetores suficientes para cobrir TODAS as faltas consecutivas:
  if (missedCycles > 0 && safeShields >= missedCycles) {
    const shieldsUsed = missedCycles;
    const consumedShields = safeShields - shieldsUsed;
    const nextStreak = Math.max(1, safeCurrentStreak) + 1;
    const earnedCheck = evaluateShieldEarned(consumedShields, nextStreak);

    return applyRescueIfEligible({
      newStreak: nextStreak,
      newShields: earnedCheck.shields,
      shieldWasUsed: true,
      shieldsUsed,
      earnedNewShield: earnedCheck.earned,
      usedInCycle: currentCycleNumber - 1,
    });
  }

  // 5. Sem protetores suficientes -> ofensiva normal reiniciaria em 1 (ou é resgatada se isRescueDay = true)
  const earnedCheck = evaluateShieldEarned(safeShields);
  return applyRescueIfEligible({
    newStreak: 1,
    newShields: earnedCheck.shields,
    shieldWasUsed: false,
    shieldsUsed: 0,
    earnedNewShield: earnedCheck.earned,
  });
}

/**
 * Calcula a ofensiva (streak) com base nos ciclos diários acionados pelo professor
 */
export function calculateNewStreakByCycle(
  lastCompletedCycle: number | undefined,
  currentStreak: number,
  currentCycleNumber: number,
  currentShields: number = 0,
  newTotal?: number,
  isRescueDay: boolean = false,
  maxStreakDays: number = 0
): number {
  return calculateNewStreakWithShield(
    lastCompletedCycle,
    currentStreak,
    currentCycleNumber,
    currentShields,
    newTotal,
    isRescueDay,
    maxStreakDays
  ).newStreak;
}

/**
 * Calcula a ofensiva (streak) com base na última data resolvida (fallback)
 */
export function calculateNewStreak(
  lastSolvedDate: string | null,
  currentStreak: number,
  todayStr: string
): number {
  if (!lastSolvedDate) {
    return 1;
  }

  if (lastSolvedDate === todayStr) {
    return Math.max(1, currentStreak);
  }

  const yesterdayStr = getYesterdayDateString();
  if (lastSolvedDate === yesterdayStr) {
    return currentStreak + 1;
  }

  // Se pulou dias, recomeça em 1
  return 1;
}

export const DEFAULT_WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/G5qC4QhK64o4h3Y';

/**
 * Gera a mensagem oficial para o aluno recomendar o grupo do WhatsApp nos seus grupos de estudo
 */
export function generateGroupShareWhatsAppUrl(whatsappGroupUrl?: string): string {
  const cleanGroupUrl = (whatsappGroupUrl && whatsappGroupUrl.trim())
    ? whatsappGroupUrl.trim()
    : DEFAULT_WHATSAPP_GROUP_URL;

  const text = `Gente, pra quem tá treinando matemática pro ENEM: tô usando esse grupo e achei muito bom. 

Todo dia eles mandam 1 questão oficial que dá pra resolver em 3 minutos, com dicas passo a passo se você travar.

Achei muito prático pra manter o ritmo todo dia sem tomar tempo:
👉 ${cleanGroupUrl}`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Gera o texto estilo Wordle para o aluno compartilhar a questão do dia e desafiar amigos no WhatsApp
 */
export function generateStudentInviteWhatsAppUrl(
  studentNickname: string,
  baseUrl?: string,
  cycleNumber?: number,
  streakDays?: number
): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const cleanNick = studentNickname ? encodeURIComponent(studentNickname.trim()) : '';
  const inviteUrl = cleanNick ? `${origin}/?convite=${cleanNick}` : origin;

  const cycleStr = cycleNumber ? String(cycleNumber).padStart(2, '0') : '01';
  const streakText = streakDays && streakDays > 1
    ? `🔥 ${streakDays} dias seguidos`
    : `🔥 1 dia de ofensiva`;

  const text = `Matemática do ENEM #${cycleStr} 📐
${streakText}
🎯 Resolvida!

Duvido você acertar essa de primeira kkk
👉 ${inviteUrl}`;

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Gera as mensagens oficiais de WhatsApp com base no ciclo diário e no Modo Dia do Resgate da Chama
 */
export function generateWhatsAppMessages({
  yesterdayList,
  todayList,
  questionUrl,
  topicTitle = 'Geometria Plana — Áreas e Perímetros (ENEM)',
  cycleNumber = 1,
  isRescueDay = false,
  rescueCandidates = [],
}: {
  yesterdayList: Array<{
    nickname: string;
    streakDays: number;
    totalSolved?: number;
    unlockedMilestone?: number;
    wasRescued?: boolean;
  }>;
  todayList: Array<{
    nickname: string;
    streakDays: number;
    totalSolved?: number;
    unlockedMilestone?: number;
    wasRescued?: boolean;
  }>;
  questionUrl: string;
  topicTitle?: string;
  cycleNumber?: number;
  isRescueDay?: boolean;
  rescueCandidates?: Array<{
    studentId: string;
    nickname: string;
    maxStreakDays: number;
    currentStreakDays: number;
    totalSolved: number;
    lastCompletedCycle: number;
    hasRescuedToday: boolean;
    newStreakAfterRescue: number;
  }>;
}) {
  const countYesterday = yesterdayList.length;

  // Segmentação estrita sem duplicação para a Mensagem 1
  const metaBatidaItems = yesterdayList.filter((item) => Boolean(item.unlockedMilestone));
  const metaBatidaNames = new Set(metaBatidaItems.map((i) => i.nickname.toLowerCase()));

  const primeiraItems = yesterdayList.filter((item) => {
    if (metaBatidaNames.has(item.nickname.toLowerCase())) return false;
    const total = item.totalSolved ?? item.streakDays;
    return total === 1;
  });
  const primeiraNames = new Set(primeiraItems.map((i) => i.nickname.toLowerCase()));

  const naCaraDoGolItems = yesterdayList.filter((item) => {
    const nickLower = item.nickname.toLowerCase();
    if (metaBatidaNames.has(nickLower) || primeiraNames.has(nickLower)) return false;
    const total = item.totalSolved ?? item.streakDays ?? 1;
    const target = MILESTONES.find((m) => m > total) || (Math.floor(total / 5) + 1) * 5;
    return target - total === 1;
  });
  const naCaraDoGolNames = new Set(naCaraDoGolItems.map((i) => i.nickname.toLowerCase()));

  const mantiveramOfensivaItems = yesterdayList.filter((item) => {
    const nickLower = item.nickname.toLowerCase();
    return (
      !metaBatidaNames.has(nickLower) &&
      !primeiraNames.has(nickLower) &&
      !naCaraDoGolNames.has(nickLower)
    );
  });

  const sortAlphabetically = <T extends { nickname: string }>(items: T[]): T[] => {
    return [...items].sort((a, b) =>
      a.nickname.localeCompare(b.nickname, 'pt-BR', { sensitivity: 'base' })
    );
  };

  // Montagem dos blocos da Mensagem 1 (sempre 1 linha curta por aluno)
  const message1Blocks: string[] = [];

  const metaBatidaSorted = sortAlphabetically(metaBatidaItems);
  if (metaBatidaSorted.length > 0) {
    const metaLines = metaBatidaSorted
      .map((i) => `• *${formatWhatsAppNickname(i.nickname)}* (Meta ${i.unlockedMilestone} 🏆)`)
      .join('\n');

    message1Blocks.push(`🎯 *METAS BATIDAS ONTEM:*\n${metaLines}`);
  }

  const primeiraSorted = sortAlphabetically(primeiraItems);
  if (primeiraSorted.length > 0) {
    const primeiraLines = primeiraSorted
      .map((i) => `• *${formatWhatsAppNickname(i.nickname)}* (🔥 1º dia)`)
      .join('\n');
    message1Blocks.push(
      `🔥 *GARANTIRAM A 1ª QUESTÃO ONTEM:*\n${primeiraLines}\n\nA primeira já foi! Hoje tem a 2ª para manter o ritmo firme 💪`
    );
  }

  const naCaraDoGolSorted = sortAlphabetically(naCaraDoGolItems);
  if (naCaraDoGolSorted.length > 0) {
    const naCaraDoGolLines = naCaraDoGolSorted
      .map((i) => {
        const total = i.totalSolved ?? i.streakDays ?? 1;
        const target = MILESTONES.find((m) => m > total) || (Math.floor(total / 5) + 1) * 5;
        return `• *${formatWhatsAppNickname(i.nickname)}* (Meta ${target} 🎯)`;
      })
      .join('\n');

    message1Blocks.push(
      `⏳ *NA CARA DO GOL (Falta só 1 para a meta):*\n${naCaraDoGolLines}\n\nA questão de hoje carimba a meta de vocês! 👀`
    );
  }

  const itensParaOfensiva =
    mantiveramOfensivaItems.length > 0
      ? mantiveramOfensivaItems
      : message1Blocks.length === 0
      ? yesterdayList
      : [];

  const ofensivaSorted = sortAlphabetically(itensParaOfensiva);

  if (ofensivaSorted.length > 0) {
    const ofensivaLines = ofensivaSorted
      .map((item) => `• *${formatWhatsAppNickname(item.nickname)}* (🔥 ${item.streakDays} ${
        item.streakDays === 1 ? 'dia' : 'dias'
      })`)
      .join('\n');

    message1Blocks.push(`⚡ *MANTIVERAM A OFENSIVA ACESA:*\n${ofensivaLines}`);
  } else if (countYesterday === 0) {
    message1Blocks.push('• *Turma Yes Matemática* (🔥 1 dia)');
  }

  const message1 = isRescueDay
    ? `🏆 *MURAL DE ONTEM + AVISO ESPECIAL!* 🔥⚡

Parabéns aos *${countYesterday} ${
        countYesterday === 1 ? 'guerreiro que fechou' : 'guerreiros que fecharam'
      }* o desafio de ontem! 👏
👀 *ATENÇÃO:* Já deixou sua chama apagar em algum momento? Na mensagem abaixo vou liberar o *DIA DO RESGATE* para você recuperar seu recorde hoje! ⚡

${message1Blocks.join('\n\n')}

👇 *A Questão de Hoje + Dia do Resgate já estão valendo logo abaixo!*

🔗 *Quer convidar um amigo pro nosso grupo?* Mande este link:
https://tinyurl.com/enem-questoes-diarias`
    : `⚔️ *BOM DIA! MURAL DE ONTEM* 🎯

*${countYesterday} ${
        countYesterday === 1 ? 'mente focada manteve' : 'mentes focadas mantiveram'
      } o ritmo firme* e fecharam o dia com a presença garantida! 🎯

${message1Blocks.join('\n\n')}

👏 Parabéns a quem manteve o ritmo firme!
Viu seu apelido na lista? Deixa um 👍 aqui!

🔗 *Quer convidar um amigo pro nosso grupo?* Mande este link:
https://tinyurl.com/enem-questoes-diarias`;

  // Mensagem 2 - Manhã (Questão do Dia ou Dia do Resgate Enxuto)
  const message2 = isRescueDay
    ? `🚨 *QUESTÃO DO DIA + DIA DO RESGATE!* 🔥⚡

🔗 *RESOLVA AGORA (3 a 5 min):*
👉 ${questionUrl}

Veja como funciona o desafio de hoje (valendo até as *23h59*):

🔥 *Está no seu recorde atual?* Resolva hoje para somar *+1 dia seguido* e defender sua sequência!
⚡ *Já deixou sua chama apagar em algum momento?* Hoje você tem uma *Segunda Chance Oficial*! Acertando a questão de hoje, o app devolve toda a sua *maior ofensiva histórica + 1 dia*!

👀 *Abra o link acima para ver sua chama e resolver em 3 min!* 👇`
    : `🚀 *QUESTÃO DO DIA LIBERADA!*

📌 ENEM — Matemática (com dicas guiadas se travar)

⚠️ *REGRA DO FOGO:*
• *Quem já tá no jogo:* responda hoje para somar *+1 dia de ofensiva 🔥*. Se pular o dia, *ZERA TUDO!*
• *Quem tá chegando agora:* faça hoje para estrear sua chama de *🔥 1 dia*.

Quem vai ser a 1ª pessoa a inaugurar o Mural de hoje? 👀

🔗 *FAÇA AGORA (3 a 5 min):*
👉 ${questionUrl}

👇 Vai manter sua chama acesa? Manda um 🔥!`;

  // Mensagem Extra do Almoço (Plantão do Meio-Dia)
  const countToday = todayList.length;

  const messageLunch = isRescueDay
    ? `⏰ *PLANTÃO DO MEIO-DIA — DIA DO RESGATE!* 🔥⚡

Já são *${countToday} ${
        countToday === 1 ? 'aluno com presença garantida' : 'alunos com presença garantida'
      }* no Mural de hoje! 🎯

Se você ainda não resolveu a questão de hoje, aproveite *3 minutinhos do almoço*:
• *Está no seu recorde?* Garanta *+1 dia seguido* 🔥
• *Já deixou a chama apagar em algum momento?* Recupere toda a sua *maior ofensiva histórica + 1 dia* hoje! ⚡

🔗 *RESOLVA AGORA (3 a 5 min):*
👉 ${questionUrl}`
    : `⏰ *PLANTÃO DO MEIO-DIA — QUESTÃO DO DIA!* 🔥

🔗 *LINK DA QUESTÃO DE HOJE:*
👉 ${questionUrl}

Já são *${countToday} ${
        countToday === 1 ? 'fera com presença garantida' : 'feras com presença garantida'
      }* no Mural de hoje! 🎯

Se você ainda não resolveu a questão de hoje, aproveite os 3 minutinhos pós-almoço para garantir *+1 dia de ofensiva 🔥* e ficar livre à noite!

🔗 *RESOLVA AGORA (3 a 5 min):*
👉 ${questionUrl}`;

  // Mensagem 3 - Noite (Mural de Hoje por Ordem de Chegada - 1 linha curta por aluno, sem asterisco nos resgatados)
  let muralLinesToday = '';
  if (countToday === 0) {
    muralLinesToday = '01. *O próximo pode ser você!*';
  } else {
    muralLinesToday = todayList
      .map((item, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        return `${num}. *${formatWhatsAppNickname(item.nickname)}* (🔥 ${item.streakDays} ${
          item.streakDays === 1 ? 'dia' : 'dias'
        })`;
      })
      .join('\n');
  }

  // Mensagem 3A - Noite (Parte 1: Lista / Prova Social)
  const message3A = `🔥 *QUEM JÁ SALVOU A OFENSIVA HOJE:* 🔥

Já passamos da metade do dia e *${countToday} ${
    countToday === 1 ? 'fera já garantiu' : 'feras já garantiram'
  } a presença* no mural de hoje! 🎯

${muralLinesToday}`;

  // Mensagem 3B - Noite (Parte 2: Chamada Noturna + Link)
  const message3B = isRescueDay
    ? `🌙 *ÚLTIMAS HORAS (ATÉ 23h59): DEFENDA OU RESGATE SUA CHAMA!* 🔥⚡

👉 ${questionUrl}

Se o seu apelido ainda não está no Mural acima, atenção porque às *23h59* o sistema vira:

🔥 *Está no seu recorde atual?* Garanta sua questão agora para somar *+1 dia* e não zerar!
⚡ *Já deixou sua chama apagar em algum momento?* Últimas horas do *Dia do Resgate* para acertar a questão de hoje e recuperar toda a sua *maior ofensiva histórica + 1 dia*!

👉 *Resolva em 3 minutinhos antes da meia-noite:*
${questionUrl}

👇 Quem vai fechar o dia com a chama acesa? Manda um 🔥!`
    : `🌙 *TURMA DA NOITE: AINDA DÁ TEMPO!*

Se seu apelido ainda não está na lista acima, faça a sua questão já!

⚠️ *PRAZO: ATÉ A MEIA-NOITE (23h59)*
Às 23h59 o sistema vira e quem não respondeu *ZERA A OFENSIVA*. Responda agora para somar *+1 dia de ofensiva 🔥* e garantir seu nome no Mural de hoje!

👉 *RESOLVA AGORA (3 a 5 min):*
${questionUrl}

👇 Quem ainda vai salvar a chama antes da meia-noite? Manda um 🔥!`;

  // Mensagem de Convite da Turma (Dividida em 2 partes para encaminhamento fácil)
  const messageInviteA = `Turma, várias pessoas me pediram no privado o link do nosso grupo para mandar para amigos que também vão fazer o ENEM. Vou deixar a mensagem aqui embaixo pronta: quem quiser ajudar amigos a treinar Matemática todo dia, é só encaminhar a mensagem abaixo pra eles ou pro seu grupo de estudos! 👇`;

  const messageInviteB = `Tô participando desse grupo de Matemática pro ENEM e tá valendo muito a pena. Todo dia a gente resolve 1 questão que tem alto peso no TRI, com dicas passo a passo se precisar.

Link para entrar:
https://tinyurl.com/enem-questoes-diarias`;

  return { message1, message2, messageLunch, message3A, message3B, messageInviteA, messageInviteB };
}
