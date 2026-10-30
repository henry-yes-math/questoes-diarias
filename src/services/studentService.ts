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
  getCountFromServer,
  orderBy,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  StudentProfile,
  DailySubmission,
  DailyCycleConfig,
  QuestionData,
  RescueCandidateInfo,
} from '../types';
import {
  getLocalDateString,
  calculateNewStreakByCycle,
  calculateNewStreakWithShield,
  calculateMilestone,
} from '../utils/gamification';
import { INITIAL_QUESTION } from '../data/fallbackQuestion';

const STUDENTS_COLLECTION = 'students';
const SUBMISSIONS_COLLECTION = 'daily_submissions';
const APP_SETTINGS_COLLECTION = 'app_settings';
const DAILY_CYCLE_DOC_ID = 'daily_cycle';
const ACTIVE_QUESTION_DOC_ID = 'active_question';

const LOCAL_STUDENT_ID_KEY = 'yesmatematica_student_id';
const LOCAL_STUDENT_NICK_KEY = 'yesmatematica_student_nick';
const LOCAL_PENDING_REFERRAL_KEY = 'yesmatematica_pending_referral';
const LOCAL_CACHED_CYCLE_KEY = 'yesmatematica_cached_cycle_v1';
const LOCAL_CACHED_SUBMISSIONS_PREFIX = 'yesmatematica_cached_subs_cycle_';
const LOCAL_PENDING_SUBMISSION_KEY = 'yesmatematica_pending_submission_v1';

export interface PendingReferralInfo {
  referrerName: string;
  referrerId?: string;
  storedAt: string;
}

export interface PendingSubmissionPayload {
  studentId: string;
  nickname: string;
  questionId: string;
  cycleNumber?: number;
  storedAt: string;
}

export function getPendingSubmission(): PendingSubmissionPayload | null {
  try {
    const raw = localStorage.getItem(LOCAL_PENDING_SUBMISSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingSubmissionPayload;
  } catch {
    return null;
  }
}

export function setPendingSubmission(payload: PendingSubmissionPayload): void {
  try {
    localStorage.setItem(LOCAL_PENDING_SUBMISSION_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Erro ao salvar submissão pendente localmente:', e);
  }
}

export function clearPendingSubmission(): void {
  try {
    localStorage.removeItem(LOCAL_PENDING_SUBMISSION_KEY);
  } catch {}
}

export function getCachedDailyCycle(): DailyCycleConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHED_CYCLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyCycleConfig;
    if (parsed && typeof parsed.currentCycleNumber === 'number' && parsed.currentCycleNumber >= 1) {
      return parsed;
    }
  } catch {}
  return null;
}

export function saveCachedDailyCycle(cycle: DailyCycleConfig): void {
  try {
    localStorage.setItem(LOCAL_CACHED_CYCLE_KEY, JSON.stringify(cycle));
  } catch {}
}

export function getCachedSubmissionsForCycle(cycleNumber: number): DailySubmission[] | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_CACHED_SUBMISSIONS_PREFIX}${cycleNumber}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as DailySubmission[];
  } catch {}
  return null;
}

export function saveCachedSubmissionsForCycle(cycleNumber: number, list: DailySubmission[]): void {
  try {
    localStorage.setItem(`${LOCAL_CACHED_SUBMISSIONS_PREFIX}${cycleNumber}`, JSON.stringify(list));
  } catch {}
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

async function fetchActiveQuestionRest(): Promise<QuestionData | null> {
  if (typeof fetch === 'undefined' || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
    return null;
  }
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/${APP_SETTINGS_COLLECTION}/${ACTIVE_QUESTION_DOC_ID}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const docJson = await res.json();
  const fields = docJson?.fields;
  if (!fields) return null;
  const parsed: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    parsed[k] = parseFirestoreRestValue(v);
  }
  if (parsed && parsed.id && Array.isArray(parsed.alternatives)) {
    return parsed as QuestionData;
  }
  return null;
}

/**
 * Escuta em tempo real atualizações da questão ativa no Firestore.
 * Inclui fallback rápido via REST API (700ms) para carregar instantaneamente no Safari Privado.
 */
export function subscribeToActiveQuestion(
  callback: (question: QuestionData | null) => void
) {
  let hasResolvedOnce = false;
  const docRef = doc(db, APP_SETTINGS_COLLECTION, ACTIVE_QUESTION_DOC_ID);

  const restTimer = setTimeout(() => {
    if (hasResolvedOnce) return;
    fetchActiveQuestionRest()
      .then((restQuestion) => {
        if (!hasResolvedOnce && restQuestion) {
          hasResolvedOnce = true;
          callback(restQuestion);
        }
      })
      .catch(() => {});
  }, 700);

  const unsub = onSnapshot(
    docRef,
    (snap) => {
      hasResolvedOnce = true;
      clearTimeout(restTimer);
      if (snap.exists()) {
        callback(snap.data() as QuestionData);
      } else {
        callback(null);
      }
    },
    (err) => {
      clearTimeout(restTimer);
      console.warn('Erro ao escutar questão ativa:', err);
    }
  );

  return () => {
    clearTimeout(restTimer);
    unsub();
  };
}

