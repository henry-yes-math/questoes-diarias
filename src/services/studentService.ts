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
import { StudentProfile, DailySubmission } from '../types';
import {
  getLocalDateString,
  calculateNewStreak,
  calculateMilestone,
} from '../utils/gamification';

const STUDENTS_COLLECTION = 'students';
const SUBMISSIONS_COLLECTION = 'daily_submissions';
const LOCAL_STUDENT_ID_KEY = 'yesmatematica_student_id';
const LOCAL_STUDENT_NICK_KEY = 'yesmatematica_student_nick';

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
    unlockedMilestones: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(studentRef, newProfile);
  return newProfile;
}

/**
 * Registra a resolução diária de uma questão pelo aluno de forma transacional e atômica
 */
export async function registerDailySubmission(
  studentId: string,
  nickname: string,
  questionId: string
): Promise<{
  submission: DailySubmission;
  profile: StudentProfile;
  milestoneUnlocked?: number;
  isFirstQuestion: boolean;
}> {
  const todayStr = getLocalDateString();
  const submissionDocId = `${todayStr}_${studentId}`;
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
        unlockedMilestones: [],
      };
    }

    // Se já respondeu a questão hoje
    if (existingSubmissionSnap.exists()) {
      const existingSubmission = existingSubmissionSnap.data() as DailySubmission;
      return {
        submission: existingSubmission,
        profile,
        milestoneUnlocked: existingSubmission.unlockedMilestone,
        isFirstQuestion: profile.totalSolved === 1,
      };
    }

    // Contar quantas submissões já existem hoje para determinar o orderIndex (ex: #9)
    // Para simplificar e manter transacional, faremos uma consulta de contagem
    const qToday = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('date', '==', todayStr)
    );
    const todaySnaps = await getDocs(qToday);
    const orderIndex = todaySnaps.size + 1;

    // Calcular novo total e streak
    const previousTotal = profile.totalSolved || 0;
    const newTotal = previousTotal + 1;
    const newStreak = calculateNewStreak(
      profile.lastSolvedDate,
      profile.streakDays || 0,
      todayStr
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
      unlockedMilestones: newMilestones,
      updatedAt: new Date().toISOString(),
    };

    const submissionData: Record<string, any> = {
      id: submissionDocId,
      studentId,
      nickname,
      date: todayStr,
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
 * Escuta em tempo real todas as submissões de hoje
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
      // Ordena por ordem de chegada (orderIndex)
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
