import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { QuestionCard } from './components/QuestionCard';
import { HintsSection } from './components/HintsSection';
import { AdminModal } from './components/AdminModal';
import { AdminPasswordModal, ADMIN_AUTH_KEY } from './components/AdminPasswordModal';
import { StudentIdentificationModal } from './components/StudentIdentificationModal';
import { CelebrationBottomSheet } from './components/CelebrationBottomSheet';
import { CommunityMuralModal } from './components/CommunityMuralModal';
import { useQuestionProgress } from './hooks/useQuestionProgress';
import { useStudentGamification } from './hooks/useStudentGamification';
import { INITIAL_QUESTION } from './data/fallbackQuestion';

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
    profile,
    todaySubmissions,
    todayMySubmission,
    milestoneInfo,
    updateNickname,
    completeQuestion,
  } = useStudentGamification(questionIdStr);

  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    baseHandleReset();
    setIsCelebrationOpen(false);
  };

  const handleConfirmAnswer = async (letter: string) => {
    // 1. Momento de confirmação pelo botão "Verificar Resposta":
    setSelectedLetter(letter);

    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
    }

    // Se acertou a alternativa:
    if (letter === question.correctLetter) {
      // Registra a conclusão no Firebase em background
      completeQuestion();

      // 2. Micro-delay pedagógico (850ms):
      // Permite o aluno comemorar e absorver visualmente a cor verde da alternativa correta antes da gaveta subir
      celebrationTimeoutRef.current = setTimeout(() => {
        setIsCelebrationOpen(true);
      }, 850);
    } else {
      setIsCelebrationOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1c1917] flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Top sticky header */}
      <Header
        fontSize={fontSize}
        onToggleFontSize={toggleFontSize}
        onOpenAdmin={handleAdminButtonClick}
        showAdminButton={isAdminVisible}
        studentProfile={profile}
        nickname={nickname}
        onOpenNickModal={() => setIsNickModalOpen(true)}
        onOpenMural={() => setIsMuralModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 font-sans">
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
              setSelectedLetter(null);
              setIsCelebrationOpen(false);
            }}
            fontSize={fontSize}
            todayCompletedCount={todaySubmissions.length}
            onOpenMural={() => setIsMuralModalOpen(true)}
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
          milestoneInfo={milestoneInfo}
          onOpenMural={() => setIsMuralModalOpen(true)}
          onScrollToHints={handleScrollToHints}
        />
      )}

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
        onSave={updateNickname}
        onClose={() => setIsNickModalOpen(false)}
      />

      {/* Modal do Mural da Turma */}
      <CommunityMuralModal
        isOpen={isMuralModalOpen}
        onClose={() => setIsMuralModalOpen(false)}
        submissions={todaySubmissions}
        currentStudentNick={nickname}
        cycleNumber={currentCycle?.currentCycleNumber}
      />
    </div>
  );
}
