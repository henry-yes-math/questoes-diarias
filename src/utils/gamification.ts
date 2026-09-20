import { MilestoneInfo } from '../types';

export const MILESTONES = [3, 7, 15, 30, 50, 100];

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
  let nextMilestone = MILESTONES.find((m) => m > currentTotal) || currentTotal + 10;
  let target = nextMilestone;

  // Verifica se acabou de desbloquear um marco
  const justUnlocked = MILESTONES.find(
    (m) => previousTotal < m && currentTotal >= m
  );

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
        : unlockedTarget + 10;
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
    } else if (unlockedTarget === 7) {
      celebrationMessage =
        'Uma semana inteira invicta! Seu foco e constância são admiráveis!';
    } else if (unlockedTarget === 15) {
      celebrationMessage =
        '15 questões resolvidas! Metade de um mês de evolução sólida na matemática!';
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
 * Calcula a ofensiva (streak) com base na última data resolvida
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
 * Gera as mensagens oficiais de WhatsApp
 */
export function generateWhatsAppMessages({
  yesterdayList,
  todayList,
  questionUrl,
  topicTitle = 'Geometria Plana — Áreas e Perímetros (ENEM)',
}: {
  yesterdayList: Array<{ nickname: string; streakDays: number; unlockedMilestone?: number }>;
  todayList: Array<{ nickname: string; streakDays: number; unlockedMilestone?: number }>;
  questionUrl: string;
  topicTitle?: string;
}) {
  // Mensagem 1 - Mural de Ontem
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

  const message1 = `⚔️ BOM DIA! MURAL DA TURMA DE ONTEM 🎯

${countYesterday} ${countYesterday === 1 ? 'aluno manteve' : 'alunos mantiveram'} o ritmo firme e garantiram a presença de ontem! 🎯

📋 MURAL OFICIAL CONSOLIDADO:
${muralLinesYesterday}

👏 Parabéns a todos que mantiveram o ritmo firme!
Viu seu apelido na lista? Deixa um 👍 aqui!`;

  // Mensagem 2 - Questão do Dia
  const message2 = `🚀 QUESTÃO DO DIA LIBERADA!
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

  const message3 = `🚨 PRÉVIA DA CHAMADA — QUESTÃO DO DIA! 🚨

Já passamos da metade do dia e ${countToday} guerreiros já garantiram a presença de hoje! 🎯

🔥 QUEM JÁ FEZ A QUESTÃO DE HOJE:
${muralLinesToday}

🌙 TURMA DA NOITE: AINDA DÁ TEMPO!
Se você estuda agora e seu apelido ainda não está aqui, não vá dormir sem fazer a sua!

Você tem até as 23h59 para manter sua ofensiva ativa e fechar o Mural de hoje com a gente! ⏰

👉 RESOLVA AGORA (3 a 5 min):
${questionUrl}

Quem vai fechar a lista antes da meia-noite? 👀`;

  return { message1, message2, message3 };
}
