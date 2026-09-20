import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowDown,
  Users,
  Check,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuestionData, Alternative } from '../types';

interface QuestionCardProps {
  question: QuestionData;
  selectedLetter: string | null;
  onConfirmAnswer: (letter: string) => void;
  onScrollToHints: () => void;
  onClearSelection: () => void;
  fontSize: 'normal' | 'large';
  todayCompletedCount?: number;
  onOpenMural?: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedLetter,
  onConfirmAnswer,
  onScrollToHints,
  onClearSelection,
  fontSize,
  todayCompletedCount = 0,
  onOpenMural,
}) => {
  // Opção marcada provisoriamente antes de clicar em "Verificar"
  const [tentativeLetter, setTentativeLetter] = useState<string | null>(selectedLetter);

  // Lista de alternativas que o estudante já tentou e errou (descartadas)
  const [eliminatedLetters, setEliminatedLetters] = useState<string[]>([]);

  // Sincroniza se o estado for limpo externamente
  React.useEffect(() => {
    if (selectedLetter === null) {
      setTentativeLetter(null);
    }
  }, [selectedLetter]);

  // Reseta seleção provisória e alternativas eliminadas ao trocar de questão
  React.useEffect(() => {
    setTentativeLetter(null);
    setEliminatedLetters([]);
  }, [question.id]);

  const isConfirmed = selectedLetter !== null;
  const isCorrectAnswer = selectedLetter === question.correctLetter;

  const handleSelectAlternative = (letter: string) => {
    // Não permite selecionar se a pergunta já foi confirmada ou se a letra já foi eliminada por erro anterior
    if (isConfirmed || eliminatedLetters.includes(letter)) return;
    setTentativeLetter(letter);
  };

  const handleConfirm = () => {
    if (!tentativeLetter || isConfirmed) return;

    onConfirmAnswer(tentativeLetter);

    if (tentativeLetter === question.correctLetter) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Safe canvas fallback
      }
    } else {
      // Se errou, adiciona à lista de alternativas descartadas
      if (!eliminatedLetters.includes(tentativeLetter)) {
        setEliminatedLetters((prev) => [...prev, tentativeLetter]);
      }
    }
  };

  const handleTryRecalculate = () => {
    setTentativeLetter(null);
    onClearSelection();
  };

  const selectedAlternative = question.alternatives.find(
    (alt: Alternative) => alt.letter === selectedLetter
  );

  const bodyTextClass =
    fontSize === 'large'
      ? 'text-[19px] leading-[1.8]'
      : 'text-[17px] sm:text-[17.5px] leading-[1.72]';

  // Sanitize HTML from WordPress safely
  const cleanEnunciado = DOMPurify.sanitize(question.enunciadoHtml, {
    ADD_TAGS: [
      'figure',
      'figcaption',
      'annotation',
      'semantics',
      'math',
      'mrow',
      'mfrac',
      'mn',
      'mi',
      'mo',
      'mspace',
      'msup',
      'msub',
      'msqrt',
      'span',
      'div',
      'table',
      'thead',
      'tbody',
      'tr',
      'td',
      'th',
    ],
    ADD_ATTR: [
      'src',
      'alt',
      'srcset',
      'sizes',
      'class',
      'width',
      'height',
      'aria-hidden',
      'encoding',
      'style',
    ],
  });

  return (
    <article
      id="enem-question-card"
      className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 sm:p-9 transition-all font-sans"
    >
      {/* Exam Identification & Termômetro da Turma */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-6 border-b border-stone-200/70 text-xs tracking-wider uppercase">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-700">{question.exam}</span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-500 font-medium">{question.discipline}</span>
        </div>

        {/* Termômetro da Turma */}
        {todayCompletedCount > 0 && onOpenMural && (
          <button
            type="button"
            onClick={onOpenMural}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 text-[11px] font-bold tracking-tight transition-colors cursor-pointer w-fit"
            title="Ver quem já concluiu no Mural"
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              {todayCompletedCount} {todayCompletedCount === 1 ? 'colega já resolveu hoje' : 'colegas já resolveram hoje'}
            </span>
          </button>
        )}
      </div>

      {/* Main Enunciado */}
      <div
        id="question-enunciado"
        className={`font-serif text-stone-900 leading-relaxed tracking-normal select-text space-y-4 ${bodyTextClass}`}
        dangerouslySetInnerHTML={{ __html: cleanEnunciado }}
      />

      {/* Alternatives List */}
      <div className="mt-8 space-y-3" role="radiogroup" aria-label="Alternativas">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            {isConfirmed
              ? isCorrectAnswer
                ? 'Sua resposta registrada:'
                : 'Resultado da verificação:'
              : 'Selecione a alternativa e confirme:'}
          </span>
          {!isConfirmed && tentativeLetter && (
            <span className="text-xs font-semibold text-blue-600 animate-pulse">
              Opção ({tentativeLetter}) selecionada
            </span>
          )}
        </div>

        {question.alternatives.map((alt: Alternative) => {
          const isTentative = tentativeLetter === alt.letter;
          const isSelected = selectedLetter === alt.letter;
          const isCorrect = alt.letter === question.correctLetter;
          const isEliminated = eliminatedLetters.includes(alt.letter);

          let btnClass = 'border-stone-200 hover:border-stone-300 bg-stone-50/60 text-stone-800';
          let letterClass = 'bg-stone-200 text-stone-700';

          if (isEliminated && !isConfirmed) {
            // Alternativa já descartada anteriormente por erro
            btnClass = 'opacity-45 bg-stone-100/60 border-stone-200 text-stone-400 cursor-not-allowed line-through';
            letterClass = 'bg-stone-200 text-stone-400 line-through';
          } else if (!isConfirmed) {
            // Estado de pré-verificação (apenas selecionada)
            if (isTentative) {
              btnClass = 'border-blue-500 bg-blue-50/70 text-blue-950 ring-2 ring-blue-500/20 shadow-xs';
              letterClass = 'bg-blue-600 text-white shadow-xs';
            }
          } else {
            // Estado pós-verificação:
            if (isSelected) {
              if (isCorrect) {
                // ACERTOU: Fica verde vibrante
                btnClass = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-500/20';
                letterClass = 'bg-emerald-600 text-white';
              } else {
                // ERROU: Destaca em tom de alerta suave (SEM REVELAR A CORRETA!)
                btnClass = 'border-amber-400 bg-amber-50/80 text-amber-950 ring-2 ring-amber-400/20';
                letterClass = 'bg-amber-600 text-white';
              }
            } else {
              // As demais alternativas mantêm discrição (SEM SPOILER DE VERDE DA CORRETA)
              btnClass = 'opacity-50 border-stone-200 bg-stone-50/30 text-stone-400';
            }
          }

          return (
            <button
              key={alt.letter}
              id={`alt-${alt.letter.toLowerCase()}-button`}
              type="button"
              role="radio"
              aria-checked={isTentative}
              disabled={isConfirmed || (isEliminated && !isConfirmed)}
              onClick={() => handleSelectAlternative(alt.letter)}
              className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                isConfirmed || isEliminated
                  ? 'cursor-default'
                  : 'cursor-pointer hover:translate-x-0.5'
              } ${btnClass}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 transition-colors ${letterClass}`}
              >
                {alt.letter}
              </div>

              <div
                className="flex-1 text-[15px] sm:text-[16px] leading-relaxed pt-0.5 text-stone-900"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(alt.value),
                }}
              />

              {/* Indicadores Visuais */}
              {!isConfirmed && isTentative && (
                <div className="shrink-0 pt-0.5 text-blue-600">
                  <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  </div>
                </div>
              )}

              {/* Ícone de descartada na rodada anterior */}
              {!isConfirmed && isEliminated && (
                <div className="shrink-0 pt-0.5 text-stone-400 font-semibold text-xs flex items-center gap-1">
                  <span>Descartada</span>
                </div>
              )}

              {/* Ícone do veredito pós-clique */}
              {isConfirmed && isSelected && (
                <div className="shrink-0 pt-0.5">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Botão de Ação: "Verificar Resposta" (antes de confirmar) */}
      {!isConfirmed && (
        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-500 text-center sm:text-left">
            {eliminatedLetters.length > 0 ? (
              <span>
                Você já descartou {eliminatedLetters.length}{' '}
                {eliminatedLetters.length === 1 ? 'opção' : 'opções'}. Escolha outra e verifique.
              </span>
            ) : tentativeLetter ? (
              'Pronto para testar seu raciocínio? Clique em verificar abaixo.'
            ) : (
              'Clique em uma das alternativas acima para habilitar o botão.'
            )}
          </p>

          <button
            type="button"
            disabled={!tentativeLetter}
            onClick={handleConfirm}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
              tentativeLetter
                ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md shadow-blue-500/20 cursor-pointer transform hover:-translate-y-0.5'
                : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Verificar Resposta</span>
          </button>
        </div>
      )}

      {/* Feedback Alert pedagógico (após confirmação) */}
      <AnimatePresence>
        {isConfirmed && selectedAlternative && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-6 p-4 sm:p-5 rounded-xl border ${
              isCorrectAnswer
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/90 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCorrectAnswer ? (
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold">
                    {isCorrectAnswer
                      ? 'Parabéns! Você acertou a resposta.'
                      : 'Ops, ainda não é essa alternativa!'}
                  </h4>
                </div>

                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {isCorrectAnswer
                    ? selectedAlternative.explanation || 'Excelente raciocínio! Resposta correta registrada.'
                    : selectedAlternative.explanation ||
                      'Não desanime! Reveja os dados do enunciado ou consulte a primeira dica abaixo para identificar onde o cálculo divergiu.'}
                </p>

                {/* Botões de Ação Pedagógica */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {/* Se errou: Oferece Recalcular e Consultar Dica */}
                  {!isCorrectAnswer && (
                    <>
                      <button
                        type="button"
                        onClick={handleTryRecalculate}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Recalcular e tentar de novo</span>
                      </button>

                      <button
                        type="button"
                        onClick={onScrollToHints}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>Ver Dica de Resolução</span>
                        <ArrowDown className="w-3 h-3 text-stone-400" />
                      </button>
                    </>
                  )}

                  {/* Se acertou: Botão de ver resolução completa */}
                  {isCorrectAnswer && (
                    <button
                      type="button"
                      onClick={onScrollToHints}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>Ver resolução completa comentada</span>
                      <ArrowDown className="w-3.5 h-3.5 text-stone-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};
