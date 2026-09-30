import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, X, CheckCircle2 } from 'lucide-react';

interface ReferralRewardToastProps {
  friendName: string | null;
  onDismiss: () => void;
}

export const ReferralRewardToast: React.FC<ReferralRewardToastProps> = ({
  friendName,
  onDismiss,
}) => {
  if (!friendName) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="pointer-events-auto bg-white rounded-2xl border-2 border-emerald-400 shadow-2xl p-4 sm:p-5 relative overflow-hidden"
        >
          {/* Brilho decorativo suave */}
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-300/30 rounded-full blur-xl pointer-events-none" />

          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs relative">
              <Shield className="w-6 h-6 fill-emerald-500/20 text-emerald-600" />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">
                +1
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Bônus de Convite Ativado!</span>
              </div>

              <h4 className="text-sm font-bold text-stone-900 leading-tight">
                🎉 Tudo certo! <span className="text-emerald-700">{friendName}</span> acabou de concluir a questão pelo seu convite!
              </h4>

              <p className="text-xs text-stone-600 leading-relaxed pt-0.5">
                🛡️ <strong>Seu Escudo Anti-Falta foi ativado!</strong> Se acontecer algum imprevisto, sua chama de ofensiva estará protegida.
              </p>

              <div className="pt-2">
                <button
                  onClick={onDismiss}
                  type="button"
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Entendido, obrigado!</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
