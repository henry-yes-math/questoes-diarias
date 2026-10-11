import React from 'react';
import { ExternalLink } from 'lucide-react';
import { generateGroupShareWhatsAppUrl } from '../utils/gamification';

interface ShareChallengeCardProps {
  whatsappGroupUrl?: string;
  className?: string;
}

/**
 * Componente unificado para convidar amigos e grupos de estudo a participarem
 * do Desafio de Matemática do ENEM. Utilizado na Celebração, no Mural e no Final da Resolução.
 */
export const ShareChallengeCard: React.FC<ShareChallengeCardProps> = ({
  whatsappGroupUrl,
  className = '',
}) => {
  return (
    <div
      className={`bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold text-xs sm:text-sm">
        <span className="text-sm">📚</span>
        <span className="uppercase tracking-wider">FORTALEÇA SUA GALERA</span>
      </div>

      <p className="text-xs text-emerald-950 font-medium leading-relaxed">
        Mande o desafio nos seus grupos de estudo e ajude seus amigos com 3 minutinhos de treino diário pro ENEM!
      </p>

      <a
        href={generateGroupShareWhatsAppUrl(whatsappGroupUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 text-xs sm:text-sm text-center group cursor-pointer"
      >
        <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23z" />
        </svg>
        <span>Mandar nos Meus Grupos de Estudo</span>
        <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" />
      </a>
    </div>
  );
};
