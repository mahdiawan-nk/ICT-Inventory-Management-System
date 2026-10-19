import React from 'react';
import {
  Server,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  KeyRound,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { User, ReviewSession } from '../types';
import { RoleBadge } from './Badge';

interface NavbarProps {
  currentUser: User | null;
  reviewSession: ReviewSession | null;
  onLogout: () => void;
  onOpenReviewPortal: () => void;
  onToggleMobileSidebar: () => void;
}

export function Navbar({
  currentUser,
  reviewSession,
  onLogout,
  onOpenReviewPortal,
  onToggleMobileSidebar,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Brand & Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          title="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white shadow-md shadow-blue-500/20">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-slate-900 text-sm sm:text-base">
                UPT ICT
              </span>
              <span className="hidden sm:inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                Politeknik Kampar
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight hidden sm:block">
              ICT Inventory Management System
            </p>
          </div>
        </div>
      </div>

      {/* Review Banner if in Review Mode */}
      {reviewSession && (
        <div className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          <span>
            Mode Review Aktif: <strong>{reviewSession.label}</strong> ({reviewSession.scope_type === 'ALL' ? 'Semua Aset' : reviewSession.scope_type + ' - ' + (reviewSession.scope_value || '')})
          </span>
          <RoleBadge role={reviewSession.role} />
        </div>
      )}

      {/* Right User & Actions */}
      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">
                {currentUser.full_name}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[11px] text-slate-500 font-mono">@{currentUser.username}</span>
                <RoleBadge role={currentUser.role} />
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        ) : reviewSession ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-800 block">
                {reviewSession.label}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Akses Read-Only Terautentikasi</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition"
              title="Akhiri sesi review"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Tutup Sesi</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenReviewPortal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Akses Reviewer (Kode)</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
