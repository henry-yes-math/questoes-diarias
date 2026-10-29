export interface Alternative {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  value: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface PedagogicalStep {
  id: string;
  type: 'hint' | 'hint-resolution' | 'resolution' | 'info';
  stepNumber?: number;
  title: string;
  subtitle?: string;
  htmlContent: string;
}

export interface QuestionData {
  id?: string | number;
  title: string;
  exam: string;
  discipline: string;
  difficulty?: string;
  enunciadoHtml: string;
  promptHtml?: string;
  alternatives: Alternative[];
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  steps: PedagogicalStep[];
  sourceUrl?: string;
}

// Modelos do Aluno e Gamificação
export interface StudentProfile {
  studentId: string;
  nickname: string;
  nicknameLower?: string;
  totalSolved: number;
  streakDays: number;
  maxStreakDays?: number; // Maior ofensiva consecutiva histórica do aluno (sem ser totalSolved)
  lastSolvedDate: string | null; // Formato YYYY-MM-DD
  lastCompletedCycle?: number; // Número do último ciclo completado
  lastCompletedQuestionId?: string; // ID da última questão completada pelo aluno
  unlockedMilestones: number[];
  streakShields?: number; // Quantidade de protetores de chama acumulados (0 a 2)
  lastShieldUsedCycle?: number; // Último ciclo em que o protetor foi acionado para salvar a ofensiva
  // Campos de Convite e Indicação (Viralidade e Escudos)
  referredByStudentId?: string; // ID do aluno que indicou
  referredByStudentName?: string; // Nome/Apelido do aluno que indicou
  successfulReferralsCount?: number; // Total de amigos que completaram a 1ª questão
  lastReferralReward?: {
    friendName: string;
    rewardedAt: string;
    seen: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface DailyCycleConfig {
  currentCycleNumber: number;
  currentCycleDate: string; // ex: "20/09/2026"
  startedAt: string; // ISO string
  questionId?: string;
  whatsappGroupUrl?: string; // Link direto para a comunidade oficial do WhatsApp
  isRescueDay?: boolean; // Modo Dia do Resgate da Chama ativo neste ciclo
}

export interface DailySubmission {
  id?: string;
  studentId: string;
  nickname: string;
  date: string; // YYYY-MM-DD
  cycleNumber?: number; // Número do ciclo/edição manual
  questionId: string;
  streakDays: number;
  totalSolved?: number; // Total acumulado de questões
  orderIndex: number; // 1 para #1, 2 para #2, etc.
  completedAt: string; // ISO string
  unlockedMilestone?: number; // ex: 3, 7
  streakShields?: number; // Quantidade de escudos ativos no momento
  wasRescued?: boolean; // Se a ofensiva foi resgatada no Dia do Resgate
  previousStreakDays?: number; // Recorde anterior recuperado no resgate
  referredByStudentId?: string; // Vinculo de indicação nesta submissão
  referredByStudentName?: string;
}

export interface RescueCandidateInfo {
  studentId: string;
  nickname: string;
  maxStreakDays: number; // Recorde histórico a ser resgatado (>= 2)
  currentStreakDays: number; // Ofensiva atual no perfil
  totalSolved: number;
  lastCompletedCycle: number;
  hasRescuedToday: boolean;
  newStreakAfterRescue: number; // maxStreakDays + 1
}

export interface MilestoneInfo {
  currentTotal: number;
  target: number;
  isFirstQuestion: boolean;
  isMilestoneJustUnlocked: boolean;
  unlockedTarget?: number;
  nextTarget: number;
  progressPercentage: number;
  remaining: number;
  celebrationMessage?: string;
  nextMilestonePrompt?: string;
}
