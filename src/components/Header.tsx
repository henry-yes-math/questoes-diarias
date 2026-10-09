import React, { useState, useRef, useEffect } from 'react';
import { Settings, Flame, Target, Users, Shield } from 'lucide-react';
import { StudentProfile } from '../types';
import { MILESTONES } from '../utils/gamification';

interface HeaderProps {
  onOpenAdmin: () => void;
  studentProfile: StudentProfile | null;
  nickname: string;
  onOpenNickModal: () => void;
  onOpenMural: () => void;
  showAdminButton?: boolean;
  isShieldProtecting?: boolean;
  onOpenShieldRescue?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAdmin,
  studentProfile,
  nickname,
  onOpenNickModal,
  onOpenMural,
  showAdminButton = false,
  isShieldProtecting = false,
  onOpenShieldRescue,
}) => {
  const [showShieldTooltip, setShowShieldTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showShieldTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowShieldTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShieldTooltip]);

  const totalSolved = studentProfile?.totalSolved || 0;
  const targetMilestone =
    MILESTONES.find((m) => m > totalSolved) || 3;
  const streakShields = studentProfile?.streakShields || 0;

  return (
    <header className="border-b border-stone-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 transition-colors">
      <div className="max-w-3xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Brand & Student Greeting */}
        <div className="flex flex-col justify-center min-w-0 leading-none">
          <span className="font-bold text-stone-900 text-[13px] sm:text-[15px] tracking-tight leading-tight truncate">
            Yes Matemática
          </span>

          {nickname && (
            <button
              type="button"
              onClick={onOpenNickModal}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-[11px] sm:text-xs truncate cursor-pointer max-w-[130px] sm:max-w-[180px] text-left leading-tight mt-0.5"
              title="Clique para alterar seu apelido"
            >
              {nickname}
            </button>
          )}
        </div>

        {/* Right: Gamification Hub & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {studentProfile && (
            <>
              {/* Ofensiva (Fogo) */}
              <span
                className="text-amber-600 font-semibold text-xs sm:text-sm inline-flex items-center gap-0.5 shrink-0"
                title="Sua ofensiva de dias seguidos"
              >
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                <span>{studentProfile.streakDays || 0}d</span>
              </span>

              {/* Protetor de Chama (Escudo) com tooltip interativo */}
              <div className="relative inline-flex items-center shrink-0" ref={tooltipRef}>
                <button
                  type="button"
                  onClick={() => setShowShieldTooltip((prev) => !prev)}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] cursor-pointer transition-all ${
                    isShieldProtecting
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold hover:bg-amber-200'
                      : streakShields > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-100 font-bold'
                      : 'bg-stone-100 text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 font-medium'
                  }`}
                  title={
                    isShieldProtecting
                      ? 'Seu escudo está salvando seu fogo hoje! Clique para ver'
                      : 'Escudo de Ofensiva: protege seus dias se você esquecer (Clique para ver)'
                  }
                  aria-label="Escudo de Ofensiva"
                >
                  <Shield
                    className={`w-3 h-3 ${
                      isShieldProtecting
                        ? 'fill-amber-500 text-amber-700'
                        : streakShields > 0
                        ? 'fill-blue-500 text-blue-600'
                        : 'text-stone-400'
                    }`}
                  />
                  <span>{streakShields}</span>
                </button>

                {showShieldTooltip && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[230px] sm:w-64 p-2.5 bg-stone-900 text-white rounded-lg shadow-xl text-[11px] leading-snug z-50 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <Shield
                        className={`w-3.5 h-3.5 ${
                          isShieldProtecting
                            ? 'fill-amber-400 text-amber-400'
                            : streakShields > 0
                            ? 'fill-blue-400 text-blue-400'
                            : 'text-stone-400'
                        }`}
                      />
                      <span>
                        {isShieldProtecting
                          ? 'Escudo em Ação Hoje!'
                          : streakShields > 0
                          ? `${streakShields} ${streakShields === 1 ? 'Escudo de Ofensiva' : 'Escudos de Ofensiva'}`
                          : 'Sem Escudo Ativo'}
                      </span>
                    </div>
                    <p className="text-stone-300">
                      {isShieldProtecting
                        ? 'Você não entrou ontem, mas seu escudo segurou seu fogo! Resolva a questão de hoje para não zerar sua ofensiva.'
                        : streakShields > 0
                        ? `Se você esquecer de entrar algum dia, o escudo é usado automaticamente e seu fogo não apaga (protege ${
                            streakShields === 1 ? '1 dia de imprevisto' : 'até 2 dias seguidos de imprevisto'
                          }).`
                        : totalSolved < 2
                        ? 'Complete 2 questões para ganhar seu 1º Escudo e proteger seu fogo de imprevistos.'
                        : 'Ganhe novos escudos a cada 7 dias seguidos ou convidando amigos no WhatsApp.'}
                    </p>
                    {isShieldProtecting && onOpenShieldRescue && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowShieldTooltip(false);
                          onOpenShieldRescue();
                        }}
                        className="mt-2 w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded cursor-pointer transition-colors text-center shadow-xs"
                      >
                        Ver aviso de resgate da chama
                      </button>
                    )}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-stone-900 rotate-45" />
                  </div>
                )}
              </div>

              {/* Caixinha empilhada com meta e progresso de questões */}
              <span
                className="inline-flex items-center gap-1 sm:gap-1.5 bg-sky-50/90 border border-sky-200/80 px-1.5 sm:px-2 py-0.5 rounded-lg shrink-0 shadow-2xs"
                title={`Meta atual: ${targetMilestone} questões. Você já concluiu ${totalSolved} ${
                  totalSolved === 1 ? 'questão' : 'questões'
                }.`}
              >
                <Target className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-[7.5px] sm:text-[8px] font-bold text-sky-600 tracking-wider uppercase">
                    Meta: {targetMilestone}
                  </span>
                  <span className="text-[9.5px] sm:text-[10.5px] font-extrabold text-sky-950">
                    {totalSolved} {totalSolved === 1 ? 'resolvida' : 'resolvidas'}
                  </span>
                </span>
              </span>
            </>
          )}

          {/* Mural da Turma Button (Apenas ícone no mobile, com texto a partir do sm) */}
          <button
            type="button"
            onClick={onOpenMural}
            title="Ver Mural da Turma"
            className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer shrink-0"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Mural</span>
          </button>

          {/* Professor / Admin button (Visível apenas para o professor via URL secreta ?admin=1) */}
          {showAdminButton && (
            <button
              id="admin-open-btn"
              type="button"
              onClick={onOpenAdmin}
              title="Painel do Professor (Trocar questão e gerar mensagens de WhatsApp)"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer shadow-2xs shrink-0"
            >
              <Settings className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Painel</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
