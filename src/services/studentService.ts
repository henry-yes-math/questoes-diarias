import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  orderBy,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentProfile, DailySubmission, DailyCycleConfig } from '../types';
import {
  getLocalDateString,
  calculateNewStreakByCycle,
  calculateMilestone,
} from '../utils/gamification';

const STUDENTS_COLLECTION = 'students';
const SUBMISSIONS_COLLECTION = 'daily_submissions';
const APP_SETTINGS_COLLECTION = 'app_settings';
const DAILY_CYCLE_DOC_ID = 'daily_cycle';

const LOCAL_STUDENT_ID_KEY = 'yesmatematica_student_id';
const LOCAL_STUDENT_NICK_KEY = 'yesmatematica_student_nick';

/**
 * Obtém ou inicializa a configuração do Ciclo Diário atual
 */
export async function getOrCreateDailyCycle(): Promise<DailyCycleConfig> {
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  const snap = await getDoc(cycleRef);

  if (snap.exists()) {
    return snap.data() as DailyCycleConfig;
  }

  const todayStr = getLocalDateString();
  const initialCycle: DailyCycleConfig = {
    currentCycleNumber: 1,
    currentCycleDate: todayStr,
    startedAt: new Date().toISOString(),
  };

  try {
    await setDoc(cycleRef, initialCycle);
  } catch (err) {
    console.warn('Erro ao salvar ciclo inicial no Firestore:', err);
  }

  return initialCycle;
}

/**
 * Escuta em tempo real o ciclo diário ativo
 */
export function subscribeToDailyCycle(
  callback: (cycle: DailyCycleConfig) => void
) {
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  return onSnapshot(
    cycleRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as DailyCycleConfig);
      } else {
        const fallbackCycle: DailyCycleConfig = {
          currentCycleNumber: 1,
          currentCycleDate: getLocalDateString(),
          startedAt: new Date().toISOString(),
        };
        callback(fallbackCycle);
      }
    },
    (err) => {
      console.warn('Erro ao escutar ciclo diário:', err);
    }
  );
}

/**
 * Avança o ciclo para o próximo dia (ação exclusiva do professor)
 */
export async function advanceToNextCycle(questionId?: string): Promise<DailyCycleConfig> {
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  const todayStr = getLocalDateString();

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(cycleRef);
    let nextNumber = 1;
    if (snap.exists()) {
      const data = snap.data() as DailyCycleConfig;
      nextNumber = (data.currentCycleNumber || 0) + 1;
    }

    const newCycle: DailyCycleConfig = {
      currentCycleNumber: nextNumber,
      currentCycleDate: todayStr,
      startedAt: new Date().toISOString(),
      ...(questionId ? { questionId } : {}),
    };

    transaction.set(cycleRef, newCycle);
    return newCycle;
  });
}

/**
 * Obtém ou gera um ID único persistente para o dispositivo do aluno
 */
export function getLocalStudentId(): string {
  let id = localStorage.getItem(LOCAL_STUDENT_ID_KEY);
  if (!id) {
    id = 'std_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem(LOCAL_STUDENT_ID_KEY, id);
  }
  return id;
}

export function getLocalStudentNick(): string {
  return localStorage.getItem(LOCAL_STUDENT_NICK_KEY) || '';
}

export function setLocalStudentNick(nick: string): void {
  localStorage.setItem(LOCAL_STUDENT_NICK_KEY, nick);
}

/**
 * Busca ou inicializa o perfil do aluno no Firestore
 */
