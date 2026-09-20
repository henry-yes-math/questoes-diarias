import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DOMPurify from 'dompurify';
import {
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  BookOpen,
  Flame,
  Check
} from 'lucide-react';
import { PedagogicalStep } from '../types';

interface DynamicHintsSectionProps {
  steps: PedagogicalStep[];
  unlockedStepIds: Set<string>;
  onUnlockStep: (id: string) => void;
  onUnlockNext: () => void;
  onUnlockAll: () => void;
  onCollapseAll: () => void;
  fontSize: 'normal' | 'large';
  correctLetter?: 'A' | 'B' | 'C' | 'D' | 'E';
  selectedLetter?: string | null;
  onConfirmAnswer?: (letter: string) => void;
}

/**
 * Divide o HTML da conclusão/resposta para posicionar a caixa de validação
 * IMEDIATAMENTE após a menção da alternativa correta (ex: "Alternativa C", "Gabarito: C", etc).
 */
function splitHtmlAtAlternative(
  html: string,
  targetLetter: string
): { beforeHtml: string; afterHtml: string } | null {
  if (!html || !targetLetter) return null;

  // Regex para encontrar parágrafo ou bloco contendo "Alternativa [A-E]" ou "Letra [A-E]" ou "Gabarito [A-E]"
  const pattern = new RegExp(
    `(<(?:p|div|h[1-6])[^>]*>\\s*(?:<[^>]*>)*\\s*(?:Alternativa|Letra|Gabarito)\\s*[:\-–—]?\\s*(?:<[^>]*>)*\\s*${targetLetter}\\b[\\s\\S]*?<\\/(?:p|div|h[1-6])>)`,
    'i'
  );

  const match = html.match(pattern);
  if (match && match.index !== undefined) {
    const cutIndex = match.index + match[0].length;
    return {
      beforeHtml: html.slice(0, cutIndex),
      afterHtml: html.slice(cutIndex),
    };
  }

  // Se não encontrar tag fechada exata, tenta encontrar no texto direto
  const simplePattern = new RegExp(
    `(?:Alternativa|Letra|Gabarito)\\s*[:\-–—]?\\s*(?:<[^>]*>)*\\s*${targetLetter}\\b(?:<\\/[^>]*>)*`,
    'i'
  );
  const simpleMatch = html.match(simplePattern);
  if (simpleMatch && simpleMatch.index !== undefined) {
    // Procura o próximo fechamento de tag </p> ou </div> ou <br>
    const tail = html.slice(simpleMatch.index);
    const closeTagMatch = tail.match(/<\/(?:p|div|h[1-6])>|<br\s*\/?>/i);
    const offset = closeTagMatch && closeTagMatch.index !== undefined
      ? closeTagMatch.index + closeTagMatch[0].length
      : simpleMatch[0].length;
    const cutIndex = simpleMatch.index + offset;
    return {
      beforeHtml: html.slice(0, cutIndex),
      afterHtml: html.slice(cutIndex),
    };
  }

  return null;
}

