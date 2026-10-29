import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { QuestionCard } from './components/QuestionCard';
import { HintsSection } from './components/HintsSection';
import { AdminModal } from './components/AdminModal';
import { AdminPasswordModal, ADMIN_AUTH_KEY } from './components/AdminPasswordModal';
import { StudentIdentificationModal } from './components/StudentIdentificationModal';
import { CelebrationBottomSheet } from './components/CelebrationBottomSheet';
import { CommunityMuralModal } from './components/CommunityMuralModal';
import { ShieldRescueModal } from './components/ShieldRescueModal';
import { ReferralWelcomeBanner } from './components/ReferralWelcomeBanner';
import { ReferralRewardToast } from './components/ReferralRewardToast';
import { useQuestionProgress } from './hooks/useQuestionProgress';
import { useStudentGamification } from './hooks/useStudentGamification';
import { INITIAL_QUESTION } from './data/fallbackQuestion';
import { syncSelectedLetterWithCompletion } from './utils/gamification';

export default function App() {
  const {
    question,
    selectedLetter,
    setSelectedLetter,
    unlockedStepIds,
    fontSize,
    toggleFontSize,
    adminOpen,
    setAdminOpen,
    hintsRef,
    handleReset: baseHandleReset,
    handleUnlockStep,
    handleUnlockNext,
    handleUnlockAll,
    handleCollapseAll,
    handleScrollToHints,
    handleQuestionLoaded,
  } = useQuestionProgress();

  const questionIdStr = String(question.id || INITIAL_QUESTION.id);
  const {
    studentId,
    nickname,
    currentCycle,
    isNickModalOpen,
    setIsNickModalOpen,
    isMuralModalOpen,
    setIsMuralModalOpen,
    isShieldRescueModalOpen,
    setIsShieldRescueModalOpen,
    dismissShieldRescueModal,
    referralInfo,
    clearReferralInfo,
    pendingRewardFriendName,
    dismissReferralRewardToast,
    wasShieldUsed,
    shieldsUsedCount,
    missedCycles,
    earnedNewShield,
    wasRescued,
    rescuedFromStreak,
    maxStreakDays,
    isEligibleForRescueToday,
    profile,
    streakShields,
    isShieldProtectingCurrentCycle,
    hasCompletedToday,
    todaySubmissions,
    todayMySubmission,
    milestoneInfo,
    isSubmitting,
    pendingSubmissionSync,
    isLoadingMural,
    muralLoadError,
    refreshMural,
    retryPendingSubmission,
    updateNickname,
    completeQuestion,
  } = useStudentGamification(questionIdStr);

  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const [isPendingNickModal, setIsPendingNickModal] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const nickModalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza visualmente a alternativa correta marcada:
  // - Restaura se o aluno já concluiu o ciclo atual ou tem sincronização pendente desta questão;
  // - Limpa imediatamente se a alternativa correta estava marcada por estado residual de ciclo anterior.
  useEffect(() => {
    const nextSelected = syncSelectedLetterWithCompletion({
      selectedLetter,
      correctLetter: question.correctLetter,
      hasCompletedToday,
      pendingSubmissionSync,
      isSubmitting,
      isNickModalOpen: isNickModalOpen || isPendingNickModal,
    });
    if (nextSelected !== selectedLetter) {
      setSelectedLetter(nextSelected);
      if (nextSelected === null) {
        setIsCelebrationOpen(false);
      }
    }
  }, [
    hasCompletedToday,
    pendingSubmissionSync,
    isSubmitting,
    isNickModalOpen,
    isPendingNickModal,
    question.correctLetter,
    selectedLetter,
    setSelectedLetter,
  ]);

  // Controle de visibilidade e autenticação do Painel do Professor
  // O botão só existe na tela se a URL contiver estritamente ?admin=1 ou ?admin=true
  const [isAdminVisible, setIsAdminVisible] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('admin') === '1' || params.get('admin') === 'true';
    } catch {
      return false;
    }
  });

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Escuta se a URL mudar
  useEffect(() => {
    const checkAdminParam = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        setIsAdminVisible(params.get('admin') === '1' || params.get('admin') === 'true');
      } catch {}
    };
    checkAdminParam();
    window.addEventListener('popstate', checkAdminParam);
    return () => window.removeEventListener('popstate', checkAdminParam);
  }, []);

  // Atualiza mural ao abrir painel do professor
  useEffect(() => {
    if (adminOpen) {
      refreshMural();
    }
  }, [adminOpen, refreshMural]);

  const handleAdminButtonClick = () => {
    // Se o professor já autenticou nesta sessão/dispositivo com a senha mestra
    try {
      const isAuth = localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
      if (isAuth) {
        setAdminOpen(true);
        return;
      }
    } catch {}
    // Caso contrário, solicita a senha
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    setAdminOpen(true);
  };

  const handleReset = () => {
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }
    if (nickModalTimeoutRef.current) {
      clearTimeout(nickModalTimeoutRef.current);
    }
    setIsPendingNickModal(false);
    baseHandleReset();
    setIsCelebrationOpen(false);
  };

  const handleConfirmAnswer = async (letter: string) => {
    // 1. Momento de confirmação pelo botão "Verificar Resposta":
    setSelectedLetter(letter);

    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }
    if (nickModalTimeoutRef.current) {
      clearTimeout(nickModalTimeoutRef.current);
    }

    // Se acertou a alternativa:
    if (letter === question.correctLetter) {
      // Se o aluno ainda não tem apelido, aguarda 600ms para celebrar o acerto verde + confetes
      // antes de abrir o Modal de Conquista solicitando o apelido
      if (!nickname || !nickname.trim()) {
        setIsPendingNickModal(true);
        nickModalTimeoutRef.current = setTimeout(() => {
          setIsNickModalOpen(true);
          setIsPendingNickModal(false);
        }, 600);
        return;
      }

      // Se já tem apelido, registra a conclusão no Firebase imediatamente
      const res = await completeQuestion();

      // 2. Micro-delay pedagógico (850ms):
      // Só abre a gaveta de celebração se o Firestore confirmou a gravação!
      if (res) {
        celebrationTimeoutRef.current = setTimeout(() => {
          setIsCelebrationOpen(true);
        }, 850);
      }
    } else {
      setIsPendingNickModal(false);
      setIsCelebrationOpen(false);
    }
  };

  const handleRetrySync = async () => {
    const res = await retryPendingSubmission();
    if (res) {
      celebrationTimeoutRef.current = setTimeout(() => {
        setIsCelebrationOpen(true);
      }, 450);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top sticky header */}
      <Header
        onOpenAdmin={handleAdminButtonClick}
        showAdminButton={isAdminVisible}
        studentProfile={profile}
        nickname={nickname}
        onOpenNickModal={() => setIsNickModalOpen(true)}
        onOpenMural={() => setIsMuralModalOpen(true)}
        isShieldProtecting={isShieldProtectingCurrentCycle}
        onOpenShieldRescue={() => setIsShieldRescueModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 font-sans">
        {/* Banner de Boas-vindas para Aluno Convidado */}
        {referralInfo?.referrerName && !hasCompletedToday && (
          <ReferralWelcomeBanner
            referrerName={referralInfo.referrerName}
            onDismiss={clearReferralInfo}
          />
        )}

        {/* Banner de Operação Resgate da Chama para Aluno Elegível */}
        {isEligibleForRescueToday && (
          <div className="rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 via-orange-50/90 to-purple-50 p-4 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-lg">
                ⚡
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200/80 text-amber-950">
                    Segunda Chance Oficial
                  </span>
                  <h2 className="text-sm sm:text-base font-extrabold text-stone-900">
                    Dia do Resgate da Chama Ativo! 🔥
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 mt-1 leading-relaxed">
                  Acerte a questão de hoje até as <strong>23h59</strong> para resgatar seu recorde histórico de{' '}
                  <strong className="text-orange-700">🔥 {maxStreakDays} dias</strong> e subir direto para{' '}
                  <strong className="text-purple-800">🔥 {maxStreakDays + 1} dias seguidos</strong>!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Question Card */}
        <section aria-label="Questão de Matemática">
          <QuestionCard
            question={question}
            selectedLetter={selectedLetter}
            onConfirmAnswer={handleConfirmAnswer}
            onScrollToHints={handleScrollToHints}
            onClearSelection={() => {
              if (celebrationTimeoutRef.current) {
                clearTimeout(celebrationTimeoutRef.current);
              }
              if (nickModalTimeoutRef.current) {
                clearTimeout(nickModalTimeoutRef.current);
              }
              setIsPendingNickModal(false);
              setSelectedLetter(null);
              setIsCelebrationOpen(false);
            }}
            fontSize={fontSize}
            onToggleFontSize={toggleFontSize}
            todayCompletedCount={todaySubmissions.length}
            onOpenMural={() => setIsMuralModalOpen(true)}
            isSubmitting={isSubmitting}
            hasCompletedToday={hasCompletedToday}
            pendingSubmissionSync={pendingSubmissionSync}
            onRetrySync={handleRetrySync}
          />
        </section>

        {/* Dynamic Hints & Progressive Resolution Section */}
        {question.steps && question.steps.length > 0 && (
          <div ref={hintsRef} className="pt-2">
            <HintsSection
              steps={question.steps}
              unlockedStepIds={unlockedStepIds}
              onUnlockStep={handleUnlockStep}
              onUnlockNext={handleUnlockNext}
              onUnlockAll={handleUnlockAll}
              onCollapseAll={handleCollapseAll}
              fontSize={fontSize}
              correctLetter={question.correctLetter}
              selectedLetter={selectedLetter}
              onConfirmAnswer={handleConfirmAnswer}
              hasCompletedToday={hasCompletedToday}
              isSubmitting={isSubmitting}
              pendingSubmissionSync={pendingSubmissionSync}
              onRetrySync={handleRetrySync}
              isFirstQuestion={Boolean(milestoneInfo?.isFirstQuestion)}
              whatsappGroupUrl={currentCycle?.whatsappGroupUrl}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="pt-8 pb-12 text-center text-xs text-stone-400 space-y-1">
          <p className="font-medium text-stone-600">
            Yes Matemática • Comunidade de Estudos do ENEM
          </p>
          <p>
            Constância diária, evolução real e resolução progressiva guiada.
          </p>
        </footer>
      </main>

      {/* Gaveta Inferior de Celebração e Reconhecimento */}
      {milestoneInfo && (
        <CelebrationBottomSheet
          isOpen={isCelebrationOpen}
          onClose={() => setIsCelebrationOpen(false)}
          studentName={nickname || 'Estudante'}
          orderIndex={todayMySubmission?.orderIndex || todaySubmissions.length}
          streakDays={profile?.streakDays || 1}
          cycleNumber={currentCycle?.currentCycleNumber}
          streakShields={streakShields}
          whatsappGroupUrl={currentCycle?.whatsappGroupUrl}
          milestoneInfo={milestoneInfo}
          onOpenMural={() => setIsMuralModalOpen(true)}
          onScrollToHints={handleScrollToHints}
          wasShieldUsed={wasShieldUsed}
          shieldsUsed={shieldsUsedCount || 1}
          earnedNewShield={earnedNewShield}
          wasRescued={wasRescued}
          rescuedFromStreak={rescuedFromStreak}
        />
      )}

      {/* Toast Comemorativo de Escudo Ganho por Indicação de Amigo */}
      <ReferralRewardToast
        friendName={pendingRewardFriendName}
        onDismiss={dismissReferralRewardToast}
      />

      {/* Modal de Acolhimento do Protetor de Ofensiva (Resgate da Chama) */}
      <ShieldRescueModal
        isOpen={isShieldRescueModalOpen}
        onClose={dismissShieldRescueModal}
        streakDays={profile?.streakDays || 1}
        remainingShields={streakShields}
        totalSolved={profile?.totalSolved || 0}
        missedDays={missedCycles || 1}
        shieldsUsed={shieldsUsedCount || 1}
        isAlreadyResolvedToday={hasCompletedToday}
        onActionClick={() => {
          const questionCard =
            document.getElementById('enem-question-card') ||
            document.querySelector('section[aria-label="Questão de Matemática"]');
          questionCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* Modal de Senha do Professor */}
      <AdminPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
      />

      {/* Teacher / Admin Modal */}
      <AdminModal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        onQuestionLoaded={handleQuestionLoaded}
        currentQuestion={question}
        todaySubmissions={todaySubmissions}
        currentCycle={currentCycle}
      />

      {/* Modal de Identificação do Aluno (Apelido) */}
      <StudentIdentificationModal
        isOpen={isNickModalOpen}
        initialNickname={nickname}
        currentStudentId={studentId}
        isCompletingQuestion={Boolean(
          selectedLetter && selectedLetter === question.correctLetter && !hasCompletedToday
        )}
        onSave={async (newNick, adoptedStudentId) => {
          const isCompleting = Boolean(
            selectedLetter && selectedLetter === question.correctLetter && !hasCompletedToday
          );
          if (isCompleting) {
            setIsPendingNickModal(true);
          }
          try {
            const updated = await updateNickname(newNick, adoptedStudentId);
            // Se o aluno já estava confirmando a resposta correta:
            if (isCompleting) {
              const res = await completeQuestion(updated.studentId, updated.nickname);
              if (res) {
                celebrationTimeoutRef.current = setTimeout(() => {
                  setIsCelebrationOpen(true);
                }, 400);
              }
            }
          } finally {
            setIsPendingNickModal(false);
          }
        }}
        onClose={() => setIsNickModalOpen(false)}
      />

      {/* Modal do Mural da Turma */}
      <CommunityMuralModal
        isOpen={isMuralModalOpen}
        onClose={() => setIsMuralModalOpen(false)}
        submissions={todaySubmissions}
        currentStudentId={studentId}
        currentStudentNick={nickname}
        currentUserTotalSolved={profile?.totalSolved}
        currentUserStreak={profile?.streakDays ?? 0}
        cycleNumber={currentCycle?.currentCycleNumber}
        hasCompletedToday={hasCompletedToday}
        isFirstQuestion={Boolean(milestoneInfo?.isFirstQuestion)}
        whatsappGroupUrl={currentCycle?.whatsappGroupUrl}
      />
    </div>
  );
}
