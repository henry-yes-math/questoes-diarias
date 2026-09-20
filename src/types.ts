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
  unlockedMilestones: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DailySubmission {
  id?: string;
  studentId: string;
  nickname: string;
  date: string; // YYYY-MM-DD
  questionId: string;
  streakDays: number;
  orderIndex: number; // 1 para #1, 2 para #2, etc.
  completedAt: string; // ISO string
  unlockedMilestone?: number; // ex: 3, 7
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
}