export const HintsSection: React.FC<DynamicHintsSectionProps> = ({
  steps,
  unlockedStepIds,
  onUnlockStep,
  onUnlockNext,
  onUnlockAll,
  onCollapseAll,
  fontSize,
  correctLetter,
  selectedLetter,
  onConfirmAnswer
}) => {
  const allUnlocked = steps.length > 0 && steps.every((s) => unlockedStepIds.has(s.id));
  const anyUnlocked = steps.some((s) => unlockedStepIds.has(s.id));

  const bodyTextClass =
    fontSize === 'large'
      ? 'text-[18px] leading-[1.8]'
      : 'text-[16px] leading-[1.72]';

  // If no hints are open yet, show a clean trigger
  if (!anyUnlocked) {
    return (
      <section id="hints-section" className="pt-2 pb-4 text-center">
        <button
          id="open-hints-trigger-btn"
          type="button"
          onClick={onUnlockNext}
          className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white hover:bg-[#f4f1ea] text-stone-700 text-sm font-semibold border border-[#eae6dd] transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
        >
          <Lightbulb className="w-4 h-4 text-amber-600 group-hover:rotate-12 transition-transform" />
          <span>Precisa de ajuda? Abrir resolução passo a passo ({steps.length} etapas)</span>
          <ChevronDown className="w-4 h-4 text-stone-400 group-hover:translate-y-0.5 transition-transform" />
        </button>
        <p className="text-xs text-stone-400 mt-2 font-normal">
          Dicas graduais para você exercitar o raciocínio antes de ver a resposta
        </p>
      </section>
    );
  }

  return (
    <section id="hints-section" className="space-y-6 pt-2">
      {/* Section Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/70 pb-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 tracking-tight">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            Resolução Passo a Passo
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tente pensar em cada etapa antes de avançar para a próxima dica
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onCollapseAll}
            className="text-xs font-medium text-stone-600 hover:text-stone-900 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Recolher
          </button>
          <button
            type="button"
            onClick={allUnlocked ? onCollapseAll : onUnlockAll}
            className="text-xs font-medium text-[#44403c] hover:text-[#1c1917] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#dcd8ce] shadow-2xs hover:bg-[#f5f4f0] transition-colors cursor-pointer"
          >
            {allUnlocked ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                <span>Ocultar todas</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>Revelar tudo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-5">
        {steps.map((step, idx) => {
          const isUnlocked = unlockedStepIds.has(step.id);
          const isNextInLine =
            !isUnlocked &&
            (idx === 0 || unlockedStepIds.has(steps[idx - 1].id));

          const cleanHtml = DOMPurify.sanitize(step.htmlContent, {
            ADD_TAGS: ['figure', 'figcaption', 'annotation', 'semantics', 'math', 'mrow', 'mfrac', 'mn', 'mi', 'mo', 'mspace', 'msup', 'msub', 'msqrt', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'iframe'],
            ADD_ATTR: ['src', 'alt', 'srcset', 'sizes', 'class', 'width', 'height', 'aria-hidden', 'encoding', 'style', 'title', 'frameborder', 'allow', 'allowfullscreen', 'referrerpolicy']
          });

          // Style based on step type
          const isResolution =
            step.type === 'resolution' ||
            step.title?.toLowerCase().includes('resposta') ||
            step.title?.toLowerCase().includes('conclusão') ||
            idx === steps.length - 1;
          const isHintRes = step.type === 'hint-resolution';

          let iconBg = 'bg-[#f5f4f0] border-[#e7e5df] text-[#1c1917]';
          let borderStyle = isUnlocked ? 'bg-white border-[#eae6dd]' : 'bg-[#faf9f6]/70 border-stone-200/70';

          if (isResolution && isUnlocked) {
            iconBg = 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]';
            borderStyle = 'bg-white border-[#a7f3d0] ring-1 ring-[#10b981]/20 shadow-[0_2px_14px_rgba(16,185,129,0.04)]';
          } else if (isHintRes && isUnlocked) {
            iconBg = 'bg-amber-50 border-amber-200 text-amber-900';
          }

          return (
            <div
              key={step.id}
              id={`step-card-${step.id}`}
              className={`rounded-2xl border transition-all shadow-[0_2px_14px_rgba(0,0,0,0.02)] overflow-hidden ${borderStyle}`}
            >
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border shrink-0 ${iconBg}`}
                    >
                      {isResolution ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isHintRes ? (
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        step.stepNumber || idx + 1
                      )}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-[#1c1917]">
                        {step.title}
                      </h3>
                      {step.subtitle && (
                        <p className="text-xs text-[#78716c]">{step.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {!isUnlocked && (
                    <button
                      type="button"
                      onClick={() => onUnlockStep(step.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs ${
                        isNextInLine
                          ? 'bg-[#334155] text-white hover:bg-[#1e293b]'
                          : 'bg-[#f5f4f0] text-[#57534e] hover:bg-[#edece8] border border-stone-300'
                      }`}
                    >
                      <span>Ver {step.title}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {isUnlocked && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-6 pt-5 border-t border-[#ece9e2] space-y-4 text-[#292524] ${bodyTextClass} font-sans`}
                    >
                      {/* Se for etapa de resolução, insere o botão imediatamente após o anúncio da alternativa */}
                      {(() => {
                        if (!isResolution || !correctLetter || !onConfirmAnswer) {
                          return (
                            <div
                              className="prose-content space-y-3"
                              dangerouslySetInnerHTML={{ __html: cleanHtml }}
                            />
                          );
                        }

                        const split = splitHtmlAtAlternative(cleanHtml, correctLetter);

                        const validationCard = (
                          <div className="py-2.5 my-3 border-y border-emerald-100/80">
                            {selectedLetter === correctLetter ? (
                              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>Alternativa {correctLetter} confirmada! Sua ofensiva de hoje foi computada com sucesso.</span>
                              </div>
                            ) : (
                              <div className="bg-amber-50/95 border border-amber-300/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700 mt-0.5 shrink-0">
                                    <Flame className="w-4 h-4 fill-amber-500 text-amber-600 animate-pulse" />
                                  </span>
                                  <div>
                                    <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                                      Valide sua ofensiva agora mesmo!
                                    </h4>
                                    <p className="text-xs text-amber-900 leading-relaxed mt-0.5">
                                      A alternativa correta é <strong>{correctLetter}</strong>. Clique no botão abaixo para registrar sua resposta e computar sua presença no mural da turma:
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onConfirmAnswer(correctLetter)}
                                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer group"
                                >
                                  <Flame className="w-4 h-4 fill-amber-400 text-amber-400 group-hover:scale-110 transition-transform" />
                                  <span>Confirmar Alternativa {correctLetter} e Validar Ofensiva de Hoje</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );

                        if (split) {
                          return (
                            <div className="prose-content space-y-3">
                              <div dangerouslySetInnerHTML={{ __html: split.beforeHtml }} />
                              {validationCard}
                              {split.afterHtml && (
                                <div dangerouslySetInnerHTML={{ __html: split.afterHtml }} />
                              )}
                            </div>
                          );
                        }

                        // Caso não ache padrão no meio, exibe o HTML e o botão logo a seguir
                        return (
                          <div className="prose-content space-y-3">
                            {validationCard}
                            <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
                          </div>
                        );
                      })()}

                      {/* If next step is still locked, show quick next step button */}
                      {idx < steps.length - 1 && !unlockedStepIds.has(steps[idx + 1].id) && (
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onUnlockStep(steps[idx + 1].id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#334155] text-white hover:bg-[#1e293b] transition-colors cursor-pointer shadow-2xs"
                          >
                            <span>Ir para {steps[idx + 1].title}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
