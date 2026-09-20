import React from 'react';
import { Settings, Flame, Target, Users } from 'lucide-react';
import { StudentProfile } from '../types';

interface HeaderProps {
  fontSize: 'normal' | 'large';
  onToggleFontSize: () => void;
  onOpenAdmin: () => void;
  studentProfile: StudentProfile | null;
  nickname: string;
  onOpenNickModal: () => void;
  onOpenMural: () => void;
  showAdminButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fontSize,
  onToggleFontSize,
  onOpenAdmin,
  studentProfile,
  nickname,
  onOpenNickModal,
  onOpenMural,
  showAdminButton = false,
}) => {
  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 transition-colors">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2 sm:py-0 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Company brand & Student Greeting */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-stone-900 text-sm sm:text-base tracking-tight truncate">
              Yes Matemática
            </span>
          </div>

          {/* Saudação com Apelido e Status do Aluno (Sempre visível inclusive no celular) */}
          {nickname && (
            <div className="flex items-center gap-1 sm:gap-2 text-[11px] text-stone-500 truncate mt-0.5">
              <button
                type="button"
                onClick={onOpenNickModal}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline max-w-[75px] sm:max-w-[120px] truncate cursor-pointer shrink-0"
                title="Clique para alterar seu apelido"
              >
                {nickname}
              </button>
              {studentProfile && (
                <span className="inline-flex items-center gap-1 sm:gap-1.5 text-stone-600 font-semibold shrink-0">
                  <span className="text-amber-600 inline-flex items-center gap-0.5" title="Sua ofensiva de dias seguidos">
                    <Flame className="w-3 h-3 fill-amber-500" />
                    {studentProfile.streakDays || 0}d
                  </span>
                  <span className="text-stone-300">•</span>
                  {/* Caixinha com a meta de questões (Preservada e visível em todos os celulares) */}
                  <span
                    className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded text-[10px] sm:text-[10.5px] font-bold shrink-0"
                    title={
                      studentProfile.totalSolved >= 3
                        ? `Total: ${studentProfile.totalSolved} questões feitas`
                        : `Meta: ${studentProfile.totalSolved}/3 questões feitas`
                    }
                  >
                    <Target className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600 shrink-0" />
                    <span>
                      {studentProfile.totalSolved >= 3
                        ? `${studentProfile.totalSolved} feitas`
                        : `${studentProfile.totalSolved}/3`}
                    </span>
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mural da Turma Button */}
          <button
            type="button"
            onClick={onOpenMural}
            title="Ver Mural da Turma"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden xs:inline">Mural</span>
          </button>

          {/* Professor / Admin button (Visível apenas para o professor via URL secreta ?admin=1) */}
          {showAdminButton && (
            <button
              id="admin-open-btn"
              type="button"
              onClick={onOpenAdmin}
              title="Painel do Professor (Trocar questão e gerar mensagens de WhatsApp)"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Painel</span>
            </button>
          )}

          {/* Font Size Toggle */}
          <button
            id="font-size-toggle-btn"
            type="button"
            onClick={onToggleFontSize}
            title={fontSize === 'normal' ? 'Aumentar tamanho do texto' : 'Tamanho de texto normal'}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-md transition-colors cursor-pointer"
          >
            <span className="text-[10px] text-stone-500">A</span>
            <span className="text-xs sm:text-sm font-bold">A</span>
          </button>
        </div>
      </div>
    </header>
  );
};
