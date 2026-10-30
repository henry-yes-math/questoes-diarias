import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { generateGroupShareWhatsAppUrl, resolveWhatsappGroupUrl } from '../utils/gamification';

interface ShareChallengeCardProps {
  whatsappGroupUrl?: string;
  className?: string;
}

/**
 * Componente unificado para convidar amigos e grupos de estudo a participarem
 * do grupo do WhatsApp. Utilizado na Celebração, no Mural e no Final da Resolução.
 */
export const ShareChallengeCard: React.FC<ShareChallengeCardProps> = ({
  whatsappGroupUrl,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupInviteUrl = resolveWhatsappGroupUrl(whatsappGroupUrl);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyGroupLink = async () => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    try {
      await navigator.clipboard.writeText(groupInviteUrl);
    } catch {
      // Fallback silencioso caso a permissão da área de transferência falhe
    }
    setCopied(true);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className={`bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-2xs ${className}`}
    >
      <div>
        <div className="flex items-center gap-1.5 text-emerald-950 font-extrabold text-xs sm:text-sm">
          <span className="text-sm">🤝</span>
          <span className="uppercase tracking-wide">
            TEM AMIGOS QUE TAMBÉM VÃO FAZER O ENEM?
          </span>
        </div>
        <p className="text-xs text-emerald-900 font-medium mt-0.5">
          Chame para o nosso grupo do WhatsApp:
        </p>
      </div>

      {/* Prévia do Balãozinho de Mensagem */}
      <div className="bg-white border border-emerald-200/90 rounded-xl p-3 text-xs text-stone-700 leading-relaxed shadow-2xs">
        <p>
          Tô participando desse grupo de Matemática pro ENEM e tá valendo muito a pena. Todo dia a gente resolve 1 questão que tem alto peso no TRI, com dicas passo a passo se precisar.
        </p>
        <p className="mt-2 font-medium text-stone-800">
          Link para entrar:
          <br />
          <span className="text-emerald-700 font-semibold break-all">
            {groupInviteUrl}
          </span>
        </p>
      </div>

      {/* Botões de Ação: Enviar no WhatsApp + Copiar Link do Grupo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={generateGroupShareWhatsAppUrl(groupInviteUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 text-xs sm:text-sm text-center group cursor-pointer whitespace-nowrap"
        >
          <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zM12.04 20.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.01 4.54-3.68 8.23-8.22 8.23z" />
          </svg>
          <span>Enviar no WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </a>

        <button
          type="button"
          onClick={handleCopyGroupLink}
          className={`w-full py-2.5 px-3.5 font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 text-xs sm:text-sm text-center cursor-pointer whitespace-nowrap border ${
            copied
              ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
              : 'bg-white hover:bg-emerald-50/70 active:bg-emerald-100/60 border-emerald-300 text-emerald-900'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Link Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Copiar Link do Grupo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

