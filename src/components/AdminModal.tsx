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
} from 'lucide-react';
import { fetchWordPressPost, parseWordPressPost } from '../utils/wordpressParser';
import { QuestionData, DailySubmission } from '../types';
import {
  generateWhatsAppMessages,
  getYesterdayDateString,
  getLocalDateString,
} from '../utils/gamification';
import { getSubmissionsByDate } from '../services/studentService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionLoaded: (question: QuestionData) => void;
  currentQuestion: QuestionData;
  todaySubmissions: DailySubmission[];
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onQuestionLoaded,
  currentQuestion,
  todaySubmissions,
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'wordpress'>('whatsapp');
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dados do WhatsApp
  const [yesterdaySubmissions, setYesterdaySubmissions] = useState<DailySubmission[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const yesterdayStr = getYesterdayDateString();
      getSubmissionsByDate(yesterdayStr)
        .then((list) => {
          setYesterdaySubmissions(list);
        })
        .catch(() => {
          setYesterdaySubmissions([]);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      onQuestionLoaded(parsed);
      const stepsCount = parsed.steps ? parsed.steps.length : 0;
      setSuccessMessage(
        `Questão "${parsed.title || 'do dia'}" carregada com sucesso! (${stepsCount} etapas)`
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

  // Gerar mensagens
  const questionUrl = window.location.href.split('#')[0];
  const { message1, message2, message3 } = generateWhatsAppMessages({
    yesterdayList: yesterdaySubmissions,
    todayList: todaySubmissions,
    questionUrl,
    topicTitle: `${currentQuestion.discipline} — ${currentQuestion.title} (${currentQuestion.exam})`,
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
              <h3 className="text-base font-bold text-stone-900">
                Painel do Professor — Yes Matemática
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Comunidade WhatsApp e Gestão da Questão do Dia
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
                  <span className="font-bold">Estatísticas do Banco em Tempo Real:</span>{' '}
                  {todaySubmissions.length} concluíram hoje | {yesterdaySubmissions.length} concluíram ontem.
                </div>
                <div className="shrink-0 text-blue-700 font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>Sincronizado</span>
                </div>
              </div>

              {/* Card Mensagem 1: Manhã (Mural de Ontem) */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                      Mensagem 1 • Manhã
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      Mural da Turma de Ontem (Reconhecimento)
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyText(message1, 1)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
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
                <pre className="p-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                  {message1}
                </pre>
              </div>

              {/* Card Mensagem 2: Manhã (Questão do Dia) */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                      Mensagem 2 • Manhã (5s depois)
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      Questão do Dia (Link e Desafio)
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyText(message2, 2)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
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
                <pre className="p-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                  {message2}
                </pre>
              </div>

              {/* Card Mensagem 3: Noite (Chamada da Noite) */}
              <div className="border border-stone-200 rounded-xl p-4 bg-stone-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                      Mensagem 3 • Noite
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      Prévia da Chamada (Até as 23h59)
                    </h4>
                  </div>
                  <button
                    onClick={() => handleCopyText(message3, 3)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
                  >
                    {copiedIndex === 3 ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Mensagem 3</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-700 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                  {message3}
                </pre>
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
    </div>
  );
};