/**
 * Obtém ou inicializa a configuração do Ciclo Diário atual
 */
export async function getOrCreateDailyCycle(): Promise<DailyCycleConfig> {
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  const snap = await getDoc(cycleRef);

  if (snap.exists()) {
    const data = snap.data() as DailyCycleConfig;
    saveCachedDailyCycle(data);
    return data;
  }

  const cached = getCachedDailyCycle();
  if (cached) {
    return cached;
  }

  const todayStr = getLocalDateString();
  const initialCycle: DailyCycleConfig = {
    currentCycleNumber: 1,
    currentCycleDate: todayStr,
    startedAt: new Date().toISOString(),
    isRescueDay: false,
  };

  try {
    await setDoc(cycleRef, initialCycle);
    saveCachedDailyCycle(initialCycle);
  } catch (err) {
    console.warn('Erro ao salvar ciclo inicial no Firestore:', err);
  }

  return initialCycle;
}

async function fetchDailyCycleRest(): Promise<DailyCycleConfig | null> {
  if (typeof fetch === 'undefined' || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
    return null;
  }
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/${APP_SETTINGS_COLLECTION}/${DAILY_CYCLE_DOC_ID}?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const docJson = await res.json();
  const fields = docJson?.fields;
  if (!fields) return null;
  const parsed: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    parsed[k] = parseFirestoreRestValue(v);
  }
  if (typeof parsed.currentCycleNumber === 'number' && parsed.currentCycleNumber >= 1) {
    return parsed as DailyCycleConfig;
  }
  return null;
}

/**
 * Escuta em tempo real o ciclo diário ativo (apenas 1 documento leve).
 * Inclui fallback rápido via REST API (700ms) caso o canal onSnapshot do SDK demore em Aba Privada do Safari.
 */
export function subscribeToDailyCycle(
  callback: (cycle: DailyCycleConfig) => void
) {
  let hasResolvedOnce = false;
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);

  const restTimer = setTimeout(() => {
    if (hasResolvedOnce) return;
    fetchDailyCycleRest()
      .then((restCycle) => {
        if (!hasResolvedOnce && restCycle) {
          hasResolvedOnce = true;
          saveCachedDailyCycle(restCycle);
          callback(restCycle);
        }
      })
      .catch(() => {
        if (!hasResolvedOnce) {
          const cached = getCachedDailyCycle();
          if (cached) {
            hasResolvedOnce = true;
            callback(cached);
          }
        }
      });
  }, 700);

  const unsub = onSnapshot(
    cycleRef,
    (snap) => {
      hasResolvedOnce = true;
      clearTimeout(restTimer);
      if (snap.exists()) {
        const data = snap.data() as DailyCycleConfig;
        saveCachedDailyCycle(data);
        callback(data);
      } else {
        const cached = getCachedDailyCycle();
        if (cached) {
          callback(cached);
        }
      }
    },
    (err) => {
      clearTimeout(restTimer);
      console.warn('Erro ao escutar ciclo diário:', err);
      const cached = getCachedDailyCycle();
      if (cached) {
        hasResolvedOnce = true;
        callback(cached);
      }
    }
  );

  return () => {
    clearTimeout(restTimer);
    unsub();
  };
}

/**
 * Avança o ciclo para o próximo dia (ação exclusiva do professor).
 * Define atomicamente desde o segundo zero se o novo ciclo nasce como Dia Normal ou Dia do Resgate.
 */
export async function advanceToNextCycle(
  questionId?: string,
  isRescueDay: boolean = false
): Promise<DailyCycleConfig> {
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  const todayStr = getLocalDateString();

  const updatedCycle = await runTransaction(db, async (transaction) => {
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
      isRescueDay: Boolean(isRescueDay),
      ...(questionId ? { questionId } : {}),
      ...(existingWhatsappUrl ? { whatsappGroupUrl: existingWhatsappUrl } : {}),
    };

    transaction.set(cycleRef, newCycle);
    return newCycle;
  });

  saveCachedDailyCycle(updatedCycle);
  return updatedCycle;
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
      const data = snap.data() as StudentProfile;
      if (data.nickname) {
        const expectedLower = data.nickname.trim().toLowerCase();
        if (data.nicknameLower !== expectedLower) {
          data.nicknameLower = expectedLower;
          updateDoc(studentRef, { nicknameLower: expectedLower }).catch(() => {});
        }
      }
      return data;
    }
  } catch (err) {
    console.warn('Erro ao buscar perfil por ID no Firestore:', err);
  }
  return null;
}

function parseFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values;
    return Array.isArray(values) ? values.map(parseFirestoreRestValue) : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields;
    if (!fields || typeof fields !== 'object') return {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
}

