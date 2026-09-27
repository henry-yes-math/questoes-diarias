import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Flame, ArrowRight, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ShieldRescueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionClick?: () => void;
  streakDays: number;
  remainingShields: number;
  isAlreadyResolvedToday?: boolean;
  missedDays?: number;
  shieldsUsed?: number;
}

export const ShieldRescueModal: React.FC<ShieldRescueModalProps> = ({
  isOpen,
  onClose,
  onActionClick,
  streakDays,
  remainingShields,
  isAlreadyResolvedToday = false,
  missedDays = 1,
  shieldsUsed = 1,
}) => {
  if (!isOpen) return null;

  const handleAction = () => {
    onClose();
    if (onActionClick) {
      onActionClick();
    }
  };

  const isTwoDaysAbsence = missedDays >= 2 || shieldsUsed >= 2;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop escurecido suave */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs"
        />

        {/* Card Central */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 p-6 sm:p-7 text-center overflow-hidden z-10 font-sans"
        >
          {/* Botão de Fechar no canto */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Ícone de Escudo em destaque com brilho */}
          <div className="relative inline-flex items-center justify-center mx-auto mb-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200/90 flex items-center justify-center text-blue-600 shadow-inner">
              <Shield className="w-8 h-8 fill-blue-500 text-blue-600" />
            </div>
            <div className="absolute -top-1 -right-1 bg-amber-400 text-stone-900 rounded-full p-1 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            </div>
          </div>

          {/* Título Principal de Alívio */}
          <h3 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Ufa! Sua chama continua viva!
          </h3>

          <p className="text-stone-600 text-sm mt-2 leading-relaxed">
            {isTwoDaysAbsence ? (
              <>
                Nos últimos <strong className="text-stone-900 font-bold">2 dias</strong> você não conseguiu aparecer, mas os seus{' '}
                <strong className="text-blue-700 font-semibold">2 Protetores de Ofensiva</strong> entraram em
                ação automaticamente para proteger a sua sequência.
              </>
            ) : (
              <>
                Ontem você não conseguiu aparecer, mas o seu{' '}
                <strong className="text-blue-700 font-semibold">Protetor de Ofensiva</strong> entrou em
                ação automaticamente para proteger o seu progresso.
              </>
            )}
          </p>

          {/* Caixa de destaque da Ofensiva Salva */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 my-4 flex items-center justify-center gap-2.5 shadow-2xs">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-amber-950">
              Sua sequência de <span className="text-amber-700 font-black">{streakDays} {streakDays === 1 ? 'dia' : 'dias'}</span> continua ativa!
            </span>
          </div>

          {/* Caixa adaptativa do Status dos Protetores */}
          <div className="mb-5 text-left rounded-xl p-3 text-xs leading-snug border transition-all bg-stone-50 border-stone-200">
            {!isAlreadyResolvedToday ? (
              // Antes de resolver hoje
              isTwoDaysAbsence ? (
                <div className="flex items-start gap-2 text-stone-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">2 Protetores acionados:</strong>{' '}
                    Seus 2 protetores estão cobrindo suas faltas dos últimos 2 dias. Resolva a questão agora para confirmar sua presença e não perder a ofensiva!
                  </div>
                </div>
              ) : remainingShields >= 2 ? (
                <div className="flex items-start gap-2 text-stone-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">2 Protetores guardados:</strong>{' '}
                    1 protetor cobriu a sua falta de ontem. Ao resolver a questão de hoje, você ainda terá{' '}
                    <strong className="text-blue-700 font-bold">1 protetor de reserva</strong> ativo!
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-stone-700">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">Seu protetor foi acionado:</strong>{' '}
                    Ele está segurando sua chama hoje. Resolva a questão agora para confirmar sua presença e não perder a ofensiva!
                  </div>
                </div>
              )
            ) : (
              // Se já tiver resolvido hoje
              isTwoDaysAbsence ? (
                <div className="flex items-start gap-2 text-stone-700">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">2 Protetores consumidos:</strong>{' '}
                    Seus 2 protetores cobriram os 2 dias de ausência e sua chama foi salva! Continue firme para acumular novos protetores a cada 7 dias de ofensiva.
                  </div>
                </div>
              ) : remainingShields >= 1 ? (
                <div className="flex items-start gap-2 text-stone-700">
                  <Shield className="w-4 h-4 text-blue-600 fill-blue-500/20 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">1 Protetor consumido:</strong>{' '}
                    Sua falta de ontem foi salva e você ainda possui{' '}
                    <strong className="text-blue-700 font-bold">{remainingShields} {remainingShields === 1 ? 'protetor de reserva ativo' : 'protetores de reserva ativos'}</strong>.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-stone-700">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">Sem protetores restantes:</strong>{' '}
                    Seu último protetor cobriu o dia anterior. Continue firme para acumular novos protetores a cada 7 dias de ofensiva!
                  </div>
                </div>
              )
            )}
          </div>

          {/* Botão de Ação Imediata (CTA) */}
          <button
            type="button"
            onClick={handleAction}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <span>{isAlreadyResolvedToday ? 'Continuar Estudando' : 'Resolver a Questão de Hoje Agora'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Dica de rodapé */}
          <p className="text-[11px] text-stone-400 mt-3">
            Cada Protetor de Ofensiva protege 1 dia de imprevisto (acumule até 2 protetores para cobrir até 2 dias seguidos).
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
