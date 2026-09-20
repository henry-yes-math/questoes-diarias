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

  // Base do cálculo percentual para o marco vigente
  let prevTarget = 0;
  const currentIdx = MILESTONES.findIndex((m) => m === target);
  if (currentIdx > 0) {
    prevTarget = MILESTONES[currentIdx - 1];
  }

  const range = target - prevTarget;
  const progressInRange = Math.max(0, currentTotal - prevTarget);
  const progressPercentage = Math.min(
    100,
    Math.round((progressInRange / (range || 1)) * 100)
  );

  const remaining = Math.max(0, target - currentTotal);

  let celebrationMessage: string | undefined;
  if (isMilestoneJustUnlocked && unlockedTarget) {
    if (unlockedTarget === 3) {
      celebrationMessage =
        'Você começou com o pé direito e está construindo um hábito forte!';
    } else if (unlockedTarget === 5) {
      celebrationMessage =
        '5 questões concluídas! Seu ritmo de estudos está cada dia mais firme!';
    } else if (unlockedTarget === 7) {
      celebrationMessage =
        'Uma semana inteira invicta! Seu foco e constância são admiráveis!';
    } else if (unlockedTarget === 10) {
      celebrationMessage =
        '10 questões no bolso! Você atingiu a casa das dezenas com maestria!';
    } else if (unlockedTarget === 15) {
      celebrationMessage =
        '15 questões resolvidas! Metade de um mês de evolução sólida na matemática!';
    } else if (unlockedTarget === 20) {
      celebrationMessage =
        '20 questões resolvidas! 4 semanas de evolução e disciplina diária!';
    } else if (unlockedTarget === 25) {
      celebrationMessage =
        '25 questões concluídas! Sua dedicação aos estudos é inspiradora!';
    } else if (unlockedTarget === 30) {
      celebrationMessage =
        '30 questões! Um mês inteiro de matemática no seu dia a dia!';
    } else {
      celebrationMessage = `Incrível! Você superou o marco de ${unlockedTarget} questões!`;
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
  };
}

/**
 * Calcula a ofensiva (streak) com base nos ciclos diários acionados pelo professor
 */
export function calculateNewStreakByCycle(
  lastCompletedCycle: number | undefined,
  currentStreak: number,
  currentCycleNumber: number
): number {
  if (lastCompletedCycle === undefined || lastCompletedCycle === null || lastCompletedCycle <= 0) {
    return 1;
  }

  // Se já concluiu este mesmo ciclo anteriormente, mantém a ofensiva
  if (lastCompletedCycle === currentCycleNumber) {
    return Math.max(1, currentStreak);
  }

  // Se concluiu exatamente o ciclo imediatamente anterior, avança a sequência
  if (lastCompletedCycle === currentCycleNumber - 1) {
    return Math.max(1, currentStreak) + 1;
  }

  // Se pulou um ou mais ciclos inteiros, recomeça em 1
  return 1;
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
  yesterdayList: Array<{ nickname: string; streakDays: number; unlockedMilestone?: number }>;
  todayList: Array<{ nickname: string; streakDays: number; unlockedMilestone?: number }>;
  questionUrl: string;
  topicTitle?: string;
  cycleNumber?: number;
}) {
  const previousCycleNum = Math.max(1, cycleNumber - 1);

  // Mensagem 1 - Mural da Edição Anterior
  const countYesterday = yesterdayList.length;
  let muralLinesYesterday = '';
  if (countYesterday === 0) {
    muralLinesYesterday = '01. Turma Yes Matemática (🔥 1 dia)';
  } else {
    muralLinesYesterday = yesterdayList
      .map((item, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const badge = item.unlockedMilestone
          ? ` 🎖️ Marco de ${item.unlockedMilestone} Questões!`
          : '';
        return `${num}. ${item.nickname} (🔥 ${item.streakDays} ${item.streakDays === 1 ? 'dia' : 'dias'})${badge}`;
      })
      .join('\n');
  }

  const message1 = `⚔️ BOM DIA! MURAL DA TURMA — DIA #${previousCycleNum} 🎯

${countYesterday} ${countYesterday === 1 ? 'aluno manteve' : 'alunos mantiveram'} o ritmo firme e garantiram a presença no mural anterior! 🎯

📋 MURAL OFICIAL CONSOLIDADO:
${muralLinesYesterday}

👏 Parabéns a todos que mantiveram o ritmo firme!
Viu seu apelido na lista? Deixa um 👍 aqui!`;

  // Mensagem 2 - Questão do Dia
  const message2 = `🚀 QUESTÃO DO DIA #${cycleNumber} LIBERADA!
Tema: ${topicTitle}.

🎯 Padrão Clássico do ENEM: Questão de alto peso na TRI. Travou? O app tem dicas passo a passo.

Quem vai ser o #1 a fazer a questão de hoje? 👀

🔗 FAÇA AGORA (3 a 5 min):
👉 ${questionUrl}

💡 Novo na turma? A Ofensiva (🔥) é a sua sequência de dias seguidos resolvendo a questão. Faça a de hoje para acender seu primeiro 🔥 1 dia!

👇 Vai fazer a de hoje? Deixa um 👍 para firmar o compromisso!`;

  // Mensagem 3 - Noite
  const countToday = todayList.length;
  let muralLinesToday = '';
  if (countToday === 0) {
    muralLinesToday = '01. O próximo pode ser você!';
  } else {
    muralLinesToday = todayList
      .map((item, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        return `${num}. ${item.nickname} (🔥 ${item.streakDays} ${item.streakDays === 1 ? 'dia' : 'dias'})`;
      })
      .join('\n');
  }

  const message3 = `🚨 PRÉVIA DA CHAMADA — QUESTÃO DO DIA #${cycleNumber}! 🚨

Já passamos da metade do dia e ${countToday} guerreiros já garantiram a presença no mural de hoje! 🎯

🔥 QUEM JÁ FEZ A QUESTÃO DO DIA #${cycleNumber}:
${muralLinesToday}

🌙 TURMA DA NOITE: AINDA DÁ TEMPO!
Se você estuda agora e seu apelido ainda não está aqui, não vá dormir sem fazer a sua!

Mantenha sua ofensiva ativa e garanta sua presença no Mural oficial com a gente! ⏰

👉 RESOLVA AGORA (3 a 5 min):
${questionUrl}

Quem vai fechar a lista antes da virada do novo dia? 👀`;

  return { message1, message2, message3 };
}
