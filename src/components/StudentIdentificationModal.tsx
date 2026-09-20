import React, { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

interface Props {
  initialNickname?: string;
  onSave: (nickname: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const StudentIdentificationModal: React.FC<Props> = ({
  initialNickname = '',
  onSave,
  isOpen,
  onClose,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 p-6 sm:p-7 relative">
        {Boolean(initialNickname) && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

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
            />
            {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Entrar no Desafio</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
