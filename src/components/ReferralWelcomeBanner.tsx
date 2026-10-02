import React from 'react';
import { Sparkles, X, Compass } from 'lucide-react';

interface ReferralWelcomeBannerProps {
  referrerName: string;
  onDismiss?: () => void;
}

export const ReferralWelcomeBanner: React.FC<ReferralWelcomeBannerProps> = ({
  referrerName,
  onDismiss,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-sm transition-all animate-in fade-in slide-in-from-top-3 duration-500">
      {/* Detalhe de fundo suave */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-200/30 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-start gap-3 sm:gap-4 relative z-10">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
          <Compass className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="flex-1 pr-6 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Desafio de {referrerName}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal">
            <strong className="font-semibold text-stone-900">{referrerName}</strong> te desafiou a acertar a questão de matemática de hoje do Enem. Tenta resolver aí (leva uns 3 min e tem dicas se travar)! 👇
          </p>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-emerald-100/50 transition-colors"
            aria-label="Fechar aviso"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