export async function getOrCreateStudentProfile(
  studentId: string,
  nickname: string
): Promise<StudentProfile> {
  const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
  const snap = await getDoc(studentRef);

  if (snap.exists()) {
    const data = snap.data() as StudentProfile;
    // Se o nickname mudou, atualiza
    if (nickname && data.nickname !== nickname) {
      await updateDoc(studentRef, {
        nickname,
        updatedAt: new Date().toISOString(),
      });
      data.nickname = nickname;
    }
    return data;
  }

  const newProfile: StudentProfile = {
    studentId,
    nickname,
    totalSolved: 0,
    streakDays: 0,
    lastSolvedDate: null,
    lastCompletedCycle: 0,
    unlockedMilestones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(studentRef, newProfile);
  return newProfile;
}

/**
 * Registra a resolução diária de uma questão pelo aluno vinculada ao ciclo atual
 */
export async function registerDailySubmission(
  studentId: string,
  nickname: string,
  questionId: string,
  cycleNumber?: number
): Promise<{
  submission: DailySubmission;
  profile: StudentProfile;
  milestoneUnlocked?: number;
  isFirstQuestion: boolean;
}> {
  // Se não passar cicloNumber, obtém o ciclo ativo
  const activeCycle = cycleNumber || (await getOrCreateDailyCycle()).currentCycleNumber;
  const todayStr = getLocalDateString();
  
  // O ID do documento é único por ciclo e aluno
  const submissionDocId = `cycle_${activeCycle}_${studentId}`;
  const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionDocId);
  const studentRef = doc(db, STUDENTS_COLLECTION, studentId);

  return await runTransaction(db, async (transaction) => {
    const studentSnap = await transaction.get(studentRef);
    const existingSubmissionSnap = await transaction.get(submissionRef);

    let profile: StudentProfile;
    if (studentSnap.exists()) {
      profile = studentSnap.data() as StudentProfile;
    } else {
      profile = {
        studentId,
        nickname,
        totalSolved: 0,
        streakDays: 0,
        lastSolvedDate: null,
        lastCompletedCycle: 0,
        unlockedMilestones: [],
      };
    }

    // Se já respondeu a questão deste ciclo
    if (existingSubmissionSnap.exists()) {
      const existingSubmission = existingSubmissionSnap.data() as DailySubmission;
      return {
        submission: existingSubmission,
        profile,
        milestoneUnlocked: existingSubmission.unlockedMilestone,
        isFirstQuestion: profile.totalSolved === 1,
      };
    }

    // Contar quantas submissões já existem neste ciclo para determinar o orderIndex (ex: #1, #2...)
    const qCycle = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('cycleNumber', '==', activeCycle)
    );
    const cycleSnaps = await getDocs(qCycle);
    const orderIndex = cycleSnaps.size + 1;

    // Calcular novo total e streak baseado no ciclo
    const previousTotal = profile.totalSolved || 0;
    const newTotal = previousTotal + 1;
    const newStreak = calculateNewStreakByCycle(
      profile.lastCompletedCycle,
      profile.streakDays || 0,
      activeCycle
    );

    const milestoneCalc = calculateMilestone(newTotal, previousTotal);
    const milestoneUnlocked = milestoneCalc.isMilestoneJustUnlocked
      ? milestoneCalc.unlockedTarget
      : undefined;

    const newMilestones = [...(profile.unlockedMilestones || [])];
    if (milestoneUnlocked && !newMilestones.includes(milestoneUnlocked)) {
      newMilestones.push(milestoneUnlocked);
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      nickname,
      totalSolved: newTotal,
      streakDays: newStreak,
      lastSolvedDate: todayStr,
      lastCompletedCycle: activeCycle,
      unlockedMilestones: newMilestones,
      updatedAt: new Date().toISOString(),
    };

    const submissionData: Record<string, any> = {
      id: submissionDocId,
      studentId,
      nickname,
      date: todayStr,
      cycleNumber: activeCycle,
      questionId,
      streakDays: newStreak,
      orderIndex,
      completedAt: new Date().toISOString(),
      serverTime: serverTimestamp(),
    };

    if (milestoneUnlocked !== undefined) {
      submissionData.unlockedMilestone = milestoneUnlocked;
    }

    const newSubmission: DailySubmission = {
      id: submissionDocId,
      studentId,
      nickname,
      date: todayStr,
      cycleNumber: activeCycle,
      questionId,
      streakDays: newStreak,
      orderIndex,
      completedAt: new Date().toISOString(),
      ...(milestoneUnlocked !== undefined ? { unlockedMilestone: milestoneUnlocked } : {}),
    };

    transaction.set(studentRef, updatedProfile);
    transaction.set(submissionRef, submissionData);

    return {
      submission: newSubmission,
      profile: updatedProfile,
      milestoneUnlocked,
      isFirstQuestion: newTotal === 1,
    };
  });
}

/**
 * Escuta em tempo real todas as submissões do ciclo atual
 */
export function subscribeToCurrentCycleSubmissions(
  cycleNumber: number,
  callback: (submissions: DailySubmission[]) => void
) {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('cycleNumber', '==', cycleNumber)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DailySubmission[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DailySubmission);
      });
      // Ordena por ordem de chegada (orderIndex)
      list.sort((a, b) => a.orderIndex - b.orderIndex);
      callback(list);
    },
    (error) => {
      console.warn('Erro ao escutar submissões do ciclo atual:', error);
      callback([]);
    }
  );
}

/**
 * Mantém compatibilidade com a assinatura anterior para queries por data
 */
export function subscribeToTodaySubmissions(
  callback: (submissions: DailySubmission[]) => void
) {
  const todayStr = getLocalDateString();
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('date', '==', todayStr)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DailySubmission[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as DailySubmission);
      });
      list.sort((a, b) => a.orderIndex - b.orderIndex);
      callback(list);
    },
    (error) => {
      console.warn('Erro ao escutar submissões de hoje:', error);
      callback([]);
    }
  );
}

/**
 * Busca as submissões de um ciclo específico
 */
export async function getSubmissionsByCycle(
  cycleNumber: number
): Promise<DailySubmission[]> {
  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('cycleNumber', '==', cycleNumber)
    );
    const snap = await getDocs(q);
    const list: DailySubmission[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as DailySubmission);
    });
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    return list;
  } catch (err) {
    console.warn('Erro ao buscar submissões por ciclo:', err);
    return [];
  }
}

/**
 * Busca as submissões de uma data específica (ex: ontem)
 */
export async function getSubmissionsByDate(
  dateStr: string
): Promise<DailySubmission[]> {
  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('date', '==', dateStr)
    );
    const snap = await getDocs(q);
    const list: DailySubmission[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as DailySubmission);
    });
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    return list;
  } catch (err) {
    console.warn('Erro ao buscar submissões por data:', err);
    return [];
  }
}