async function queryStudentByNicknameRest(cleanLower: string): Promise<StudentProfile[]> {
  if (typeof fetch === 'undefined' || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
    throw new Error('REST indisponível');
  }
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: STUDENTS_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'nicknameLower' },
            op: 'EQUAL',
            value: { stringValue: cleanLower },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`REST status ${res.status}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  const results: StudentProfile[] = [];
  for (const row of rows) {
    const fields = row?.document?.fields;
    if (!fields) continue;
    const parsed: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      parsed[k] = parseFirestoreRestValue(v);
    }
    if (parsed.studentId) {
      results.push(parsed as StudentProfile);
    }
  }
  return results;
}

/**
 * Busca se já existe um aluno cadastrado no Firestore com o mesmo apelido
 * Útil para recuperar ofensivas quando o aluno abre em outro navegador ou dispositivo.
 * Possui corrida híbrida (SDK + REST API HTTP direta) para nunca travar no Safari em Aba Privada.
 */
export async function findExistingStudentByNickname(
  nickname: string,
  excludeStudentId?: string
): Promise<StudentProfile | null> {
  const clean = nickname.trim();
  if (!clean) return null;

  try {
    const cleanLower = clean.toLowerCase();

    const sdkPromise = (async (): Promise<StudentProfile[]> => {
      const q = query(
        collection(db, STUDENTS_COLLECTION),
        where('nicknameLower', '==', cleanLower)
      );
      const studentsSnap = await getDocs(q);
      const list: StudentProfile[] = [];
      studentsSnap.forEach((docSnap) => {
        list.push(docSnap.data() as StudentProfile);
      });
      return list;
    })();

    // Se o canal WebChannel do SDK não responder em 600ms (comum no Safari Anônimo / iCloud Private Relay),
    // dispara um fetch() REST direto que ignora o WebChannel e responde em ~150ms.
    const restFallbackPromise = new Promise<StudentProfile[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        queryStudentByNicknameRest(cleanLower).then(resolve).catch(reject);
      }, 600);
      sdkPromise.then(() => clearTimeout(timer)).catch(() => {});
    });

    let candidates: StudentProfile[] = [];
    try {
      candidates = await Promise.any([sdkPromise, restFallbackPromise]);
    } catch {
      candidates = [];
    }

    const matching = candidates.filter((p) => {
      if (excludeStudentId && p.studentId === excludeStudentId) {
        return false;
      }
      return (
        (p.nicknameLower && p.nicknameLower === cleanLower) ||
        (p.nickname && p.nickname.trim().toLowerCase() === cleanLower)
      );
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
  nickname: string,
  currentCycleNumber?: number
): Promise<StudentProfile> {
  const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
  const snap = await getDoc(studentRef);
  const cleanLower = nickname.trim().toLowerCase();

  if (snap.exists()) {
    const data = snap.data() as StudentProfile;
    // Se o nickname mudou, atualiza nickname e nicknameLower
    if (nickname && data.nickname !== nickname) {
      await updateDoc(studentRef, {
        nickname,
        nicknameLower: cleanLower,
        updatedAt: new Date().toISOString(),
      });
      data.nickname = nickname;
      data.nicknameLower = cleanLower;

      // Se o aluno já possui submissão registrada no ciclo atual, sincroniza o novo apelido no Mural
      const targetCycle = currentCycleNumber || data.lastCompletedCycle;
      if (targetCycle && targetCycle >= 1) {
        const subRef = doc(db, SUBMISSIONS_COLLECTION, `cycle_${targetCycle}_${studentId}`);
        updateDoc(subRef, { nickname }).catch(() => {});
      }
    } else if (data.nickname && data.nicknameLower !== data.nickname.trim().toLowerCase()) {
      const expectedLower = data.nickname.trim().toLowerCase();
      await updateDoc(studentRef, {
        nicknameLower: expectedLower,
      });
      data.nicknameLower = expectedLower;
    }
    return data;
  }

  const newProfile: StudentProfile = {
    studentId,
    nickname,
    nicknameLower: cleanLower,
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
  referralContext?: { referrerName?: string; referrerId?: string },
  options?: { knownExistingProfile?: StudentProfile | null; isKnownNewStudent?: boolean }
): Promise<{
  submission: DailySubmission;
  profile: StudentProfile;
  milestoneUnlocked?: number;
  isFirstQuestion: boolean;
  shieldWasUsed?: boolean;
  shieldsUsed?: number;
  earnedNewShield?: boolean;
  wasRescued?: boolean;
  previousStreakDays?: number;
  referrerRewarded?: { friendName: string; referrerNick: string } | null;
}> {
  const todayStr = getLocalDateString();
  const cycleRef = doc(db, APP_SETTINGS_COLLECTION, DAILY_CYCLE_DOC_ID);
  const studentRef = doc(db, STUDENTS_COLLECTION, studentId);
  const cachedCycle = getCachedDailyCycle();
  const initialCycleHint = cycleNumber || cachedCycle?.currentCycleNumber || 1;

  // 1. Só executa pré-consulta de submissões antigas se o aluno NÃO for recém-criado
  // e se o perfil conhecido ainda não tiver maxStreakDays sincronizado
  const knownProfile = options?.knownExistingProfile;
  const skipHistoricalScan =
    Boolean(options?.isKnownNewStudent) ||
    Boolean(knownProfile && typeof knownProfile.maxStreakDays === 'number' && knownProfile.maxStreakDays > 0);

  const historicalMaxPromise = (async (): Promise<number> => {
    if (skipHistoricalScan) {
      return Math.max(knownProfile?.maxStreakDays || 0, knownProfile?.streakDays || 0);
    }
    let maxVal = Math.max(knownProfile?.maxStreakDays || 0, knownProfile?.streakDays || 0);
    try {
      const cleanNick = (nickname || '').trim();
      const queries = [
        getDocs(query(collection(db, SUBMISSIONS_COLLECTION), where('studentId', '==', studentId))),
      ];
      if (cleanNick) {
        queries.push(
          getDocs(query(collection(db, SUBMISSIONS_COLLECTION), where('nickname', '==', cleanNick)))
        );
      }
      const snaps = await Promise.all(queries);
      for (const subsSnap of snaps) {
        subsSnap.forEach((d) => {
          const sub = d.data() as DailySubmission;
          if (sub.streakDays && sub.streakDays > maxVal) {
            maxVal = sub.streakDays;
          }
        });
      }
    } catch {
      // Fallback silencioso para o maxStreakDays já gravado no perfil
    }
    return maxVal;
  })();

  // 2. Pré-calcula em paralelo (fora do lock da transação) a contagem de submissões do ciclo com timeout curto
  const precountedOrderPromise = (async (): Promise<{ cycle: number; count: number } | null> => {
    try {
      const qCycle = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('cycleNumber', '==', initialCycleHint)
      );
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      const countSnap = await Promise.race([getCountFromServer(qCycle), timeoutPromise]);
      if (countSnap) {
        return { cycle: initialCycleHint, count: countSnap.data().count };
      }
    } catch {
      // Fallback imediato para o cache local do Mural
    }
    return null;
  })();

  // 3. Se houver indicação (?convite=Nome) sem ID resolvido, resolve o ID via query indexada fora da transação (1 leitura em vez de 330)
  const resolvedReferrerIdPromise = (async (): Promise<string | undefined> => {
    if (referralContext?.referrerId && referralContext.referrerId !== studentId) {
      return referralContext.referrerId;
    }
    const rawRefName = referralContext?.referrerName?.trim();
    if (!rawRefName) return undefined;
    try {
      const foundRef = await findExistingStudentByNickname(rawRefName, studentId);
      if (foundRef && foundRef.studentId && foundRef.studentId !== studentId) {
        return foundRef.studentId;
      }
    } catch {}
    return undefined;
  })();

  const [precomputedHistoricalMax, precountedOrder, preResolvedReferrerId] = await Promise.all([
    historicalMaxPromise,
    precountedOrderPromise,
    resolvedReferrerIdPromise,
  ]);

  const result = await runTransaction(db, async (transaction) => {
    // Lê ciclo, perfil do aluno e eventual submissão do ciclo inicial em paralelo (1 único round-trip)
    const initialSubmissionDocId = `cycle_${initialCycleHint}_${studentId}`;
    const initialSubmissionRef = doc(db, SUBMISSIONS_COLLECTION, initialSubmissionDocId);

    const [cycleSnap, studentSnap, initialSubSnap] = await Promise.all([
      transaction.get(cycleRef),
      transaction.get(studentRef),
      transaction.get(initialSubmissionRef),
    ]);

    let activeCycle = initialCycleHint;
    let isRescueDay = Boolean(cachedCycle?.isRescueDay);

    if (cycleSnap.exists()) {
      const serverCycleData = cycleSnap.data() as DailyCycleConfig;
      if (serverCycleData.currentCycleNumber && serverCycleData.currentCycleNumber >= 1) {
        activeCycle = serverCycleData.currentCycleNumber;
        isRescueDay = Boolean(serverCycleData.isRescueDay);
        saveCachedDailyCycle(serverCycleData);
      }
    }

    const submissionDocId = `cycle_${activeCycle}_${studentId}`;
    const submissionRef =
      activeCycle === initialCycleHint
        ? initialSubmissionRef
        : doc(db, SUBMISSIONS_COLLECTION, submissionDocId);

    const existingSubmissionSnap =
      activeCycle === initialCycleHint
        ? initialSubSnap
        : await transaction.get(submissionRef);

    let profile: StudentProfile;
    if (studentSnap.exists()) {
      profile = studentSnap.data() as StudentProfile;
    } else {
      profile = {
        studentId,
        nickname,
        nicknameLower: nickname.trim().toLowerCase(),
        totalSolved: 0,
        streakDays: 0,
        maxStreakDays: precomputedHistoricalMax,
        lastSolvedDate: null,
        lastCompletedCycle: 0,
        unlockedMilestones: [],
      };
    }

    const effectiveHistoricalMax = Math.max(
      profile.maxStreakDays || 0,
      profile.streakDays || 0,
      precomputedHistoricalMax
    );

    // Se já respondeu a questão deste ciclo
    if (existingSubmissionSnap.exists()) {
      const existingSubmission = existingSubmissionSnap.data() as DailySubmission;
      const isDifferentQuestion =
        existingSubmission.questionId &&
        String(existingSubmission.questionId) !== String(questionId);

      // Garante que o perfil e a submissão reflitam a conclusão da questão atual neste ciclo
      if (
        (profile.lastCompletedCycle || 0) < activeCycle ||
        isDifferentQuestion ||
        profile.lastCompletedQuestionId !== String(questionId)
      ) {
        const finalNick = nickname || profile.nickname;
        const syncedStreak = Math.max(profile.streakDays || 0, existingSubmission.streakDays || 1);
        const syncedProfile: StudentProfile = {
          ...profile,
          nickname: finalNick,
          nicknameLower: finalNick.trim().toLowerCase(),
          totalSolved: Math.max(profile.totalSolved || 0, existingSubmission.totalSolved || 1),
          streakDays: syncedStreak,
          maxStreakDays: Math.max(effectiveHistoricalMax, syncedStreak),
          lastSolvedDate: existingSubmission.date || todayStr,
          lastCompletedCycle: activeCycle,
          lastCompletedQuestionId: String(questionId),
          updatedAt: new Date().toISOString(),
        };
        transaction.set(studentRef, cleanFirestoreData(syncedProfile));
        profile = syncedProfile;
      }

      if (isDifferentQuestion) {
        const updatedExistingSub: DailySubmission = {
          ...existingSubmission,
          questionId: String(questionId),
          completedAt: new Date().toISOString(),
        };
        transaction.set(
          submissionRef,
          cleanFirestoreData({
            ...updatedExistingSub,
            serverTime: serverTimestamp(),
          })
        );
        return {
          submission: updatedExistingSub,
          profile,
          milestoneUnlocked: updatedExistingSub.unlockedMilestone,
          isFirstQuestion: profile.totalSolved === 1,
          shieldWasUsed: false,
          shieldsUsed: 0,
          earnedNewShield: false,
          wasRescued: Boolean(updatedExistingSub.wasRescued),
          previousStreakDays: updatedExistingSub.previousStreakDays,
          referrerRewarded: null,
        };
      }

      return {
        submission: existingSubmission,
        profile,
        milestoneUnlocked: existingSubmission.unlockedMilestone,
        isFirstQuestion: profile.totalSolved === 1,
        shieldWasUsed: false,
        shieldsUsed: 0,
        earnedNewShield: false,
        wasRescued: Boolean(existingSubmission.wasRescued),
        previousStreakDays: existingSubmission.previousStreakDays,
        referrerRewarded: null,
      };
    }

    // Determina o orderIndex usando a contagem prévia em paralelo ou o cache local (sem bloquear a transação)
    let orderIndex = 1;
    if (precountedOrder && precountedOrder.cycle === activeCycle) {
      orderIndex = precountedOrder.count + 1;
    } else {
      const cachedSubs = getCachedSubmissionsForCycle(activeCycle);
      orderIndex = (cachedSubs ? cachedSubs.length : 0) + 1;
    }

    // Calcular novo total e streak/protetor/resgate baseado no ciclo
    const previousTotal = profile.totalSolved || 0;
    const newTotal = previousTotal + 1;
    const currentShields = profile.streakShields || 0;

    const streakResult = calculateNewStreakWithShield(
      profile.lastCompletedCycle,
      profile.streakDays || 0,
      activeCycle,
      currentShields,
      newTotal,
      isRescueDay,
      effectiveHistoricalMax
    );
    const newStreak = streakResult.newStreak;
    const newMaxStreak = streakResult.newMaxStreak;
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
    const finalReferredByName = profile.referredByStudentName || referralContext?.referrerName;
    const finalReferredById = profile.referredByStudentId || preResolvedReferrerId;

    if (newTotal === 1 && finalReferredById && finalReferredById !== studentId && !profile.referredByStudentName) {
      try {
        const referrerRefDoc = doc(db, STUDENTS_COLLECTION, finalReferredById);
        const referrerDocSnap = await transaction.get(referrerRefDoc);

        if (referrerDocSnap.exists()) {
          const referrerData = referrerDocSnap.data() as StudentProfile;
          const referrerShields = referrerData.streakShields ?? 0;
          // Recompensa com +1 escudo apenas se o amigo tiver menos de 2 escudos
          const nextShields = referrerShields < 2 ? referrerShields + 1 : referrerShields;
          const nextReferralCount = (referrerData.successfulReferralsCount || 0) + 1;

          const updatedReferrerData: Record<string, any> = {
            ...referrerData,
            ...(referrerData.nickname ? { nicknameLower: referrerData.nickname.trim().toLowerCase() } : {}),
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
            referrerNick: referrerData.nickname || finalReferredByName || 'Amigo',
          };
        }
      } catch (err) {
        console.warn('Erro ao processar recompensa de indicação:', err);
      }
    }

    const nowIso = new Date().toISOString();
    const finalNickname = nickname || profile.nickname;
    const updatedProfile: StudentProfile = {
      ...profile,
      nickname: finalNickname,
      nicknameLower: finalNickname.trim().toLowerCase(),
      totalSolved: newTotal,
      streakDays: newStreak,
      maxStreakDays: newMaxStreak,
      streakShields: newShields,
      lastSolvedDate: todayStr,
      lastCompletedCycle: activeCycle,
      lastCompletedQuestionId: String(questionId),
      unlockedMilestones: newMilestones,
      createdAt: profile.createdAt || nowIso,
      updatedAt: nowIso,
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
      totalSolved: newTotal,
      streakShields: newShields,
      orderIndex,
      completedAt: new Date().toISOString(),
      serverTime: serverTimestamp(),
      ...(streakResult.wasRescued ? { wasRescued: true } : {}),
      ...(streakResult.previousStreakBeforeRescue !== undefined
        ? { previousStreakDays: streakResult.previousStreakBeforeRescue }
        : {}),
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
      totalSolved: newTotal,
      streakShields: newShields,
      orderIndex,
      completedAt: new Date().toISOString(),
      ...(streakResult.wasRescued ? { wasRescued: true } : {}),
      ...(streakResult.previousStreakBeforeRescue !== undefined
        ? { previousStreakDays: streakResult.previousStreakBeforeRescue }
        : {}),
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
      wasRescued: streakResult.wasRescued,
      previousStreakDays: streakResult.previousStreakBeforeRescue,
      referrerRewarded: refRewardInfo,
    };
  });

  // Limpa qualquer submissão pendente na fila local após confirmação oficial do Firestore
  clearPendingSubmission();
  return result;
}

/**
 * Sincroniza o recorde histórico de ofensiva (maxStreakDays) de um aluno individual
 * a partir de suas submissões no Firestore caso ainda não esteja persistido no perfil.
 */
export async function ensureStudentMaxStreakSynced(
  profile: StudentProfile
): Promise<StudentProfile> {
  if (!profile || !profile.studentId) return profile;

  try {
    const cleanNick = (profile.nickname || '').trim();
    const queries = [
      getDocs(
        query(collection(db, SUBMISSIONS_COLLECTION), where('studentId', '==', profile.studentId))
      ),
    ];

    if (cleanNick) {
      queries.push(
        getDocs(query(collection(db, SUBMISSIONS_COLLECTION), where('nickname', '==', cleanNick)))
      );
    }

    const snaps = await Promise.all(queries);
    let maxFromSubs = 0;
    for (const snap of snaps) {
      snap.forEach((d) => {
        const sub = d.data() as DailySubmission;
        if (sub.streakDays && sub.streakDays > maxFromSubs) {
          maxFromSubs = sub.streakDays;
        }
      });
    }

    const computedMax = Math.max(profile.maxStreakDays || 0, profile.streakDays || 0, maxFromSubs);
    if (profile.maxStreakDays !== computedMax && computedMax > 0) {
      const studentRef = doc(db, STUDENTS_COLLECTION, profile.studentId);
      await updateDoc(studentRef, {
        maxStreakDays: computedMax,
      }).catch(() => {});
      return {
        ...profile,
        maxStreakDays: computedMax,
      };
    }
  } catch (err) {
    console.warn('Erro ao sincronizar maxStreakDays do aluno:', err);
  }

  return profile;
}

/**
 * Calcula a lista oficial de alunos elegíveis ao Dia do Resgate da Chama no ciclo atual,
 * sincronizando `maxStreakDays` nos perfis e identificando quem já resgatou hoje vs. quem ainda pode resgatar.
 */
export async function getRescueCandidatesAndSyncMaxStreaks(
  currentCycleNumber: number
): Promise<{
  candidates: RescueCandidateInfo[];
  studentsMap: Record<string, StudentProfile>;
}> {
  try {
    const [studentsSnap, subsSnap] = await Promise.all([
      getDocs(collection(db, STUDENTS_COLLECTION)),
      getDocs(collection(db, SUBMISSIONS_COLLECTION)),
    ]);

    const studentsMap: Record<string, StudentProfile> = {};
    const allProfiles: StudentProfile[] = [];
    studentsSnap.forEach((d) => {
      const p = d.data() as StudentProfile;
      if (p.studentId) {
        studentsMap[p.studentId] = p;
        allProfiles.push(p);
      }
    });

    const allSubs: DailySubmission[] = [];
    subsSnap.forEach((d) => {
      allSubs.push(d.data() as DailySubmission);
    });

    // Agrupa por apelido normalizado (excluindo conta do professor Henry Prof)
    const groupsByNick = new Map<
      string,
      {
        profiles: StudentProfile[];
        subs: DailySubmission[];
      }
    >();

    const getGroup = (nickLower: string) => {
      let g = groupsByNick.get(nickLower);
      if (!g) {
        g = { profiles: [], subs: [] };
        groupsByNick.set(nickLower, g);
      }
      return g;
    };

    const studentIdToNickLower = new Map<string, string>();

    for (const p of allProfiles) {
      const cleanNick = (p.nickname || '').trim();
      if (!cleanNick) continue;
      const nickLower = cleanNick.toLowerCase();
      if (nickLower === 'henry prof') continue;
      studentIdToNickLower.set(p.studentId, nickLower);
      getGroup(nickLower).profiles.push(p);
    }

    for (const s of allSubs) {
      const mappedNick = studentIdToNickLower.get(s.studentId);
      const cleanNick = (s.nickname || '').trim();
      const nickLower = mappedNick || cleanNick.toLowerCase();
      if (!nickLower || nickLower === 'henry prof') continue;
      getGroup(nickLower).subs.push(s);
    }

    const candidates: RescueCandidateInfo[] = [];

    for (const [, group] of groupsByNick.entries()) {
      if (group.profiles.length === 0 && group.subs.length === 0) continue;

      // Ordena perfis priorizando o mais recente/ativo
      const sortedProfiles = [...group.profiles].sort((a, b) => {
        const cycleDiff = (b.lastCompletedCycle || 0) - (a.lastCompletedCycle || 0);
        if (cycleDiff !== 0) return cycleDiff;
        const streakDiff = (b.streakDays || 0) - (a.streakDays || 0);
        if (streakDiff !== 0) return streakDiff;
        return (b.totalSolved || 0) - (a.totalSolved || 0);
      });

      const primaryProfile = sortedProfiles[0];
      const displayNickname =
        primaryProfile?.nickname?.trim() || group.subs[0]?.nickname?.trim() || 'Estudante';
      const primaryStudentId = primaryProfile?.studentId || group.subs[0]?.studentId || '';

      // Submissões anteriores ao ciclo atual vs. submissões no ciclo atual
      const subsBeforeToday = group.subs
        .filter((s) => (s.cycleNumber || 0) > 0 && (s.cycleNumber || 0) < currentCycleNumber)
        .sort((a, b) => (b.cycleNumber || 0) - (a.cycleNumber || 0));

      const subsToday = group.subs
        .filter((s) => s.cycleNumber === currentCycleNumber)
        .sort((a, b) => (b.streakDays || 0) - (a.streakDays || 0));

      const subToday = subsToday[0];

      // Calcula a maior ofensiva histórica ANTES do ciclo de hoje (maxStreakBeforeToday)
      let maxStreakBeforeToday = 0;
      for (const s of subsBeforeToday) {
        if ((s.streakDays || 0) > maxStreakBeforeToday) {
          maxStreakBeforeToday = s.streakDays || 0;
        }
      }
      for (const p of group.profiles) {
        // Se o perfil já tinha maxStreakDays gravado de antes (ou se ainda não concluiu hoje)
        if ((p.lastCompletedCycle || 0) < currentCycleNumber) {
          if ((p.streakDays || 0) > maxStreakBeforeToday) {
            maxStreakBeforeToday = p.streakDays || 0;
          }
          if ((p.maxStreakDays || 0) > maxStreakBeforeToday) {
            maxStreakBeforeToday = p.maxStreakDays || 0;
          }
        } else if (subToday?.previousStreakDays && subToday.previousStreakDays > maxStreakBeforeToday) {
          maxStreakBeforeToday = subToday.previousStreakDays;
        }
      }

      const overallMaxStreak = Math.max(
        maxStreakBeforeToday,
        subToday?.streakDays || 0,
        primaryProfile?.streakDays || 0,
        primaryProfile?.maxStreakDays || 0
      );

      // Sincroniza maxStreakDays no perfil principal em segundo plano se necessário
      if (primaryProfile && primaryProfile.maxStreakDays !== overallMaxStreak && overallMaxStreak > 0) {
        primaryProfile.maxStreakDays = overallMaxStreak;
        studentsMap[primaryProfile.studentId] = primaryProfile;
        updateDoc(doc(db, STUDENTS_COLLECTION, primaryProfile.studentId), {
          maxStreakDays: overallMaxStreak,
        }).catch(() => {});
      }

      // Critério de elegibilidade para o Resgate no ciclo atual:
      // 1. Recorde histórico antes de hoje >= 2 dias
      if (maxStreakBeforeToday < 2) continue;

      // 2. Verifica qual era o estado do aluno imediatamente antes de responder o ciclo de hoje
      const lastSubBeforeToday = subsBeforeToday[0];
      const profileBeforeToday = sortedProfiles.find(
        (p) => (p.lastCompletedCycle || 0) < currentCycleNumber
      );

      const prevCycle = Math.max(
        lastSubBeforeToday?.cycleNumber || 0,
        profileBeforeToday?.lastCompletedCycle || 0
      );
      const prevStreak =
        lastSubBeforeToday &&
        (lastSubBeforeToday.cycleNumber || 0) >= (profileBeforeToday?.lastCompletedCycle || 0)
          ? lastSubBeforeToday.streakDays || 0
          : profileBeforeToday?.streakDays || 0;
      const prevShields =
        lastSubBeforeToday?.streakShields ??
        profileBeforeToday?.streakShields ??
        primaryProfile?.streakShields ??
        0;

      const normalSim = calculateNewStreakWithShield(
        prevCycle,
        prevStreak,
        currentCycleNumber,
        prevShields,
        (primaryProfile?.totalSolved || 0) + 1,
        false,
        maxStreakBeforeToday
      );

      const wasEligibleBeforeToday =
        Boolean(subToday?.wasRescued) || normalSim.newStreak < maxStreakBeforeToday + 1;

      if (!wasEligibleBeforeToday) continue;

      const hasCompletedCurrentCycle = Boolean(
        subToday || (primaryProfile && primaryProfile.lastCompletedCycle === currentCycleNumber)
      );

      candidates.push({
        studentId: primaryStudentId,
        nickname: displayNickname,
        maxStreakDays: maxStreakBeforeToday,
        currentStreakDays: primaryProfile?.streakDays || 0,
        totalSolved: primaryProfile?.totalSolved || group.subs.length,
        lastCompletedCycle: primaryProfile?.lastCompletedCycle || prevCycle,
        hasRescuedToday: hasCompletedCurrentCycle,
        newStreakAfterRescue: Math.max(subToday?.streakDays || 0, maxStreakBeforeToday + 1),
      });
    }

    candidates.sort((a, b) =>
      a.nickname.localeCompare(b.nickname, 'pt-BR', { sensitivity: 'base' })
    );

    return { candidates, studentsMap };
  } catch (err) {
    console.warn('Erro ao calcular candidatos do Dia do Resgate:', err);
    return { candidates: [], studentsMap: {} };
  }
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
      saveCachedSubmissionsForCycle(cycleNumber, list);
      callback(list);
    },
    (error) => {
      console.warn('Erro ao escutar submissões do ciclo atual:', error);
      const cached = getCachedSubmissionsForCycle(cycleNumber);
      if (cached) {
        callback(cached);
      }
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

async function querySubmissionsByCycleRest(cycleNumber: number): Promise<DailySubmission[]> {
  if (typeof fetch === 'undefined' || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
    throw new Error('REST indisponível');
  }
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: SUBMISSIONS_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'cycleNumber' },
            op: 'EQUAL',
            value: { integerValue: String(cycleNumber) },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`REST status ${res.status}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  const results: DailySubmission[] = [];
  for (const row of rows) {
    const fields = row?.document?.fields;
    if (!fields) continue;
    const parsed: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      parsed[k] = parseFirestoreRestValue(v);
    }
    if (parsed.studentId) {
      results.push(parsed as DailySubmission);
    }
  }
  return results;
}

