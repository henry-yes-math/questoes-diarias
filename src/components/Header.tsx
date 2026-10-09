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
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold tracking-tight border transition-all shrink-0 select-none ${
                  isShieldProtecting
                    ? 'bg-gradient-to-b from-amber-100 via-amber-100 to-amber-200/90 text-amber-950 border-amber-300 ring-1 ring-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse'
                    : (studentProfile.streakDays || 0) > 0
                    ? 'bg-gradient-to-b from-amber-50/90 via-amber-50 to-amber-100/70 text-amber-950 border-amber-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(217,119,6,0.08)] hover:border-amber-300 transition-colors'
                    : 'bg-stone-50/80 text-stone-500 border-stone-200/80 shadow-2xs'
                }`}
                title={
                  isShieldProtecting
                    ? `Ofensiva protegida: ${studentProfile.streakDays || 0}d garantidos pelo escudo hoje! Resolva para manter.`
                    : (studentProfile.streakDays || 0) > 0
                    ? `Sua ofensiva: ${studentProfile.streakDays || 0} ${
                        (studentProfile.streakDays || 0) === 1 ? 'dia consecutivo' : 'dias consecutivos'
                      }!`
                    : 'Ofensiva: resolva a questão de hoje para acender seu fogo!'
                }
              >
                <Flame
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform ${
                    isShieldProtecting
                      ? 'fill-amber-500 text-orange-600 drop-shadow-[0_1px_3px_rgba(245,158,11,0.6)]'
                      : (studentProfile.streakDays || 0) > 0
                      ? 'fill-amber-400 text-orange-500 drop-shadow-[0_1px_2px_rgba(249,115,22,0.35)]'
                      : 'fill-stone-300 text-stone-400'
                  }`}
                />
                <span className="flex items-baseline gap-0.5 tabular-nums">
                  <span
                    className={`font-extrabold text-[11px] sm:text-[12px] leading-none ${
                      (studentProfile.streakDays || 0) > 0 ? 'text-amber-950' : 'text-stone-500'
                    }`}
                  >
                    {studentProfile.streakDays || 0}
                  </span>
                  <span
                    className={`text-[8.5px] sm:text-[9.5px] font-bold leading-none ${
                      (studentProfile.streakDays || 0) > 0 ? 'text-amber-750 text-amber-700/80' : 'text-stone-400'
                    }`}
                  >
                    d
                  </span>
                </span>
              </span>

              {/* Protetor de Chama (Escudo) com tooltip interativo */}
              <div className="relative inline-flex items-center shrink-0" ref={tooltipRef}>
                <button
                  type="button"
                  onClick={() => setShowShieldTooltip((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] cursor-pointer transition-all border shrink-0 ${
                    isShieldProtecting
                      ? 'bg-gradient-to-b from-amber-100 to-amber-200/90 text-amber-950 border-amber-300 font-bold hover:bg-amber-200 ring-1 ring-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                      : streakShields > 0
                      ? 'bg-gradient-to-b from-blue-50/90 via-blue-50 to-blue-100/70 text-blue-950 border-blue-200/90 hover:border-blue-300 hover:from-blue-100/80 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(37,99,235,0.08)]'
                      : 'bg-stone-50/80 text-stone-400 hover:text-stone-600 hover:bg-stone-100 border-stone-200/80 font-medium shadow-2xs'
                  }`}
                  title={
                    isShieldProtecting
                      ? 'Seu escudo está salvando seu fogo hoje! Clique para ver'
                      : 'Escudo de Ofensiva: protege seus dias se você esquecer (Clique para ver)'
                  }
                  aria-label="Escudo de Ofensiva"
                >
                  <Shield
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform ${
                      isShieldProtecting
                        ? 'fill-amber-500 text-orange-600 drop-shadow-[0_1px_3px_rgba(245,158,11,0.5)]'
                        : streakShields > 0
                        ? 'fill-blue-400 text-blue-600 drop-shadow-[0_1px_2px_rgba(37,99,235,0.3)]'
                        : 'text-stone-400'
                    }`}
                  />
                  <span className="tabular-nums font-extrabold text-[11px] sm:text-[12px] leading-none">
                    {streakShields}
                  </span>
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
