import React, { useState } from 'react';
import { Sparkles, UserCheck } from 'lucide-react';

interface Props {
  initialNickname?: string;
  onSave: (nickname: string) => void;
  isOpen: boolean;
}

export const StudentIdentificationModal: React.FC<Props> = ({
  initialNickname = '',
  onSave,
  isOpen,
}) => {
  const [name, setName] = useState(initialNickname);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
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
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 relative">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mb-4 text-amber-600">
          <Sparkles className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 tracking-tight">
          Como quer ser chamado no Mural da Turma?
        </h3>

        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Você não precisa de senha. Seu apelido ou primeiro nome aparecerá na lista de quem manteve o ritmo e concluiu a questão do dia!
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="student-nickname-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"
            >
              Seu Apelido ou Nome de Foco
            </label>
            <input
              id="student-nickname-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ex: Lucas Med, Mari_ENEM, Biel 800+"
              className="w-full px-4 py-3 text-slate-900 text-base bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Salvar e Começar</span>
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-400">
          Você poderá alterar seu apelido a qualquer momento no topo da página.
        </p>
      </div>
    </div>
  );
};
