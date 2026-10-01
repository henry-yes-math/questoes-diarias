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
            Ufa! O seu escudo salvou o seu fogo! 🔥🛡️
          </h3>

          <p className="text-stone-600 text-sm mt-2 leading-relaxed">
            {isTwoDaysAbsence ? (
              <>
                Você ficou <strong className="text-stone-900 font-bold">2 dias</strong> sem entrar, mas os seus{' '}
                <strong className="text-blue-700 font-semibold">2 Escudos de Ofensiva</strong> seguraram
                a sua sequência para o seu fogo não apagar!
              </>
            ) : (
              <>
                Você não conseguiu entrar ontem, mas o seu{' '}
                <strong className="text-blue-700 font-semibold">Escudo de Ofensiva</strong> entrou em
                ação para a sua sequência não zerar.
              </>
            )}
          </p>

          {/* Caixa de destaque da Ofensiva Salva */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-3.5 my-4 flex items-center justify-center gap-2.5 shadow-2xs">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-amber-950">
              Sua ofensiva de <span className="text-amber-700 font-black">{streakDays} {streakDays === 1 ? 'dia' : 'dias'}</span> continua viva!
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
                    <strong className="font-bold text-stone-900">⚠️ Seus 2 escudos entraram em ação:</strong>{' '}
                    Eles cobriram suas 2 faltas. Resolva a questão de hoje para não deixar o fogo apagar!
                  </div>
                </div>
              ) : remainingShields >= 2 ? (
                <div className="flex items-start gap-2 text-stone-700">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">🛡️ 1 escudo usado, 1 ainda guardado:</strong>{' '}
                    Um escudo cobriu ontem. Ao resolver a questão de hoje, você continuará com{' '}
                    <strong className="text-blue-700 font-bold">1 escudo de reserva</strong> para emergências.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-stone-700">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">⚠️ Atenção para hoje:</strong>{' '}
                    Seu escudo cobriu o dia de ontem. Resolva a questão de hoje agora para não perder sua ofensiva!
                  </div>
                </div>
              )
            ) : (
              // Se já tiver resolvido hoje
              isTwoDaysAbsence ? (
                <div className="flex items-start gap-2 text-stone-700">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">✅ Salvo no limite!</strong>{' '}
                    Seus 2 escudos salvaram seus 2 dias de ausência. Continue firme para acumular novos escudos a cada 7 dias de ofensiva.
                  </div>
                </div>
              ) : remainingShields >= 1 ? (
                <div className="flex items-start gap-2 text-stone-700">
                  <Shield className="w-4 h-4 text-blue-600 fill-blue-500/20 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">✅ Ofensiva garantida!</strong>{' '}
                    O escudo salvou ontem e você ainda tem{' '}
                    <strong className="text-blue-700 font-bold">{remainingShields} {remainingShields === 1 ? 'escudo de reserva guardado' : 'escudos de reserva guardados'}</strong>.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-stone-700">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold text-stone-900">✅ Ofensiva garantida!</strong>{' '}
                    Seu escudo salvou a falta de ontem. Como você gastou seu último escudo, continue firme: você ganha um novo escudo a cada 7 dias de ofensiva.
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
            💡 <strong>Como funciona:</strong> cada Escudo de Ofensiva protege 1 dia esquecido. Você pode acumular até 2 escudos.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
