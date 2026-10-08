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
export const STREAK_DAYS_PER_SHIELD = 7;

export interface StreakShieldCalculationResult {
  newStreak: number;
  newShields: number;
  shieldWasUsed: boolean;
  shieldsUsed?: number;
  earnedNewShield: boolean;
  usedInCycle?: number;
}

/**
 * Calcula a ofensiva (streak) e o gerenciamento de Protetores de Chama (Shields)
 * com base nos ciclos diários acionados pelo professor.
 * Permite que 2 protetores cubram 2 faltas consecutivas de forma justa e transparente.
 */
export function calculateNewStreakWithShield(
  lastCompletedCycle: number | undefined | null,
  currentStreak: number,
  currentCycleNumber: number,
  currentShields: number = 0,
  newTotal?: number
): StreakShieldCalculationResult {
  const safeCurrentStreak = Math.max(0, currentStreak || 0);
  let safeShields = Math.max(0, Math.min(MAX_STREAK_SHIELDS, currentShields || 0));

  // Helper para verificar se ganha escudo de onboarding na 2ª questão completada
  const checkEarnedOnSecondQuestion = (earnedSoFar: boolean): { shields: number; earned: boolean } => {
    if (newTotal === 2 && safeShields < MAX_STREAK_SHIELDS && !earnedSoFar) {
      return { shields: safeShields + 1, earned: true };
    }
    return { shields: safeShields, earned: earnedSoFar };
  };

  // 1. Aluno sem histórico ou iniciando agora
  if (lastCompletedCycle === undefined || lastCompletedCycle === null || lastCompletedCycle <= 0) {
    const secondQ = checkEarnedOnSecondQuestion(false);
    return {
      newStreak: 1,
      newShields: secondQ.shields,
      shieldWasUsed: false,
      shieldsUsed: 0,
      earnedNewShield: secondQ.earned,
    };
  }

  // 2. Se já concluiu este mesmo ciclo anteriormente, mantém a ofensiva e escudos
  if (lastCompletedCycle === currentCycleNumber) {
    return {
      newStreak: Math.max(1, safeCurrentStreak),
      newShields: safeShields,
      shieldWasUsed: false,
      shieldsUsed: 0,
      earnedNewShield: false,
    };
  }

  // 3. Concluiu exatamente o ciclo imediatamente anterior (consecutivo, sem falta)
  if (lastCompletedCycle === currentCycleNumber - 1) {
    const nextStreak = Math.max(1, safeCurrentStreak) + 1;
    let earnedNewShield = false;
    // Concede +1 escudo a cada 7 dias de ofensiva ininterrupta (7, 14, 21...), até o teto de 2
    if (nextStreak % STREAK_DAYS_PER_SHIELD === 0 && safeShields < MAX_STREAK_SHIELDS) {
      safeShields += 1;
      earnedNewShield = true;
    }
    // Concede +1 escudo na 2ª questão completada na história (onboarding), até o teto de 2
    if (newTotal === 2 && safeShields < MAX_STREAK_SHIELDS && !earnedNewShield) {
      safeShields += 1;
      earnedNewShield = true;
    }
    return {
      newStreak: nextStreak,
      newShields: safeShields,
      shieldWasUsed: false,
      shieldsUsed: 0,
      earnedNewShield,
    };
  }

  // 4. Pulou ciclos. Quantos ciclos foram perdidos?
  const missedCycles = currentCycleNumber - 1 - lastCompletedCycle;

  // Se faltou 1 ou mais ciclos e tem protetores suficientes para cobrir TODAS as faltas consecutivas:
  // Ex: faltou 1 dia e tem >= 1 protetor -> consome 1 protetor e salva a ofensiva.
  // Ex: faltou 2 dias seguidos e tem 2 protetores -> consome os 2 protetores e salva a ofensiva!
  if (missedCycles > 0 && safeShields >= missedCycles) {
    const shieldsUsed = missedCycles;
    const consumedShields = safeShields - shieldsUsed;
    const nextStreak = Math.max(1, safeCurrentStreak) + 1;
    let earnedNewShield = false;

    // Se ao salvar atingiu múltiplo de 7, recarrega se o teto permitir
    if (nextStreak % STREAK_DAYS_PER_SHIELD === 0 && consumedShields < MAX_STREAK_SHIELDS) {
      let finalShields = consumedShields + 1;
      let earned = true;
      if (newTotal === 2 && finalShields < MAX_STREAK_SHIELDS) {
        finalShields += 1;
      }
      return {
        newStreak: nextStreak,
        newShields: finalShields,
        shieldWasUsed: true,
        shieldsUsed,
        earnedNewShield: earned,
        usedInCycle: currentCycleNumber - 1,
      };
    }

    let finalShields = consumedShields;
    if (newTotal === 2 && finalShields < MAX_STREAK_SHIELDS) {
      finalShields += 1;
      earnedNewShield = true;
    }

    return {
      newStreak: nextStreak,
      newShields: finalShields,
      shieldWasUsed: true,
      shieldsUsed,
      earnedNewShield,
      usedInCycle: currentCycleNumber - 1,
    };
  }

  // 5. Sem protetores suficientes (ex: 0 protetores, ou faltou mais ciclos do que escudos disponíveis)
  // -> ofensiva reinicia em 1
  const secondQ = checkEarnedOnSecondQuestion(false);
  return {
    newStreak: 1,
    newShields: secondQ.shields,
    shieldWasUsed: false,
    shieldsUsed: 0,
    earnedNewShield: secondQ.earned,
  };
}

