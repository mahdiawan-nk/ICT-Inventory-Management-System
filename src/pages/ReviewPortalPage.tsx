import React, { useState } from 'react';
import { KeyRound, ShieldAlert, ArrowRight, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { ReviewSession } from '../types';
import { useToast } from '../components/Toast';

interface ReviewPortalPageProps {
  onSuccessReviewLogin: (session: ReviewSession) => void;
  onSwitchToStaffLogin: () => void;
}

export function ReviewPortalPage({
  onSuccessReviewLogin,
  onSwitchToStaffLogin,
}: ReviewPortalPageProps) {
  const { success, error } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Harap masukkan kode akses yang diberikan oleh administrator.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.submitReviewCode(code.trim().toUpperCase());
      if (res.success) {
        success(res.message || 'Akses review berhasil diverifikasi.');
        onSuccessReviewLogin(res.data.session);
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Kode akses tidak valid atau telah kedaluwarsa.';
      setErrorMessage(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header Institution Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-2">
            <Server className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Portal Audit & Review Inventaris
          </h1>
          <p className="text-xs text-blue-200">
            Unit Pelaksana Teknis (UPT) ICT Politeknik Kampar
          </p>
        </div>

        {/* Access Code Card */}
        <div className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl border border-white/20 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">
              Akses Pemeriksaan Tanpa Akun
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Masukkan kode autentikasi resmi (contoh: <code>PK-AUDIT-XXXX-XXXX</code>) untuk mengakses data inventaris dan laporan dalam mode Read-Only.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kode Akses Autentikasi
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="PK-AUDIT-XXXX-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 text-sm font-mono tracking-wider rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition uppercase"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Memvalidasi Kode...' : 'Masuk ke Portal Review'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Staf internal ICT?</span>
            <button
              onClick={onSwitchToStaffLogin}
              className="text-blue-600 font-semibold hover:underline"
            >
              Login Petugas & Admin &rarr;
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-[11px] text-slate-400">
          Dilindungi proteksi brute-force, pembatasan kuota sesi, dan audit trail resmi Politeknik Kampar.
        </div>
      </div>
    </div>
  );
}
