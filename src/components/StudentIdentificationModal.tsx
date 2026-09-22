import React, { useState, useEffect } from 'react';
import { ArrowRight, X, Flame, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { findExistingStudentByNickname } from '../services/studentService';
import { StudentProfile } from '../types';

interface Props {
  initialNickname?: string;
  currentStudentId?: string;
  onSave: (nickname: string, adoptedStudentId?: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const StudentIdentificationModal: React.FC<Props> = ({
  initialNickname = '',
  currentStudentId,
  onSave,
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState(initialNickname);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [existingProfile, setExistingProfile] = useState<StudentProfile | null>(null);
  const [mode, setMode] = useState<'input' | 'confirm' | 'differentiate'>('input');

  useEffect(() => {
    if (isOpen) {
      setName(initialNickname);
      setError('');
      setExistingProfile(null);
      setMode('input');
      setIsChecking(false);
    }
  }, [isOpen, initialNickname]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Por favor, digite seu apelido ou primeiro nome.');
      return;
    }
    if (trimmed.length > 25) {
      setError('O apelido deve ter no máximo 25 caracteres.');
      return;
    }

    setError('');

    // Se é o mesmo apelido que ele já tinha, salva direto
    if (initialNickname && trimmed.toLowerCase() === initialNickname.trim().toLowerCase()) {
      onSave(trimmed);
      return;
    }

    setIsChecking(true);
    try {
      // 2º Passo da diretriz: Fallback inteligente por Nickname
      const found = await findExistingStudentByNickname(trimmed, currentStudentId);
      if (found && ((found.streakDays && found.streakDays > 0) || (found.totalSolved && found.totalSolved > 0))) {
        setExistingProfile(found);
        setMode('confirm');
        return;
      }

      // Novo aluno direto
      onSave(trimmed);
    } catch (err) {
      console.warn('Erro ao verificar nickname existente:', err);
      onSave(trimmed);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirmRestore = () => {
    if (existingProfile) {
      onSave(existingProfile.nickname, existingProfile.studentId);
    } else {
      onSave(name.trim());
    }
  };

  const handleDifferentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Por favor, digite seu nome com sobrenome ou inicial.');
      return;
    }
    if (existingProfile && trimmed.toLowerCase() === existingProfile.nickname.trim().toLowerCase()) {
      setError(`Adicione seu sobrenome ou inicial para diferenciar (ex: ${trimmed} S.)`);
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-7 relative transition-all">
        {Boolean(initialNickname) && onClose && mode === 'input' && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* MODO 1: Digitação Padrão */}
        {mode === 'input' && (
          <div>
            <h3 className="text-xl font-bold text-stone-900 tracking-tight">
              Quem é você na turma?
            </h3>

            <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
              Digite seu nome ou apelido para marcar presença no desafio de hoje.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <input
                  id="student-nickname-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Ex: Lucas Med, Bia..."
                  className="w-full px-4 py-3 text-stone-900 text-base bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-stone-400"
                  autoFocus
                  disabled={isChecking}
                />
                {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isChecking}
                className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                <span>{isChecking ? 'Verificando...' : 'Entrar no Desafio'}</span>
                {!isChecking && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
        )}

        {/* MODO 2: Confirmação Fluida (1 Clique para recuperar ofensiva) */}
        {mode === 'confirm' && existingProfile && (
          <div className="text-center py-1">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Flame className="w-7 h-7 fill-amber-500 text-amber-500 animate-pulse" />
            </div>

            <h3 className="text-xl font-bold text-stone-900 tracking-tight">
              Bem-vindo(a) de volta, {existingProfile.nickname}!
            </h3>

            <div className="mt-3 p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-stone-700 text-sm">
              <p className="font-medium text-stone-900">
                Encontramos sua ofensiva ativa de{' '}
                <span className="inline-flex items-center gap-0.5 text-amber-700 font-extrabold text-base">
                  🔥 {existingProfile.streakDays || 1}{' '}
                  {(existingProfile.streakDays || 1) === 1 ? 'dia' : 'dias'}
                </span>
                !
              </p>
              {Boolean(existingProfile.totalSolved) && (
                <p className="text-xs text-stone-500 mt-1">
                  Você já completou {existingProfile.totalSolved}{' '}
                  {existingProfile.totalSolved === 1 ? 'questão' : 'questões'} na comunidade.
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-base"
                autoFocus
              >
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Sim, sou eu! Continuar minha ofensiva</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode('differentiate');
                }}
                className="w-full py-2.5 px-4 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              >
                Não sou eu, sou outro(a) {existingProfile.nickname}
              </button>
            </div>
          </div>
        )}

        {/* MODO 3: Desambiguação de Nomes Repetidos (Copy Empolgante e Gamificada) */}
        {mode === 'differentiate' && (
          <div>
            <div className="flex items-center gap-2.5 text-stone-900 font-extrabold text-xl tracking-tight">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <h3>Garanta seu lugar no Mural!</h3>
            </div>

            <p className="mt-2.5 text-sm text-stone-600 leading-relaxed">
              Já temos um(a) <strong>{existingProfile?.nickname}</strong> brilhando no ranking! Para você ter <strong className="text-stone-900">sua própria ofensiva 🔥</strong>, acumular conquistas e se destacar na turma, como você quer aparecer no mural?
            </p>

            <form onSubmit={handleDifferentSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="differentiate-nickname-input" className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  Seu nome ou apelido exclusivo:
                </label>
                <input
                  id="differentiate-nickname-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={`Ex: ${existingProfile?.nickname} Silva, ${existingProfile?.nickname} Med...`}
                  className="w-full px-4 py-3 text-stone-900 text-base bg-stone-50 border border-stone-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-stone-400 font-medium"
                  autoFocus
                />
                {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
              </div>

              {/* Sugestões rápidas de 1 clique para facilitar */}
              <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-200/80">
                <span className="text-[11px] font-semibold text-stone-500 block mb-1.5">
                  💡 Ideias rápidas para você se diferenciar:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    `${existingProfile?.nickname} M.`,
                    `${existingProfile?.nickname} Med`,
                    `${existingProfile?.nickname} Mat`,
                    `${existingProfile?.nickname} 2.0`,
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setName(sug);
                        if (error) setError('');
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-stone-700 border border-stone-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('confirm')}
                  className="py-3.5 px-4 text-sm font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
                >
                  <span>Iniciar Minha Ofensiva</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-center text-[11px] text-stone-600 font-medium pt-0.5">
                ⚡ Sua resposta de hoje já conta presença e pontua no Mural!
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