/**
 * Calcula a ofensiva (streak) com base nos ciclos diários acionados pelo professor
 */
export function calculateNewStreakByCycle(
  lastCompletedCycle: number | undefined,
  currentStreak: number,
  currentCycleNumber: number,
  currentShields: number = 0,
  newTotal?: number
): number {
  return calculateNewStreakWithShield(
    lastCompletedCycle,
    currentStreak,
    currentCycleNumber,
    currentShields,
    newTotal
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
 * Gera as mensagens oficiais de WhatsApp com base no ciclo diário
 */
export function generateWhatsAppMessages({
  yesterdayList,
  todayList,
  questionUrl,
  topicTitle = 'Geometria Plana — Áreas e Perímetros (ENEM)',
  cycleNumber = 1,
}: {
  yesterdayList: Array<{
    nickname: string;
    streakDays: number;
    totalSolved?: number;
    unlockedMilestone?: number;
  }>;
  todayList: Array<{
    nickname: string;
    streakDays: number;
    totalSolved?: number;
    unlockedMilestone?: number;
  }>;
  questionUrl: string;
  topicTitle?: string;
  cycleNumber?: number;
}) {
  const countYesterday = yesterdayList.length;

  // Segmentação estrita sem duplicação para a Mensagem 1
  // 1. Quem bateu meta ontem
  const metaBatidaItems = yesterdayList.filter((item) => Boolean(item.unlockedMilestone));
  const metaBatidaNames = new Set(metaBatidaItems.map((i) => i.nickname.toLowerCase()));

  // 2. Quem garantiu a 1ª questão ontem (totalSolved === 1 ou streakDays === 1 sem marco batido)
  const primeiraItems = yesterdayList.filter((item) => {
    if (metaBatidaNames.has(item.nickname.toLowerCase())) return false;
    const total = item.totalSolved ?? item.streakDays;
    return total === 1;
  });
  const primeiraNames = new Set(primeiraItems.map((i) => i.nickname.toLowerCase()));

  // 3. Quem está "Na cara do gol" (falta exatamente 1 questão para bater a meta)
  const naCaraDoGolItems = yesterdayList.filter((item) => {
    const nickLower = item.nickname.toLowerCase();
    if (metaBatidaNames.has(nickLower) || primeiraNames.has(nickLower)) return false;
    const total = item.totalSolved ?? item.streakDays ?? 1;
    const target = MILESTONES.find((m) => m > total) || (Math.floor(total / 5) + 1) * 5;
    return target - total === 1;
  });
  const naCaraDoGolNames = new Set(naCaraDoGolItems.map((i) => i.nickname.toLowerCase()));

  // 4. Os demais mantiveram a ofensiva acesa
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

  // Montagem dos blocos da Mensagem 1
  const message1Blocks: string[] = [];

  // Seção 1: Metas Batidas Ontem
  const metaBatidaSorted = sortAlphabetically(metaBatidaItems);
  if (metaBatidaSorted.length > 0) {
    const metaLines = metaBatidaSorted
      .map((i) => `• *${i.nickname}* (Meta de ${i.unlockedMilestone} 🏆)`)
      .join('\n');

    message1Blocks.push(`🎯 *METAS BATIDAS ONTEM:*\n${metaLines}`);
  }

  // Seção 2: Garantiram a 1ª Questão Ontem
  const primeiraSorted = sortAlphabetically(primeiraItems);
  if (primeiraSorted.length > 0) {
    const primeiraLines = primeiraSorted
      .map((i) => `• *${i.nickname}* (🔥 1º dia)`)
      .join('\n');
    message1Blocks.push(
      `🔥 *GARANTIRAM A 1ª QUESTÃO ONTEM:*\n${primeiraLines}\n\nA primeira já foi! Hoje tem a 2ª para manter o ritmo firme 💪`
    );
  }

  // Seção 3: Na Cara do Gol
  const naCaraDoGolSorted = sortAlphabetically(naCaraDoGolItems);
  if (naCaraDoGolSorted.length > 0) {
    const naCaraDoGolLines = naCaraDoGolSorted
      .map((i) => {
        const total = i.totalSolved ?? i.streakDays ?? 1;
        const target = MILESTONES.find((m) => m > total) || (Math.floor(total / 5) + 1) * 5;
        return `• *${i.nickname}* (Meta de ${target} 🎯)`;
      })
      .join('\n');

    message1Blocks.push(
      `⏳ *NA CARA DO GOL (Falta só 1 para a meta):*\n${naCaraDoGolLines}\n\nA questão de hoje carimba a meta de vocês! 👀`
    );
  }

  // Seção 4: Mantiveram a Ofensiva Acesa (ou lista completa se ninguém caiu nas categorias acima)
  const itensParaOfensiva =
    mantiveramOfensivaItems.length > 0
      ? mantiveramOfensivaItems
      : message1Blocks.length === 0
      ? yesterdayList
      : [];

  const ofensivaSorted = sortAlphabetically(itensParaOfensiva);

  if (ofensivaSorted.length > 0) {
    const ofensivaLines = ofensivaSorted
      .map((item) => `• *${item.nickname}* (🔥 ${item.streakDays} ${
        item.streakDays === 1 ? 'dia' : 'dias'
      })`)
      .join('\n');

    message1Blocks.push(`⚡ *MANTIVERAM A OFENSIVA ACESA:*\n${ofensivaLines}`);
  } else if (countYesterday === 0) {
    message1Blocks.push('• *Turma Yes Matemática* (🔥 1 dia)');
  }

  const message1 = `⚔️ *BOM DIA! MURAL DE ONTEM* 🎯

*${countYesterday} ${
    countYesterday === 1 ? 'mente focada manteve' : 'mentes focadas mantiveram'
  } o ritmo firme* e fecharam o dia com a presença garantida! 🎯

${message1Blocks.join('\n\n')}

👏 Parabéns a quem manteve o ritmo firme!
Viu seu apelido na lista? Deixa um 👍 aqui!`;

  // Mensagem 2 - Questão do Dia
  const message2 = `🚀 *QUESTÃO DO DIA LIBERADA!*

📌 ENEM — Matemática (com dicas guiadas se travar)

⚠️ *REGRA DO FOGO:*
• *Quem já tá no jogo:* responda hoje para somar *+1 dia de ofensiva 🔥*. Se pular o dia, *ZERA TUDO!*
• *Quem tá chegando agora:* faça hoje para estrear sua chama de *🔥 1 dia*.

Quem vai ser a 1ª pessoa a inaugurar o Mural de hoje? 👀

🔗 *FAÇA AGORA (3 a 5 min):*
👉 ${questionUrl}

👇 Vai manter sua chama acesa? Manda um 🔥!`;

  // Mensagem 3 - Noite
  const countToday = todayList.length;
  let muralLinesToday = '';
  if (countToday === 0) {
    muralLinesToday = '01. *O próximo pode ser você!*';
  } else {
    muralLinesToday = todayList
      .map((item, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        return `${num}. *${item.nickname}* (🔥 ${item.streakDays} ${
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
  const message3B = `🌙 *TURMA DA NOITE: AINDA DÁ TEMPO!*

Se seu apelido ainda não está na lista acima, faça a sua questão já!

⚠️ *PRAZO: ATÉ A MEIA-NOITE (23h59)*
Às 23h59 o sistema vira e quem não respondeu *ZERA A OFENSIVA*. Responda agora para somar *+1 dia de ofensiva 🔥* e garantir seu nome no Mural de hoje!

👉 *RESOLVA AGORA (3 a 5 min):*
${questionUrl}

👇 Quem ainda vai salvar a chama antes da meia-noite? Manda um 🔥!`;

  return { message1, message2, message3A, message3B };
}
