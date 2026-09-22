import { useState, useEffect, useCallback } from 'react';
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
  subscribeToCurrentCycleSubmissions,
  subscribeToDailyCycle,
} from '../services/studentService';
import { calculateMilestone, getLocalDateString } from '../utils/gamification';
import { INITIAL_QUESTION } from '../data/fallbackQuestion';

export function useStudentGamification(currentQuestionId: string = String(INITIAL_QUESTION.id)) {
  const [studentId, setStudentId] = useState<string>(() => getLocalStudentId());
  const [nickname, setNicknameState] = useState<string>(() => getLocalStudentNick());
  const [isNickModalOpen, setIsNickModalOpen] = useState<boolean>(() => !getLocalStudentNick());
  const [isMuralModalOpen, setIsMuralModalOpen] = useState<boolean>(false);

  const [currentCycle, setCurrentCycle] = useState<DailyCycleConfig>({
    currentCycleNumber: 1,
    currentCycleDate: getLocalDateString(),
    startedAt: new Date().toISOString(),
  });

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [todaySubmissions, setTodaySubmissions] = useState<DailySubmission[]>([]);
  const [todayMySubmission, setTodayMySubmission] = useState<DailySubmission | null>(null);
  const [milestoneInfo, setMilestoneInfo] = useState<MilestoneInfo | null>(null);
  const [hasCompletedToday, setHasCompletedToday] = useState<boolean>(false);

  // Escuta as alterações no ciclo diário gerenciado pelo professor
  useEffect(() => {
    const unsubCycle = subscribeToDailyCycle((cycle) => {
      setCurrentCycle(cycle);
    });
    return () => unsubCycle();
  }, []);

  // 1º Passo (Prioridade Absoluta - ID) e 2º Passo (Fallback inteligente - Nickname)
  useEffect(() => {
    let isMounted = true;

    async function initStudent() {
      // 1. Tenta buscar direto pelo ID no Firestore
      const profileById = await getStudentProfileById(studentId);
      if (!isMounted) return;

      if (profileById) {
        // Encontrou por ID! Usa perfil consolidado diretamente
        setProfile(profileById);
        if (profileById.nickname) {
          setNicknameState(profileById.nickname);
          setLocalStudentNick(profileById.nickname);
          setIsNickModalOpen(false);
        }
        if (profileById.lastCompletedCycle === currentCycle.currentCycleNumber) {
          setHasCompletedToday(true);
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
          // Adota o ID do perfil original com histórico
          setLocalStudentId(profileByNick.studentId);
          setStudentId(profileByNick.studentId);
          setProfile(profileByNick);
          if (profileByNick.lastCompletedCycle === currentCycle.currentCycleNumber) {
            setHasCompletedToday(true);
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
  }, [studentId, currentCycle.currentCycleNumber]);

  // Escuta as submissões do ciclo atual em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToCurrentCycleSubmissions(currentCycle.currentCycleNumber, (subs) => {
      setTodaySubmissions(subs);
      const mine = subs.find((s) => s.studentId === studentId);
      if (mine) {
        setTodayMySubmission(mine);
        setHasCompletedToday(true);
      } else {
        setTodayMySubmission(null);
        setHasCompletedToday(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [studentId, currentCycle.currentCycleNumber]);

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
      } catch (err) {
        console.warn('Erro ao atualizar perfil com novo nick:', err);
      }
    },
    [studentId, currentCycle.currentCycleNumber]
  );

  // Submeter a resolução da questão do ciclo atual
  const completeQuestion = useCallback(async () => {
    if (!nickname) {
      setIsNickModalOpen(true);
      return null;
    }

    try {
      const prevTotal = profile?.totalSolved || 0;
      const res = await registerDailySubmission(
        studentId,
        nickname,
        currentQuestionId,
        currentCycle.currentCycleNumber
      );
      setProfile(res.profile);
      setTodayMySubmission(res.submission);
      setHasCompletedToday(true);

      const mInfo = calculateMilestone(res.profile.totalSolved, prevTotal);
      setMilestoneInfo(mInfo);

      return res;
    } catch (err) {
      console.error('Erro ao registrar conclusão diária:', err);
      return null;
    }
  }, [studentId, nickname, currentQuestionId, currentCycle.currentCycleNumber, profile]);

  return {
    studentId,
    nickname,
    currentCycle,
    isNickModalOpen,
    setIsNickModalOpen,
    isMuralModalOpen,
    setIsMuralModalOpen,
    profile,
    todaySubmissions,
    todayMySubmission,
    milestoneInfo,
    hasCompletedToday,
    updateNickname,
    completeQuestion,
  };
}