/**
 * Busca as submissões de um ciclo específico com suporte a cache local, fallback REST rápido e detecção de falha de rede
 */
export async function fetchSubmissionsByCycleWithCache(
  cycleNumber: number
): Promise<{ submissions: DailySubmission[]; fromCache: boolean; error: boolean }> {
  try {
    const sdkPromise = (async (): Promise<DailySubmission[]> => {
      const q = query(
        collection(db, SUBMISSIONS_COLLECTION),
        where('cycleNumber', '==', cycleNumber)
      );
      const snap = await getDocs(q);
      const list: DailySubmission[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as DailySubmission);
      });
      return list;
    })();

    const restFallbackPromise = new Promise<DailySubmission[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        querySubmissionsByCycleRest(cycleNumber).then(resolve).catch(reject);
      }, 700);
      sdkPromise.then(() => clearTimeout(timer)).catch(() => {});
    });

    const list = await Promise.any([sdkPromise, restFallbackPromise]);
    list.sort((a, b) => a.orderIndex - b.orderIndex);
    saveCachedSubmissionsForCycle(cycleNumber, list);
    return { submissions: list, fromCache: false, error: false };
  } catch (err) {
    console.warn('Erro ao buscar submissões por ciclo (usando cache local se disponível):', err);
    const cached = getCachedSubmissionsForCycle(cycleNumber);
    return {
      submissions: cached || [],
      fromCache: true,
      error: true,
    };
  }
}

/**
 * Busca as submissões de um ciclo específico
 */
export async function getSubmissionsByCycle(
  cycleNumber: number
): Promise<DailySubmission[]> {
  const res = await fetchSubmissionsByCycleWithCache(cycleNumber);
  return res.submissions;
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
    isRescueDay: false,
  });

  // 4. Limpar identificador local do professor/testador para não ficar com ofensiva de teste presa
  try {
    localStorage.removeItem(LOCAL_STUDENT_ID_KEY);
    localStorage.removeItem(LOCAL_STUDENT_NICK_KEY);
  } catch {
    // ignora em ambientes sem window/localStorage
  }
}

/**
 * Retorna um mapa de studentId -> StudentProfile para cruzamento rápido de dados
 */
export async function getAllStudentsMap(): Promise<Record<string, StudentProfile>> {
  try {
    const snap = await getDocs(collection(db, STUDENTS_COLLECTION));
    const map: Record<string, StudentProfile> = {};
    snap.forEach((d) => {
      const p = d.data() as StudentProfile;
      if (p.studentId) map[p.studentId] = p;
    });
    return map;
  } catch (err) {
    console.warn('Erro ao carregar mapa de alunos:', err);
    return {};
  }
}

