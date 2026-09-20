import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, ShieldCheck, X } from 'lucide-react';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ADMIN_PASSWORD = 'aloha@aloha';
export const ADMIN_AUTH_KEY = 'yesmatematica_admin_authorized';

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === ADMIN_PASSWORD) {
      try {
        localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      } catch {}
      setError(null);
      setPasswordInput('');
      onSuccess();
    } else {
      setError('Senha incorreta. Apenas o professor tem autorização.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-stone-200 shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-3 shadow-xs">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-stone-900 tracking-tight">
            Acesso Restrito ao Professor
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Digite a senha mestra para gerenciar questões e ciclos da turma.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm tracking-wider font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1">
                <span>•</span> {error}
              </p>
            )}
          </div>

          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Entrar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
