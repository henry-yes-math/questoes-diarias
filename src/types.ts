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
  totalSolved: number;
  streakDays: number;
  lastSolvedDate: string | null; // Formato YYYY-MM-DD
  lastCompletedCycle?: number; // Número do último ciclo completado
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
  referredByStudentId?: string; // Vinculo de indicação nesta submissão
  referredByStudentName?: string;
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
