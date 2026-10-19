import React, { useState } from 'react';
import { Server, Lock, User as UserIcon, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';
import { useToast } from '../components/Toast';

interface LoginPageProps {
  onSuccessLogin: (user: User) => void;
  onSwitchToReviewer: () => void;
}

export function LoginPage({ onSuccessLogin, onSwitchToReviewer }: LoginPageProps) {
  const { success, error } = useToast();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('AdminICTPolkam2026!');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.login(username.trim(), password);
      if (res.success) {
        success(`Selamat datang, ${res.data.user.full_name}!`);
        onSuccessLogin(res.data.user);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Username atau password tidak cocok.';
      setErrorMessage(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'operator') => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('AdminICTPolkam2026!');
    } else {
      setUsername('operator');
      setPassword('OperatorICT2026!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-2">
            <Server className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            ICT Inventory Management
          </h1>
          <p className="text-xs text-blue-200">
            Unit Pelaksana Teknis (UPT) ICT Politeknik Kampar
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/20 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">Masuk Akun Petugas</h2>
            <p className="text-xs text-slate-500">
              Khusus administrator sistem dan operator teknisi jaringan UPT ICT.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="admin / operator"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick preset credentials helper */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1.5">
            <span className="font-bold text-slate-700 block">Akun Bawaan Sistem (Development/First Use):</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-2 py-1 bg-white hover:bg-blue-50 rounded border border-slate-300 text-blue-700 font-medium"
              >
                Isi Admin (admin)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('operator')}
                className="px-2 py-1 bg-white hover:bg-blue-50 rounded border border-slate-300 text-blue-700 font-medium"
              >
                Isi Operator (operator)
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Punya kode akses review?</span>
            <button
              onClick={onSwitchToReviewer}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Portal Reviewer &rarr;</span>
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          Unit Pelaksana Teknis (UPT) ICT Politeknik Kampar &bull; Bangkinang, Riau
        </div>
      </div>
    </div>
  );
}
