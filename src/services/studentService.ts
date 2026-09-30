import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentProfile, DailySubmission, DailyCycleConfig, QuestionData } from '../types';
import {
  getLocalDateString,
  calculateNewStreakByCycle,
  calculateNewStreakWithShield,
  calculateMilestone,
} from '../utils/gamification';

const STUDENTS_COLLECTION = 'students';
const SUBMISSIONS_COLLECTION = 'daily_submissions';
const APP_SETTINGS_COLLECTION = 'app_settings';
const DAILY_CYCLE_DOC_ID = 'daily_cycle';
const ACTIVE_QUESTION_DOC_ID = 'active_question';

const LOCAL_STUDENT_ID_KEY = 'yesmatematica_student_id';
const LOCAL_STUDENT_NICK_KEY = 'yesmatematica_student_nick';
const LOCAL_PENDING_REFERRAL_KEY = 'yesmatematica_pending_referral';

export interface PendingReferralInfo {
  referrerName: string;
  referrerId?: string;
  storedAt: string;
}

export function getPendingReferral(): PendingReferralInfo | null {
  try {
    const raw = sessionStorage.getItem(LOCAL_PENDING_REFERRAL_KEY) || localStorage.getItem(LOCAL_PENDING_REFERRAL_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setPendingReferral(info: PendingReferralInfo): void {
  try {
    const raw = JSON.stringify(info);
    sessionStorage.setItem(LOCAL_PENDING_REFERRAL_KEY, raw);
    localStorage.setItem(LOCAL_PENDING_REFERRAL_KEY, raw);
  } catch (e) {
    console.warn('Erro ao salvar indicação pendente:', e);
  }
}

export function clearPendingReferral(): void {
  try {
    sessionStorage.removeItem(LOCAL_PENDING_REFERRAL_KEY);
    localStorage.removeItem(LOCAL_PENDING_REFERRAL_KEY);
  } catch {}
}

/**
 * Salva a questão ativa no Firestore para todos os alunos da comunidade
 */
export async function setActiveQuestionInFirestore(
  question: QuestionData
): Promise<void> {
  const docRef = doc(db, APP_SETTINGS_COLLECTION, ACTIVE_QUESTION_DOC_ID);
  await setDoc(docRef, {
    ...question,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Busca a questão ativa do Firestore (uma vez)
 */
export async function getActiveQuestionFromFirestore(): Promise<QuestionData | null> {
  try {
    const docRef = doc(db, APP_SETTINGS_COLLECTION, ACTIVE_QUESTION_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as QuestionData;
    }
  } catch (err) {
    console.warn('Erro ao buscar questão ativa no Firestore:', err);
  }
  return null;
}

/**
 * Escuta em tempo real atualizações da questão ativa no Firestore
 */
export function subscribeToActiveQuestion(
  callback: (question: QuestionData | null) => void
) {
  const docRef = doc(db, APP_SETTINGS_COLLECTION, ACTIVE_QUESTION_DOC_ID);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as QuestionData);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Erro ao escutar questão ativa:', err);
    }
  );
}

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
    let existingWhatsappUrl: string | undefined = undefined;

    if (snap.exists()) {
      const data = snap.data() as DailyCycleConfig;
      nextNumber = (data.currentCycleNumber || 0) + 1;
      existingWhatsappUrl = data.whatsappGroupUrl;
    }

    const newCycle: DailyCycleConfig = {
      currentCycleNumber: nextNumber,
      currentCycleDate: todayStr,
      startedAt: new Date().toISOString(),
      ...(questionId ? { questionId } : {}),
      ...(existingWhatsappUrl ? { whatsappGroupUrl: existingWhatsappUrl } : {}),
    };

    transaction.set(cycleRef, newCycle);
    return newCycle;
  });
}

/**
 * Atualiza o link do grupo da comunidade no WhatsApp (ação do professor)
 */
