import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Link,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  MessageSquare,
  Copy,
  Users,
  SunMedium,
  RotateCw,
  Trash2,
  Flame,
  Zap,
  Clock,
} from 'lucide-react';
import { fetchWordPressPost, parseWordPressPost } from '../utils/wordpressParser';
import { QuestionData, DailySubmission, DailyCycleConfig, RescueCandidateInfo } from '../types';
import { generateWhatsAppMessages, resolveWhatsappGroupUrl } from '../utils/gamification';
import {
  getSubmissionsByCycle,
  advanceToNextCycle,
  setActiveQuestionInFirestore,
  resetAllTestDataForLaunch,
  updateWhatsappGroupUrl,
  getRescueCandidatesAndSyncMaxStreaks,
} from '../services/studentService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionLoaded: (question: QuestionData) => void;
  currentQuestion: QuestionData;
  todaySubmissions: DailySubmission[];
  currentCycle?: DailyCycleConfig;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onQuestionLoaded,
  currentQuestion,
  todaySubmissions,
  currentCycle,
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'wordpress'>('whatsapp');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [advancingCycle, setAdvancingCycle] = useState(false);
  const [resettingData, setResettingData] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pendingNewDayMode, setPendingNewDayMode] = useState<'normal' | 'rescue' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dados do WhatsApp e Modo Dia do Resgate
  const [previousCycleSubmissions, setPreviousCycleSubmissions] = useState<DailySubmission[]>([]);
  const [rescueCandidates, setRescueCandidates] = useState<RescueCandidateInfo[]>([]);
  const [loadingRescueCandidates, setLoadingRescueCandidates] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [whatsappLinkInput, setWhatsappLinkInput] = useState<string>(
    resolveWhatsappGroupUrl(currentCycle?.whatsappGroupUrl)
  );
  const [savingWhatsappLink, setSavingWhatsappLink] = useState(false);
  const [whatsappLinkSaved, setWhatsappLinkSaved] = useState(false);

  useEffect(() => {
    if (currentCycle?.whatsappGroupUrl) {
      setWhatsappLinkInput(resolveWhatsappGroupUrl(currentCycle.whatsappGroupUrl));
    }
  }, [currentCycle?.whatsappGroupUrl]);

  const handleSaveWhatsappLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsappLinkInput.trim()) return;
    setSavingWhatsappLink(true);
    try {
      await updateWhatsappGroupUrl(whatsappLinkInput.trim());
      setWhatsappLinkSaved(true);
      setTimeout(() => setWhatsappLinkSaved(false), 2500);
    } catch (err: any) {
      setError('Falha ao salvar link do WhatsApp: ' + (err?.message || 'erro desconhecido'));
    } finally {
      setSavingWhatsappLink(false);
    }
  };

  const cycleNum = currentCycle?.currentCycleNumber || 1;
  const previousCycleNum = Math.max(1, cycleNum - 1);
  const isRescueDay = Boolean(currentCycle?.isRescueDay);
  const [studentsMap, setStudentsMap] = useState<Record<string, { totalSolved: number }>>({});

  useEffect(() => {
    if (isOpen) {
      setLoadingRescueCandidates(true);
      Promise.all([
        getSubmissionsByCycle(previousCycleNum),
        getRescueCandidatesAndSyncMaxStreaks(cycleNum),
      ])
        .then(([list, rescueData]) => {
          setStudentsMap(rescueData.studentsMap);
          setRescueCandidates(rescueData.candidates);
          const enriched = list.map((s) => ({
            ...s,
            totalSolved:
              s.totalSolved ?? rescueData.studentsMap[s.studentId]?.totalSolved ?? s.streakDays ?? 1,
          }));
          setPreviousCycleSubmissions(enriched);
        })
        .catch(() => {
          setPreviousCycleSubmissions([]);
        })
        .finally(() => {
          setLoadingRescueCandidates(false);
        });
    }
  }, [isOpen, previousCycleNum, cycleNum, todaySubmissions.length]);

  if (!isOpen) return null;

  const handleStartNewDay = async (mode: 'normal' | 'rescue') => {
    const startAsRescue = mode === 'rescue';
    setPendingNewDayMode(null);
    setAdvancingCycle(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedCycle = await advanceToNextCycle(String(currentQuestion.id), startAsRescue);
      // Atualiza a lista do mural anterior e sincroniza candidatos do novo ciclo
      const [prevList, rescueData] = await Promise.all([
        getSubmissionsByCycle(updatedCycle.currentCycleNumber - 1),
        getRescueCandidatesAndSyncMaxStreaks(updatedCycle.currentCycleNumber),
      ]);
      setPreviousCycleSubmissions(prevList);
      setRescueCandidates(rescueData.candidates);
      setStudentsMap(rescueData.studentsMap);

      if (startAsRescue) {
        setSuccessMessage(
          `🔥⚡ Novo Dia do Resgate iniciado com sucesso! Ciclo ativo: Dia #${updatedCycle.currentCycleNumber} (${rescueData.candidates.length} alunos elegíveis convocados nas mensagens abaixo).`
        );
      } else {
        setSuccessMessage(
          `Novo Dia Normal iniciado com sucesso! Ciclo ativo: Dia #${updatedCycle.currentCycleNumber}.`
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao avançar o ciclo diário.');
    } finally {
      setAdvancingCycle(false);
    }
  };

  const handleResetTestData = async () => {
    setShowResetConfirm(false);
    setResettingData(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await resetAllTestDataForLaunch();
      setPreviousCycleSubmissions([]);
      setSuccessMessage('Banco de dados zerado com sucesso! Ciclo pronto no Dia #1 oficial.');
      // Forçar atualização suave da página para limpar estados residuais do navegador
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Falha ao resetar dados de teste.');
      setResettingData(false);
    }
  };

  const handleLoadPost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) {
      setError('Por favor, cole o link ou o slug do post do seu blog.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const post = await fetchWordPressPost(urlInput.trim());
      const parsed = parseWordPressPost(post);
      
      // Salva no Firestore para que todos os alunos vejam instantaneamente
      try {
        await setActiveQuestionInFirestore(parsed);
      } catch (firestoreErr) {
        console.warn('Aviso: Não foi possível sincronizar no Firestore de imediato:', firestoreErr);
      }

      onQuestionLoaded(parsed);
      const stepsCount = parsed.steps ? parsed.steps.length : 0;
      setSuccessMessage(
        `Questão publicada para toda a turma! (${stepsCount} etapas)`
      );
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(
        err?.message ||
          'Falha ao buscar o post do WordPress. Verifique se o link está correto.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLoad = (url: string) => {
    setUrlInput(url);
  };

  // Gerar mensagens para WhatsApp (garantindo que o link enviado seja sempre limpo, sem ?admin=1)
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('admin');
  const questionUrl = cleanUrl.toString().split('#')[0];
  const enrichedPreviousList = previousCycleSubmissions.map((s) => ({
    ...s,
    totalSolved: s.totalSolved ?? studentsMap[s.studentId]?.totalSolved ?? s.streakDays ?? 1,
  }));
  const enrichedTodayList = todaySubmissions
    .filter((s) => !s.cycleNumber || s.cycleNumber === cycleNum)
    .map((s) => ({
      ...s,
      totalSolved: s.totalSolved ?? studentsMap[s.studentId]?.totalSolved ?? s.streakDays ?? 1,
    }));

  // Sincroniza em tempo real se algum candidato acabou de aparecer em todaySubmissions
  const todayCompletedNames = new Set(
    enrichedTodayList.map((s) => (s.nickname || '').trim().toLowerCase())
  );
  const syncedRescueCandidates = rescueCandidates.map((c) => {
    const doneToday =
      c.hasRescuedToday || todayCompletedNames.has((c.nickname || '').trim().toLowerCase());
    return {
      ...c,
      hasRescuedToday: doneToday,
    };
  });

  const rescuedTodayCount = syncedRescueCandidates.filter((c) => c.hasRescuedToday).length;
  const pendingRescueCount = syncedRescueCandidates.length - rescuedTodayCount;

  const {
    message1,
    message2,
    messageLunch,
    message3A,
    message3B,
    messageInviteA,
    messageInviteB,
  } = generateWhatsAppMessages({
    yesterdayList: enrichedPreviousList,
    todayList: enrichedTodayList,
    questionUrl,
    topicTitle: `${currentQuestion.discipline} — ${currentQuestion.title} (${currentQuestion.exam})`,
    cycleNumber: cycleNum,
    isRescueDay,
    rescueCandidates: syncedRescueCandidates,
  });

  const handleCopyText = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Painel */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              Y
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-stone-900">
                  Painel do Professor — Yes Matemática
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <SunMedium className="w-3 h-3 text-amber-600" />
                  Dia Ativo: #{cycleNum}
                </span>
                {isRescueDay && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-purple-600 fill-purple-500" />
                    Dia do Resgate Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Comunidade WhatsApp e Gestão do Ciclo Diário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Controle de Ciclo Diário (Começar Novo Dia Normal vs. Novo Dia do Resgate) */}
        <div className="px-5 py-3.5 bg-amber-50/80 border-b border-amber-200/70 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                Controle Manual da Virada de Dia
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-snug mt-0.5">
              Escolha como iniciar o <strong>Dia #{cycleNum + 1}</strong>: como um{' '}
              <strong>Dia Normal</strong> ou já ativando a <strong>⚡ Operação Resgate</strong> desde o primeiro segundo.
            </p>
          </div>

          {showResetConfirm ? (
            <div className="flex items-center gap-2 shrink-0 bg-red-50 p-2 rounded-xl border border-red-200 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-red-900">Zerar testes agora?</span>
              <button
                type="button"
                onClick={handleResetTestData}
                disabled={resettingData}
                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
              >
                {resettingData ? 'Limpando...' : 'Sim, Zerar'}
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={advancingCycle || resettingData}
                onClick={() => setPendingNewDayMode('normal')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 active:bg-stone-950 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                title="Iniciar próximo ciclo como um Dia Normal"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Novo Dia Normal (Dia #{cycleNum + 1})</span>
              </button>

              <button
                type="button"
                disabled={advancingCycle || resettingData}
                onClick={() => setPendingNewDayMode('rescue')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:from-amber-700 active:to-orange-800 disabled:opacity-60 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
                title="Iniciar próximo ciclo como Dia do Resgate da Chama"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Novo Dia do Resgate (Dia #{cycleNum + 1})</span>
              </button>
            </div>
          )}
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-stone-200 px-5 bg-stone-50/40 gap-4">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'whatsapp'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mensagens de WhatsApp (1 Clique)</span>
          </button>

          <button
            onClick={() => setActiveTab('wordpress')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'wordpress'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Trocar Questão (WordPress)</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'whatsapp' && (
            <div className="space-y-5">
              <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-3.5 text-xs text-blue-900 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold">Estatísticas do Ciclo Atual (Dia #{cycleNum}):</span>{' '}
                  {enrichedTodayList.length} concluíram nesta edição | {previousCycleSubmissions.length} concluíram no Dia #{previousCycleNum}.
                </div>
                <div className="shrink-0 text-blue-700 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Sincronizado</span>
                </div>
              </div>

              {/* Mensagem de Sucesso ou Erro Global */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Card Informativo: Visível quando o ciclo atual foi iniciado como Dia do Resgate */}
              {isRescueDay && (
                <div className="rounded-xl p-4 border bg-linear-to-r from-amber-50 via-orange-50/80 to-purple-50 border-amber-300 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
                        <span>Operação Resgate Ativa</span>
                      </span>
                      <h4 className="text-sm font-bold text-stone-900">
                        Dia do Resgate da Chama (Ciclo #{cycleNum})
                      </h4>
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Os alunos com recordes anteriores apagados recuperam sua{' '}
                    <strong>maior ofensiva histórica + 1 dia</strong> ao concluírem a questão de hoje. As 3 mensagens abaixo (Manhã, Almoço 12h e Noite) já estão configuradas para a Operação Resgate.
                  </p>

                  {/* Painel rápido de métricas do Resgate */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="bg-white/90 border border-stone-200/80 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        Convocados (≥ 2 dias)
                      </div>
                      <div className="text-sm sm:text-base font-black text-stone-900 mt-0.5">
                        {loadingRescueCandidates ? '...' : syncedRescueCandidates.length}
                      </div>
                    </div>
                    <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Já Resgataram Hoje
                      </div>
                      <div className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
                        {loadingRescueCandidates ? '...' : rescuedTodayCount}
                      </div>
                    </div>
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2.5 text-center">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Faltam Resgatar
                      </div>
                      <div className="text-sm sm:text-base font-black text-amber-950 mt-0.5">
                        {loadingRescueCandidates ? '...' : pendingRescueCount}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card de Configuração: Link Oficial do Grupo do WhatsApp */}
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Comunidade
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      Link do Grupo Oficial no WhatsApp
                    </h4>
                  </div>
                  {whatsappLinkSaved && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Salvo!
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  Este é o link exibido no <strong>card de convite do grupo</strong> (na Comemoração, no Mural e no final da Resolução) para os alunos chamarem amigos.
                </p>

                <form onSubmit={handleSaveWhatsappLink} className="flex gap-2">
                  <input
                    type="url"
                    value={whatsappLinkInput}
                    onChange={(e) => setWhatsappLinkInput(e.target.value)}
                    placeholder="https://tinyurl.com/enem-questoes-diarias"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-600 text-stone-900 shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={savingWhatsappLink}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    {savingWhatsappLink ? 'Salvando...' : 'Salvar Link'}
                  </button>
                </form>
              </div>

              {/* Card Mensagem 1: Manhã (Mural do Ciclo Anterior) */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                      Mensagem 1 • Manhã
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      {isRescueDay
                        ? 'Mural de Ontem + Gancho no Topo para o Resgate'
                        : 'Mural Oficial da Edição Anterior (Reconhecimento)'}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyText(message1, 1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    {copiedIndex === 1 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Mensagem 1</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-44 overflow-y-auto">
                  {message1}
                </pre>
              </div>

              {/* Card Mensagem 2: Manhã (Questão do Dia / Convocação do Resgate) */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                      {isRescueDay ? 'Mensagem 2 • Manhã (Convocação)' : 'Mensagem 2 • Manhã (5s depois)'}
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      {isRescueDay
                        ? 'Questão do Dia + Dia do Resgate (Enxuta p/ enviar com Imagem)'
                        : 'Questão do Dia (Link e Desafio)'}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyText(message2, 2)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    {copiedIndex === 2 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Mensagem 2</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                  {message2}
                </pre>
              </div>

              {/* Card Mensagem Extra: Almoço (Plantão do Meio-Dia - exibido nos Dias do Resgate) */}
              {isRescueDay && (
                <div className="border border-orange-200 rounded-xl p-4 bg-orange-50/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-800 bg-orange-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Mensagem do Almoço • 12h</span>
                      </span>
                      <h4 className="text-sm font-bold text-stone-900">
                        Plantão do Meio-Dia (Enxuto com Total do Mural)
                      </h4>
                    </div>
                    <button
                      onClick={() => handleCopyText(messageLunch, 5)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
                    >
                      {copiedIndex === 5 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Msg do Almoço</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                    {messageLunch}
                  </pre>
                </div>
              )}

              {/* Card Mensagem 3: Noite (Chamada da Noite) */}
              <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                      Mensagem 3 • Noite
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      Ofensiva da Noite (Dividida em 2 partes para o WhatsApp)
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Parte 1: Lista / Prova Social */}
                  <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-stone-700">
                          Parte 1: Lista (Quem já fez)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(message3A, 3)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                        >
                          {copiedIndex === 3 ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Parte 1</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                        {message3A}
                      </pre>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-2">
                      💡 Envie primeiro no grupo. Cada aluno fica em 1 linha curta com sua ofensiva atual.
                    </p>
                  </div>

                  {/* Parte 2: Chamada + Link */}
                  <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-stone-700">
                          Parte 2: Chamada + Link
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(message3B, 4)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                        >
                          {copiedIndex === 4 ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Parte 2</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                        {message3B}
                      </pre>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-2">
                      🚀 Envie logo em seguida com o alerta final até as 23h59.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Mensagem de Convite: Crescimento do Grupo (Dividida em 2 partes) */}
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Convite • Crescimento
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      Convite para Alunos Encaminharem (Dividido em 2 partes)
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Parte 1: Pedido para a turma */}
                  <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-stone-700">
                          Parte 1: Pedido para a turma
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(messageInviteA, 6)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                        >
                          {copiedIndex === 6 ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Parte 1</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                        {messageInviteA}
                      </pre>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-2">
                      💡 Envie primeiro no grupo para avisar que a mensagem abaixo está pronta para encaminhar.
                    </p>
                  </div>

                  {/* Parte 2: Mensagem pronta para encaminharem */}
                  <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-stone-700">
                          Parte 2: Mensagem p/ encaminhar
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyText(messageInviteB, 7)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                        >
                          {copiedIndex === 7 ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Parte 2</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto">
                        {messageInviteB}
                      </pre>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-2">
                      🚀 Envie logo em seguida. Funciona tanto no privado de amigos quanto em grupos de estudo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wordpress' && (
            <form onSubmit={handleLoadPost} className="space-y-4">
              <div>
                <label
                  htmlFor="wordpress-url-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5"
                >
                  URL ou Slug do Post no WordPress
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Link className="w-4 h-4" />
                  </div>
                  <input
                    id="wordpress-url-input"
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.yesmatematica.com/enem-2023-..."
                    className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all text-stone-900"
                  />
                </div>
              </div>

              {/* Atalhos Rápidos */}
              <div>
                <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
                  Sugestões Rápidas:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLoad(
                        'https://www.yesmatematica.com/enem-2023-o-esquema-mostra-como-a-intensidade-luminosa-decresce-com-o-aumento-da-profundidade-em-um-rio/'
                      )
                    }
                    className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    ENEM 2023 (Intensidade Luminosa)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLoad(
                        'https://www.yesmatematica.com/enem-2023-um-artista-plastico-esculpe-uma-escultura-em-formato-de-tronco-de-piramide/'
                      )
                    }
                    className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  >
                    ENEM 2023 (Geometria Espacial)
                  </button>
                </div>
              </div>

              {/* Mensagens de Feedback */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Carregar Questão</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Pop-up Centralizado de Confirmação de Novo Dia (Normal vs. Resgate) */}
      {pendingNewDayMode !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl border border-stone-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  pendingNewDayMode === 'rescue'
                    ? 'bg-linear-to-br from-amber-500 to-orange-600 text-white'
                    : 'bg-stone-900 text-white'
                }`}
              >
                {pendingNewDayMode === 'rescue' ? (
                  <Zap className="w-5 h-5 fill-white" />
                ) : (
                  <RotateCw className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <span
                  className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                    pendingNewDayMode === 'rescue'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  Virada para o Dia #{cycleNum + 1}
                </span>
                <h4 className="text-base font-extrabold text-stone-900 leading-snug">
                  {pendingNewDayMode === 'rescue'
                    ? 'Você realmente deseja começar um novo dia do resgate?'
                    : 'Você realmente deseja começar um novo dia normal?'}
                </h4>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                pendingNewDayMode === 'rescue'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              {pendingNewDayMode === 'rescue' ? (
                <>
                  O ciclo avançará para o <strong>Dia #{cycleNum + 1}</strong> já com a{' '}
                  <strong>⚡ Operação Resgate da Chama ativa desde o início</strong>. Todos os alunos que apagaram um recorde antigo poderão recuperar sua maior ofensiva histórica + 1 dia hoje, e as 3 mensagens especiais (Manhã, Almoço 12h e Noite) serão geradas.
                </>
              ) : (
                <>
                  O ciclo avançará para o <strong>Dia #{cycleNum + 1}</strong> no{' '}
                  <strong>modo padrão</strong> (sem resgate de recordes antigos) e o mural de hoje será reiniciado para a nova questão.
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={advancingCycle}
                onClick={() => setPendingNewDayMode(null)}
                className="px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={advancingCycle}
                onClick={() => handleStartNewDay(pendingNewDayMode)}
                className={`px-4 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  pendingNewDayMode === 'rescue'
                    ? 'bg-linear-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                    : 'bg-stone-900 hover:bg-stone-800'
                }`}
              >
                {advancingCycle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Iniciando...</span>
                  </>
                ) : pendingNewDayMode === 'rescue' ? (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Sim, começar Dia do Resgate</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Sim, começar Dia Normal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
