import React, { useState } from 'react';
import { RotateCcw, Share2, Check, Settings, Flame, Target, Users } from 'lucide-react';
import { StudentProfile } from '../types';

interface HeaderProps {
  onReset: () => void;
  fontSize: 'normal' | 'large';
  onToggleFontSize: () => void;
  onOpenAdmin: () => void;
  studentProfile: StudentProfile | null;
  nickname: string;
  onOpenNickModal: () => void;
  onOpenMural: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  fontSize,
  onToggleFontSize,
  onOpenAdmin,
  studentProfile,
  nickname,
  onOpenNickModal,
  onOpenMural,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 transition-colors">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Company brand & Student Greeting */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-2xs shrink-0">
            Y
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-stone-900 text-sm sm:text-base tracking-tight truncate">
                Yes Matemática
              </span>
            </div>

            {/* Saudação com Apelido e Status do Aluno */}
            {nickname && (
              <div className="flex items-center gap-2 text-[11px] text-stone-500 truncate">
                <button
                  type="button"
                  onClick={onOpenNickModal}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline truncate cursor-pointer"
                  title="Clique para alterar seu apelido"
                >
                  {nickname}
                </button>
                {studentProfile && (
                  <span className="inline-flex items-center gap-1.5 text-stone-600 font-semibold shrink-0">
                    <span className="text-amber-600 inline-flex items-center gap-0.5" title="Sua ofensiva de dias seguidos">
                      <Flame className="w-3 h-3 fill-amber-500" />
                      {studentProfile.streakDays || 0}d
                    </span>
                    <span>•</span>
                    <span
                      className="text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded text-[10.5px] font-bold inline-flex items-center gap-1"
                      title={
                        studentProfile.totalSolved >= 3
                          ? `Total: ${studentProfile.totalSolved} questões feitas`
                          : `1ª Meta: ${studentProfile.totalSolved}/3 questões feitas`
                      }
                    >
                      <Target className="w-3 h-3 text-blue-600" />
                      {studentProfile.totalSolved >= 3
                        ? `Meta: ${studentProfile.totalSolved} feitas`
                        : `1ª Meta: ${studentProfile.totalSolved}/3 questões feitas`}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mural da Turma Button */}
          <button
            type="button"
            onClick={onOpenMural}
            title="Ver Mural da Turma"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Mural</span>
          </button>

          {/* Professor / Admin button */}
          <button
            id="admin-open-btn"
            type="button"
            onClick={onOpenAdmin}
            title="Painel do Professor (Trocar questão e gerar mensagens de WhatsApp)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Professor</span>
          </button>

          {/* Font Size Toggle */}
          <button
            id="font-size-toggle-btn"
            type="button"
            onClick={onToggleFontSize}
            title={fontSize === 'normal' ? 'Aumentar tamanho do texto' : 'Tamanho de texto normal'}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors cursor-pointer"
          >
            <span className="text-[11px] text-stone-500">A</span>
            <span className="text-sm font-bold">A</span>
          </button>

          {/* Share button */}
          <button
            id="share-button"
            type="button"
            onClick={handleCopyLink}
            title="Copiar link da questão"
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
          </button>

          {/* Reset button */}
          <button
            id="reset-page-button"
            type="button"
            onClick={onReset}
            title="Reiniciar questão"
            className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