export async function updateWhatsappGroupUrl(url: string): Promise<void> {
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  const cleanUrl = url.trim();
  await updateDoc(cycleRef, {
    whatsappGroupUrl: cleanUrl,
    updatedAt: new Date().toISOString(),
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

export function setLocalStudentId(id: string): void {
  try {
    localStorage.setItem(LOCAL_STUDENT_ID_KEY, id);
  } catch (e) {
    console.warn('Erro ao salvar local student id:', e);
  }
}

export function getLocalStudentNick(): string {
  return localStorage.getItem(LOCAL_STUDENT_NICK_KEY) || '';
}

export function setLocalStudentNick(nick: string): void {
  try {
    localStorage.setItem(LOCAL_STUDENT_NICK_KEY, nick);
  } catch (e) {
    console.warn('Erro ao salvar local student nick:', e);
  }
}

/**
 * Busca perfil existente no Firestore pelo ID do aluno (busca prioritária direta)
 */
export async function getStudentProfileById(
  studentId: string
): Promise<StudentProfile | null> {
  if (!studentId) return null;
  try {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
    const snap = await getDoc(studentRef);
    if (snap.exists()) {
      return snap.data() as StudentProfile;
    }
  } catch (err) {
    console.warn('Erro ao buscar perfil por ID no Firestore:', err);
  }
  return null;
}

/**
 * Busca se já existe um aluno cadastrado no Firestore com o mesmo apelido
 * Útil para recuperar ofensivas quando o aluno abre em outro navegador ou dispositivo.
 */
export async function findExistingStudentByNickname(
  nickname: string,
  excludeStudentId?: string
): Promise<StudentProfile | null> {
  const clean = nickname.trim();
  if (!clean) return null;

  try {
    const cleanLower = clean.toLowerCase();
    const studentsSnap = await getDocs(collection(db, STUDENTS_COLLECTION));
    const matching: StudentProfile[] = [];

    studentsSnap.forEach((docSnap) => {
      const p = docSnap.data() as StudentProfile;
      if (excludeStudentId && p.studentId === excludeStudentId) {
        return;
      }
      if (p.nickname && p.nickname.trim().toLowerCase() === cleanLower) {
        matching.push(p);
      }
    });

    if (matching.length === 0) return null;

    // Ordena priorizando o perfil com maior histórico e ofensiva ativa
    matching.sort((a, b) => {
      const cycleDiff = (b.lastCompletedCycle || 0) - (a.lastCompletedCycle || 0);
      if (cycleDiff !== 0) return cycleDiff;
      const streakDiff = (b.streakDays || 0) - (a.streakDays || 0);
      if (streakDiff !== 0) return streakDiff;
      return (b.totalSolved || 0) - (a.totalSolved || 0);
    });

    return matching[0];
  } catch (err) {
    console.warn('Erro ao buscar perfil por nickname:', err);
    return null;
  }
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
    streakShields: 0,
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
 * Remove recursivamente ou superficialmente campos undefined para compatibilidade com o Firestore
 */
function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

/**
 * Registra a resolução diária de uma questão pelo aluno vinculada ao ciclo atual.
 * Se o aluno estiver completando sua 1ª questão via convite de um amigo,
 * recompensa o amigo indicador com +1 Protetor Anti-Falta (caso tenha menos de 2).
 */
export async function registerDailySubmission(
  studentId: string,
  nickname: string,
  questionId: string,
  cycleNumber?: number,
  referralContext?: { referrerName?: string; referrerId?: string }
): Promise<{
  submission: DailySubmission;
  profile: StudentProfile;
  milestoneUnlocked?: number;
  isFirstQuestion: boolean;
  shieldWasUsed?: boolean;
  shieldsUsed?: number;
  earnedNewShield?: boolean;
  referrerRewarded?: { friendName: string; referrerNick: string } | null;
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
        shieldWasUsed: false,
        shieldsUsed: 0,
        earnedNewShield: false,
        referrerRewarded: null,
      };
    }

    // Contar quantas submissões já existem neste ciclo para determinar o orderIndex (ex: #1, #2...)
    const qCycle = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('cycleNumber', '==', activeCycle)
    );
    const cycleSnaps = await getDocs(qCycle);
    const orderIndex = cycleSnaps.size + 1;

    // Calcular novo total e streak/protetor baseado no ciclo
    const previousTotal = profile.totalSolved || 0;
    const newTotal = previousTotal + 1;
    const currentShields = profile.streakShields || 0;

    const streakResult = calculateNewStreakWithShield(
      profile.lastCompletedCycle,
      profile.streakDays || 0,
      activeCycle,
      currentShields
    );
    const newStreak = streakResult.newStreak;
    const newShields = streakResult.newShields;

    const milestoneCalc = calculateMilestone(newTotal, previousTotal);
    const milestoneUnlocked = milestoneCalc.isMilestoneJustUnlocked
      ? milestoneCalc.unlockedTarget
      : undefined;

    const newMilestones = [...(profile.unlockedMilestones || [])];
    if (milestoneUnlocked && !newMilestones.includes(milestoneUnlocked)) {
      newMilestones.push(milestoneUnlocked);
    }

    const lastShieldCycleValue = streakResult.shieldWasUsed
      ? (streakResult.usedInCycle || activeCycle - 1)
      : profile.lastShieldUsedCycle;

    // Processamento de indicação (apenas na 1ª questão concluída)
    let refRewardInfo: { friendName: string; referrerNick: string } | null = null;
    let finalReferredByName = profile.referredByStudentName || referralContext?.referrerName;
    let finalReferredById = profile.referredByStudentId || referralContext?.referrerId;

    if (newTotal === 1 && finalReferredByName && !profile.referredByStudentName) {
      // Localiza o perfil do amigo que indicou (por nome ou ID, ignorando auto-indicação)
      try {
        let referrerDocSnap: any = null;
        let referrerRefDoc: any = null;

        if (finalReferredById && finalReferredById !== studentId) {
          referrerRefDoc = doc(db, STUDENTS_COLLECTION, finalReferredById);
          referrerDocSnap = await transaction.get(referrerRefDoc);
        }

        if (!referrerDocSnap?.exists() && finalReferredByName) {
          const cleanRefNick = finalReferredByName.trim().toLowerCase();
          const allStudentsSnap = await getDocs(collection(db, STUDENTS_COLLECTION));
          for (const sDoc of allStudentsSnap.docs) {
            const data = sDoc.data() as StudentProfile;
            if (sDoc.id !== studentId && data.nickname && data.nickname.trim().toLowerCase() === cleanRefNick) {
              referrerRefDoc = doc(db, STUDENTS_COLLECTION, sDoc.id);
              referrerDocSnap = await transaction.get(referrerRefDoc);
              finalReferredById = sDoc.id;
              break;
            }
          }
        }

        if (referrerDocSnap && referrerDocSnap.exists() && referrerRefDoc) {
          const referrerData = referrerDocSnap.data() as StudentProfile;
          const referrerShields = referrerData.streakShields ?? 0;
          // Recompensa com +1 escudo apenas se o amigo tiver menos de 2 escudos
          const nextShields = referrerShields < 2 ? referrerShields + 1 : referrerShields;
          const nextReferralCount = (referrerData.successfulReferralsCount || 0) + 1;

          const updatedReferrerData: Record<string, any> = {
            ...referrerData,
            streakShields: nextShields,
            successfulReferralsCount: nextReferralCount,
            lastReferralReward: {
              friendName: nickname || 'Seu amigo(a)',
              rewardedAt: new Date().toISOString(),
              seen: false,
            },
            updatedAt: new Date().toISOString(),
          };

          transaction.set(referrerRefDoc, cleanFirestoreData(updatedReferrerData));
          refRewardInfo = {
            friendName: nickname,
            referrerNick: referrerData.nickname || finalReferredByName,
          };
        }
      } catch (err) {
        console.warn('Erro ao processar recompensa de indicação:', err);
      }
    }

    const updatedProfile: StudentProfile = {
      ...profile,
      nickname,
      totalSolved: newTotal,
      streakDays: newStreak,
      streakShields: newShields,
      lastSolvedDate: todayStr,
      lastCompletedCycle: activeCycle,
      unlockedMilestones: newMilestones,
      updatedAt: new Date().toISOString(),
      ...(finalReferredByName ? { referredByStudentName: finalReferredByName } : {}),
      ...(finalReferredById ? { referredByStudentId: finalReferredById } : {}),
      ...(lastShieldCycleValue !== undefined ? { lastShieldUsedCycle: lastShieldCycleValue } : {}),
    };
    if (lastShieldCycleValue === undefined) {
      delete updatedProfile.lastShieldUsedCycle;
    }

    const submissionData: Record<string, any> = {
      id: submissionDocId,
      studentId,
      nickname,
      date: todayStr,
      cycleNumber: activeCycle,
      questionId,
      streakDays: newStreak,
      streakShields: newShields,
      orderIndex,
      completedAt: new Date().toISOString(),
      serverTime: serverTimestamp(),
      ...(finalReferredByName ? { referredByStudentName: finalReferredByName } : {}),
      ...(finalReferredById ? { referredByStudentId: finalReferredById } : {}),
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
      streakShields: newShields,
      orderIndex,
      completedAt: new Date().toISOString(),
      ...(milestoneUnlocked !== undefined ? { unlockedMilestone: milestoneUnlocked } : {}),
      ...(finalReferredByName ? { referredByStudentName: finalReferredByName } : {}),
      ...(finalReferredById ? { referredByStudentId: finalReferredById } : {}),
    };

    transaction.set(studentRef, cleanFirestoreData(updatedProfile));
    transaction.set(submissionRef, cleanFirestoreData(submissionData));

    return {
      submission: newSubmission,
      profile: updatedProfile,
      milestoneUnlocked,
      isFirstQuestion: newTotal === 1,
      shieldWasUsed: streakResult.shieldWasUsed,
      shieldsUsed: streakResult.shieldsUsed,
      earnedNewShield: streakResult.earnedNewShield,
      referrerRewarded: refRewardInfo,
    };
  });
}

