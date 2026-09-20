import { useState, useEffect, useCallback } from 'react';
import { StudentProfile, DailySubmission, MilestoneInfo } from '../types';
import {
  getLocalStudentId,
  getLocalStudentNick,
  setLocalStudentNick,
  getOrCreateStudentProfile,
  registerDailySubmission,
  subscribeToTodaySubmissions,
} from '../services/studentService';
import { calculateMilestone, getLocalDateString } from '../utils/gamification';
import { INITIAL_QUESTION } from '../data/fallbackQuestion';

export function useStudentGamification(currentQuestionId: string = String(INITIAL_QUESTION.id)) {
  const [studentId] = useState<string>(() => getLocalStudentId());
  const [nickname, setNicknameState] = useState<string>(() => getLocalStudentNick());
  const [isNickModalOpen, setIsNickModalOpen] = useState<boolean>(() => !getLocalStudentNick());
  const [isMuralModalOpen, setIsMuralModalOpen] = useState<boolean>(false);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [todaySubmissions, setTodaySubmissions] = useState<DailySubmission[]>([]);
  const [todayMySubmission, setTodayMySubmission] = useState<DailySubmission | null>(null);
  const [milestoneInfo, setMilestoneInfo] = useState<MilestoneInfo | null>(null);
  const [hasCompletedToday, setHasCompletedToday] = useState<boolean>(false);

  // Carrega ou inicializa perfil do aluno quando tem nickname
  useEffect(() => {
    if (!nickname) {
      setIsNickModalOpen(true);
      return;
    }

    let isMounted = true;
    getOrCreateStudentProfile(studentId, nickname)
      .then((p) => {
        if (isMounted) {
          setProfile(p);
          const todayStr = getLocalDateString();
          if (p.lastSolvedDate === todayStr) {
            setHasCompletedToday(true);
          }
          const mInfo = calculateMilestone(p.totalSolved, Math.max(0, p.totalSolved - 1));
          setMilestoneInfo(mInfo);
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar perfil do aluno:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [studentId, nickname]);

  // Escuta as submissões de hoje em tempo real
  useEffect(() => {
    const unsubscribe = subscribeToTodaySubmissions((subs) => {
      setTodaySubmissions(subs);
      const mine = subs.find((s) => s.studentId === studentId);
      if (mine) {
        setTodayMySubmission(mine);
        setHasCompletedToday(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [studentId]);

  // Salvar novo nickname
  const updateNickname = useCallback(
    async (newNick: string) => {
      setLocalStudentNick(newNick);
      setNicknameState(newNick);
      setIsNickModalOpen(false);
      try {
        const p = await getOrCreateStudentProfile(studentId, newNick);
        setProfile(p);
      } catch (err) {
        console.warn('Erro ao atualizar perfil com novo nick:', err);
      }
    },
    [studentId]
  );

  // Submeter a resolução da questão de hoje
  const completeQuestion = useCallback(async () => {
    if (!nickname) {
      setIsNickModalOpen(true);
      return null;
    }

    try {
      const prevTotal = profile?.totalSolved || 0;
      const res = await registerDailySubmission(studentId, nickname, currentQuestionId);
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
  }, [studentId, nickname, currentQuestionId, profile]);

  return {
    studentId,
    nickname,
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
