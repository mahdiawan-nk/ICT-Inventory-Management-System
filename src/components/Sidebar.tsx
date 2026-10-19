import React from 'react';
import {
  LayoutDashboard,
  Server,
  Layers,
  MapPin,
  Building2,
  Wrench,
  ArrowRightLeft,
  CalendarClock,
  Trash2,
  FileSpreadsheet,
  KeyRound,
  Users,
  ShieldCheck,
  DatabaseBackup,
  Settings,
  Lock,
} from 'lucide-react';
import { User, ReviewSession } from '../types';

export type NavTab =
  | 'dashboard'
  | 'inventory'
  | 'categories'
  | 'locations'
  | 'vendors'
  | 'maintenance'
  | 'movements'
  | 'loans'
  | 'disposals'
  | 'reports'
  | 'access_codes'
  | 'users'
  | 'audit_logs'
  | 'backup'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User | null;
  reviewSession: ReviewSession | null;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  currentUser,
  reviewSession,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const isAdmin = currentUser?.role === 'ADMIN';
  const isReviewer = Boolean(reviewSession);

  const mainNavItems = isReviewer
    ? [
        { id: 'dashboard', label: 'Ringkasan Audit', icon: LayoutDashboard },
        { id: 'inventory', label: 'Daftar Inventaris', icon: Server },
        { id: 'reports', label: 'Laporan & Checklist', icon: FileSpreadsheet },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory', label: 'Daftar Inventaris', icon: Server },
        { id: 'categories', label: 'Kategori Aset', icon: Layers },
        { id: 'locations', label: 'Lokasi & Ruangan', icon: MapPin },
        { id: 'vendors', label: 'Vendor & Rekanan', icon: Building2 },
        { id: 'maintenance', label: 'Pemeliharaan (Servis)', icon: Wrench },
        { id: 'movements', label: 'Mutasi & Relokasi', icon: ArrowRightLeft },
        { id: 'loans', label: 'Peminjaman Aset', icon: CalendarClock },
        { id: 'disposals', label: 'Penghapusan Aset', icon: Trash2 },
        { id: 'reports', label: 'Laporan & Ekspor', icon: FileSpreadsheet },
      ];

  const adminNavItems = [
    { id: 'access_codes', label: 'Kode Akses Reviewer', icon: KeyRound },
    { id: 'users', label: 'Manajemen Pengguna', icon: Users },
    { id: 'audit_logs', label: 'Audit Trail Log', icon: ShieldCheck },
    { id: 'backup', label: 'Backup & Restore', icon: DatabaseBackup },
    { id: 'settings', label: 'Pengaturan & Drive', icon: Settings },
  ];

  const handleNavClick = (tabId: NavTab) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-slate-200 bg-slate-900 text-slate-300 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isReviewer ? 'Navigasi Review' : 'Modul Inventaris'}
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id as NavTab)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Admin section */}
          {isAdmin && (
            <div>
              <div className="px-3 mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Administrasi Sistem</span>
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
              <nav className="space-y-1">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id as NavTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 p-4 text-[11px] text-slate-400 bg-slate-950/60">
          {isReviewer ? (
            <div>
              <p className="font-semibold text-emerald-400">Mode Auditor / Reviewer</p>
              <p className="text-slate-400 text-[10px]">Akses dibatasi sesuai kode autentikasi.</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-300">UPT ICT Politeknik Kampar</p>
              <p className="text-slate-400 text-[10px]">Penyimpanan Data JSON Server</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