/**
 * Marca a notificação de escudo ganho por indicação como vista
 */
export async function markReferralRewardSeen(studentId: string): Promise<void> {
  if (!studentId) return;
  try {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
    const snap = await getDoc(studentRef);
    if (snap.exists()) {
      const data = snap.data() as StudentProfile;
      if (data.lastReferralReward && !data.lastReferralReward.seen) {
        await updateDoc(studentRef, {
          'lastReferralReward.seen': true,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('Erro ao marcar recompensa de indicação como vista:', err);
  }
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

/**
 * Reseta os dados de teste (submissões e alunos) e redefine o ciclo diário para o Dia #1
 * Mantém intacta a questão ativa.
 */
export async function resetAllTestDataForLaunch(): Promise<void> {
  // 1. Apagar todas as submissões
  const subsSnap = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
  for (const docSnap of subsSnap.docs) {
    await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, docSnap.id));
  }

  // 2. Apagar perfis de teste de alunos
  const studentsSnap = await getDocs(collection(db, STUDENTS_COLLECTION));
  for (const docSnap of studentsSnap.docs) {
    await deleteDoc(doc(db, STUDENTS_COLLECTION, docSnap.id));
  }

  // 3. Resetar ciclo diário para o Dia #1 Oficial
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  const todayStr = getLocalDateString();
  await setDoc(cycleRef, {
    currentCycleNumber: 1,
    currentCycleDate: todayStr,
    startedAt: new Date().toISOString(),
  });

  // 4. Limpar identificador local do professor/testador para não ficar com ofensiva de teste presa
  try {
    localStorage.removeItem(LOCAL_STUDENT_ID_KEY);
    localStorage.removeItem(LOCAL_STUDENT_NICK_KEY);
  } catch {
    // ignora em ambientes sem window/localStorage
  }
}

