import { useState, useEffect, useCallback, useRef } from 'react';
import { StudentProfile, DailySubmission, MilestoneInfo, DailyCycleConfig } from '../types';
import {
  getLocalStudentId,
  setLocalStudentId,
  getLocalStudentNick,
  setLocalStudentNick,
  getStudentProfileById,
  findExistingStudentByNickname,
  getOrCreateStudentProfile,
  registerDailySubmission,
  markReferralRewardSeen,
  subscribeToDailyCycle,
  fetchSubmissionsByCycleWithCache,
  getCachedDailyCycle,
  getCachedSubmissionsForCycle,
  saveCachedSubmissionsForCycle,
  getPendingSubmission,
  setPendingSubmission,
  clearPendingSubmission,
  getPendingReferral,
  setPendingReferral,
  clearPendingReferral,
  PendingReferralInfo,
} from '../services/studentService';
import { calculateMilestone, getLocalDateString } from '../utils/gamification';
import { INITIAL_QUESTION } from '../data/fallbackQuestion';

export function useStudentGamification(currentQuestionId: string = String(INITIAL_QUESTION.id)) {
  const [studentId, setStudentId] = useState<string>(() => getLocalStudentId());
  const [nickname, setNicknameState] = useState<string>(() => getLocalStudentNick());
  const [isNickModalOpen, setIsNickModalOpen] = useState<boolean>(() => !getLocalStudentNick());
  const [isMuralModalOpen, setIsMuralModalOpen] = useState<boolean>(false);

  // Informações de indicação (quem convidou este aluno)
  const [referralInfo, setReferralInfo] = useState<PendingReferralInfo | null>(() => getPendingReferral());

  // Captura automática de parâmetros de convite na URL (?convite=Nome ou ?ref=Nome)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteParam = params.get('convite') || params.get('ref') || params.get('indicacao');
      if (inviteParam && inviteParam.trim()) {
        const cleanName = decodeURIComponent(inviteParam.trim());
        const info: PendingReferralInfo = {
          referrerName: cleanName,
          storedAt: new Date().toISOString(),
        };
        setPendingReferral(info);
        setReferralInfo(info);
      }
    } catch (e) {
      console.warn('Erro ao processar parâmetro de convite:', e);
    }
  }, []);

  const [currentCycle, setCurrentCycle] = useState<DailyCycleConfig>(() => {
    const cached = getCachedDailyCycle();
    if (cached) return cached;
    return {
      currentCycleNumber: 1,
      currentCycleDate: getLocalDateString(),
      startedAt: new Date().toISOString(),
    };
  });
  const [isCycleLoaded, setIsCycleLoaded] = useState<boolean>(() => Boolean(getCachedDailyCycle()));

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [todaySubmissions, setTodaySubmissions] = useState<DailySubmission[]>(() => {
    const cachedCycle = getCachedDailyCycle();
    if (cachedCycle) {
      return getCachedSubmissionsForCycle(cachedCycle.currentCycleNumber) || [];
    }
    return [];
  });
  const [todayMySubmission, setTodayMySubmission] = useState<DailySubmission | null>(null);
  const [milestoneInfo, setMilestoneInfo] = useState<MilestoneInfo | null>(null);
  const [hasCompletedToday, setHasCompletedToday] = useState<boolean>(false);

  // Estados de sincronização da submissão e do Mural
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingSubmissionSync, setPendingSubmissionSync] = useState<boolean>(() => {
    const pending = getPendingSubmission();
    return Boolean(pending && pending.questionId === currentQuestionId);
  });
  const [isLoadingMural, setIsLoadingMural] = useState<boolean>(false);
  const [muralLoadError, setMuralLoadError] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Atualiza estado de submissão pendente se trocar de questão
  useEffect(() => {
    const pending = getPendingSubmission();
    setPendingSubmissionSync(Boolean(pending && pending.questionId === currentQuestionId));
  }, [currentQuestionId]);

  // Escuta as alterações no ciclo diário gerenciado pelo professor (apenas 1 documento leve)
  useEffect(() => {
    const unsubCycle = subscribeToDailyCycle((cycle) => {
      setCurrentCycle(cycle);
      setIsCycleLoaded(true);
    });
    return () => unsubCycle();
  }, []);

  // Busca sob demanda as submissões do Mural (ao entrar, ao acertar e ao abrir o Mural)
  const refreshMural = useCallback(
    async (targetCycleNumber?: number) => {
      const cycleNum = targetCycleNumber ?? currentCycle.currentCycleNumber;
      if (!cycleNum || cycleNum < 1) return;

      setIsLoadingMural(true);
      try {
        const res = await fetchSubmissionsByCycleWithCache(cycleNum);
        setMuralLoadError(res.error);

        setTodaySubmissions((prev) => {
          // Se deu erro na rede e já tínhamos submissões em memória para este ciclo, preserva a lista
          if (res.error && res.submissions.length === 0 && prev.length > 0 && prev[0]?.cycleNumber === cycleNum) {
            return prev;
          }
          return res.submissions;
        });

        const mine = res.submissions.find((s) => s.studentId === studentId);
        if (mine) {
          setTodayMySubmission(mine);
          setHasCompletedToday(true);
          clearPendingSubmission();
          setPendingSubmissionSync(false);
        } else if (!res.error) {
          // Só limpa se a consulta ao servidor teve sucesso e realmente não consta submissão
          setTodayMySubmission((prevMine) => (prevMine?.cycleNumber === cycleNum ? prevMine : null));
        }
      } finally {
        setIsLoadingMural(false);
      }
    },
    [currentCycle.currentCycleNumber, studentId]
  );

  // 1. Carrega a lista do Mural ao entrar no app (assim que o ciclo oficial estiver carregado)
  useEffect(() => {
    if (!isCycleLoaded) return;
    const cachedList = getCachedSubmissionsForCycle(currentCycle.currentCycleNumber);
    if (cachedList && cachedList.length > 0) {
      setTodaySubmissions(cachedList);
      const mine = cachedList.find((s) => s.studentId === studentId);
      if (mine) {
        setTodayMySubmission(mine);
        setHasCompletedToday(true);
      }
    }
    refreshMural(currentCycle.currentCycleNumber);
  }, [isCycleLoaded, currentCycle.currentCycleNumber, studentId, refreshMural]);

  // 2. Atualiza a lista do Mural sempre que o aluno abrir o modal do Mural
  useEffect(() => {
    if (isMuralModalOpen && isCycleLoaded) {
      refreshMural(currentCycle.currentCycleNumber);
    }
  }, [isMuralModalOpen, isCycleLoaded, currentCycle.currentCycleNumber, refreshMural]);

  // 1º Passo (Prioridade Absoluta - ID) e 2º Passo (Fallback inteligente - Nickname)
  useEffect(() => {
    if (!isCycleLoaded) return;
    let isMounted = true;

    async function initStudent() {
      // 1. Tenta buscar direto pelo ID no Firestore
      const profileById = await getStudentProfileById(studentId);
      if (!isMounted) return;

      if (profileById) {
        setProfile(profileById);
        if (profileById.nickname) {
          setNicknameState(profileById.nickname);
          setLocalStudentNick(profileById.nickname);
          setIsNickModalOpen(false);
        }
        if (profileById.lastCompletedCycle === currentCycle.currentCycleNumber) {
          setHasCompletedToday(true);
          clearPendingSubmission();
          setPendingSubmissionSync(false);
        } else {
          setHasCompletedToday((prev) =>
            todayMySubmission?.cycleNumber === currentCycle.currentCycleNumber ? prev : false
          );
        }
        const mInfo = calculateMilestone(profileById.totalSolved, Math.max(0, profileById.totalSolved - 1));
        setMilestoneInfo(mInfo);
        return;
      }

      // 2. Se o ID atual não tem perfil no Firestore, verifica se há um nickname salvo
      if (nickname) {
        const profileByNick = await findExistingStudentByNickname(nickname, studentId);
        if (!isMounted) return;

        if (profileByNick) {
          setLocalStudentId(profileByNick.studentId);
          setStudentId(profileByNick.studentId);
          setProfile(profileByNick);
          if (profileByNick.lastCompletedCycle === currentCycle.currentCycleNumber) {
            setHasCompletedToday(true);
            clearPendingSubmission();
            setPendingSubmissionSync(false);
          }
          const mInfo = calculateMilestone(profileByNick.totalSolved, Math.max(0, profileByNick.totalSolved - 1));
          setMilestoneInfo(mInfo);
          setIsNickModalOpen(false);
          return;
        }

        // Se não encontrou nem por ID nem por nick, inicializa o novo
        const newP = await getOrCreateStudentProfile(studentId, nickname);
        if (isMounted) {
          setProfile(newP);
          const mInfo = calculateMilestone(newP.totalSolved, Math.max(0, newP.totalSolved - 1));
          setMilestoneInfo(mInfo);
        }
      } else {
        // Sem ID válido e sem nickname: solicita identificação
        setIsNickModalOpen(true);
      }
    }

    initStudent().catch((err) => {
      console.warn('Erro ao inicializar aluno:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [studentId, isCycleLoaded, currentCycle.currentCycleNumber]);

  // Salvar novo nickname (ou adotar ID existente ao confirmar)
  const updateNickname = useCallback(
    async (newNick: string, adoptedStudentId?: string) => {
      const targetStudentId = adoptedStudentId || studentId;
      setLocalStudentId(targetStudentId);
      setLocalStudentNick(newNick);
      setStudentId(targetStudentId);
      setNicknameState(newNick);
      setIsNickModalOpen(false);

      try {
        const p = await getOrCreateStudentProfile(targetStudentId, newNick);
        setProfile(p);
        if (p.lastCompletedCycle === currentCycle.currentCycleNumber) {
          setHasCompletedToday(true);
        }
        const mInfo = calculateMilestone(p.totalSolved, Math.max(0, p.totalSolved - 1));
        setMilestoneInfo(mInfo);
        return { profile: p, studentId: targetStudentId, nickname: newNick };
      } catch (err) {
        console.warn('Erro ao atualizar perfil com novo nick:', err);
        return { profile: null, studentId: targetStudentId, nickname: newNick };
      }
    },
    [studentId, currentCycle.currentCycleNumber]
  );

  // Estado do Modal de Resgate de Protetor de Ofensiva (Ufa! Sua chama continua viva!)
  const [isShieldRescueModalOpen, setIsShieldRescueModalOpen] = useState(false);
  const [wasShieldUsedInSubmission, setWasShieldUsedInSubmission] = useState(false);
  const [shieldsUsedInSubmission, setShieldsUsedInSubmission] = useState<number>(0);
  const [earnedNewShieldInSubmission, setEarnedNewShieldInSubmission] = useState(false);

  // Notificação de Escudo ganho por indicação de amigo (?convite)
  const [pendingRewardFriendName, setPendingRewardFriendName] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.lastReferralReward && !profile.lastReferralReward.seen) {
      setPendingRewardFriendName(profile.lastReferralReward.friendName);
    } else {
      setPendingRewardFriendName(null);
    }
  }, [profile]);

  const dismissReferralRewardToast = useCallback(async () => {
    setPendingRewardFriendName(null);
    if (studentId) {
      await markReferralRewardSeen(studentId);
    }
  }, [studentId]);

  // Submeter a resolução da questão do ciclo atual
  const completeQuestion = useCallback(
    async (overrideStudentId?: string, overrideNickname?: string) => {
      const activeNick = overrideNickname || nickname;
      const activeId = overrideStudentId || studentId;

      if (!activeNick) {
        setIsNickModalOpen(true);
        return null;
      }

      if (isSubmittingRef.current) {
        return null;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        const prevTotal = profile?.totalSolved || 0;
        const res = await registerDailySubmission(
          activeId,
          activeNick,
          currentQuestionId,
          isCycleLoaded ? currentCycle.currentCycleNumber : undefined,
          referralInfo ? { referrerName: referralInfo.referrerName, referrerId: referralInfo.referrerId } : undefined
        );

        clearPendingSubmission();
        setPendingSubmissionSync(false);
        setProfile(res.profile);
        setTodayMySubmission(res.submission);
        setHasCompletedToday(true);

        // Atualiza a lista local do Mural imediatamente e busca a versão mais recente do servidor
        const targetCycle = res.submission.cycleNumber ?? currentCycle.currentCycleNumber;
        setTodaySubmissions((prev) => {
          const filtered = prev.filter((s) => s.studentId !== res.submission.studentId);
          const next = [...filtered, res.submission].sort((a, b) => a.orderIndex - b.orderIndex);
          saveCachedSubmissionsForCycle(targetCycle, next);
          return next;
        });
        refreshMural(targetCycle);

        if (res.shieldWasUsed) {
          setWasShieldUsedInSubmission(true);
          if (res.shieldsUsed) {
            setShieldsUsedInSubmission(res.shieldsUsed);
          }
        }
        if (res.earnedNewShield) {
          setEarnedNewShieldInSubmission(true);
        }

        const mInfo = calculateMilestone(res.profile.totalSolved, prevTotal);
        setMilestoneInfo(mInfo);

        return res;
      } catch (err) {
        console.error('Erro ao registrar conclusão diária (salvando na fila local):', err);
        setPendingSubmission({
          studentId: activeId,
          nickname: activeNick,
          questionId: currentQuestionId,
          cycleNumber: isCycleLoaded ? currentCycle.currentCycleNumber : undefined,
          storedAt: new Date().toISOString(),
        });
        setPendingSubmissionSync(true);
        return null;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [studentId, nickname, currentQuestionId, isCycleLoaded, currentCycle.currentCycleNumber, profile, referralInfo, refreshMural]
  );

  // Reenvia submissão pendente da fila local (manual ou automático)
  const retryPendingSubmission = useCallback(async () => {
    const pending = getPendingSubmission();
    if (!pending || isSubmittingRef.current) return null;
    const res = await completeQuestion(pending.studentId || studentId, pending.nickname || nickname);
    return res;
  }, [completeQuestion, studentId, nickname]);

  // Reenvio automático em segundo plano ao carregar ciclo, reconectar à internet ou voltar para a aba
  useEffect(() => {
    if (!isCycleLoaded || hasCompletedToday) return;

    const attemptAutoSync = () => {
      const pending = getPendingSubmission();
      if (pending && (pending.nickname || nickname) && !isSubmittingRef.current) {
        retryPendingSubmission();
      }
    };

    attemptAutoSync();

    const handleOnline = () => attemptAutoSync();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        attemptAutoSync();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isCycleLoaded, hasCompletedToday, nickname, retryPendingSubmission]);

  const streakShields = profile?.streakShields ?? 0;
  const missedCycles =
    isCycleLoaded && profile?.lastCompletedCycle != null && profile.lastCompletedCycle > 0
      ? Math.max(0, currentCycle.currentCycleNumber - 1 - profile.lastCompletedCycle)
      : 0;

  // O aluno está protegido se tiver faltado 1 ou mais ciclos e possuir escudos suficientes para cobrir TODAS as faltas
  const isShieldProtectingCurrentCycle = Boolean(
    isCycleLoaded &&
    profile &&
    missedCycles > 0 &&
    missedCycles <= streakShields
  );

  const wasShieldUsed = wasShieldUsedInSubmission || Boolean(
    isCycleLoaded &&
    profile &&
    profile.lastShieldUsedCycle === currentCycle.currentCycleNumber - 1 &&
    profile.lastCompletedCycle === currentCycle.currentCycleNumber
  );

  const shieldsUsedCount = shieldsUsedInSubmission || (isShieldProtectingCurrentCycle ? missedCycles : wasShieldUsed ? 1 : 0);

  const earnedNewShield = earnedNewShieldInSubmission || Boolean(
    isCycleLoaded &&
    profile &&
    profile.lastCompletedCycle === currentCycle.currentCycleNumber &&
    profile.streakDays > 0 &&
    profile.streakDays % 7 === 0 &&
    streakShields > 0
  );

  // Exibe o modal de resgate automaticamente ao entrar no app se o aluno estiver protegido por escudo
  useEffect(() => {
    if (!isCycleLoaded || !profile || !studentId || isNickModalOpen) return;

    if (isShieldProtectingCurrentCycle) {
      const storageKey = `yes_shield_rescue_seen_${studentId}_cycle_${currentCycle.currentCycleNumber}`;
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen) {
        setIsShieldRescueModalOpen(true);
      }
    }
  }, [isCycleLoaded, profile, studentId, isShieldProtectingCurrentCycle, currentCycle.currentCycleNumber, isNickModalOpen]);

  // Função para fechar e registrar que o aluno já viu o modal neste ciclo
  const dismissShieldRescueModal = useCallback(() => {
    setIsShieldRescueModalOpen(false);
    try {
      const storageKey = `yes_shield_rescue_seen_${studentId}_cycle_${currentCycle.currentCycleNumber}`;
      localStorage.setItem(storageKey, 'seen');
    } catch (e) {
      // Ignora erro se localStorage estiver desabilitado
    }
  }, [studentId, currentCycle.currentCycleNumber]);

  return {
    studentId,
    nickname,
    currentCycle,
    isCycleLoaded,
    isNickModalOpen,
    setIsNickModalOpen,
    isMuralModalOpen,
    setIsMuralModalOpen,
    isShieldRescueModalOpen,
    setIsShieldRescueModalOpen,
    dismissShieldRescueModal,
    pendingRewardFriendName,
    dismissReferralRewardToast,
    referralInfo,
    clearReferralInfo: clearPendingReferral,
    wasShieldUsed,
    wasShieldUsedInSubmission,
    shieldsUsedCount,
    missedCycles,
    earnedNewShield,
    profile,
    streakShields,
    isShieldProtectingCurrentCycle,
    lastShieldUsedCycle: profile?.lastShieldUsedCycle,
    todaySubmissions,
    todayMySubmission,
    milestoneInfo,
    hasCompletedToday,
    isSubmitting,
    pendingSubmissionSync,
    isLoadingMural,
    muralLoadError,
    refreshMural,
    retryPendingSubmission,
    updateNickname,
    completeQuestion,
  };
}
