import React, { useEffect, useState } from 'react';
import {
  Server,
  DollarSign,
  CheckCircle2,
  CalendarClock,
  Wrench,
  AlertTriangle,
  Clock,
  Layers,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { ConditionBadge, StatusBadge, RoleBadge } from '../components/Badge';
import { User, ReviewSession } from '../types';

export function DashboardPage({
  currentUser,
  reviewSession,
  onNavigateToTab,
}: {
  currentUser: User | null;
  reviewSession: ReviewSession | null;
  onNavigateToTab: (tab: any) => void;
}) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const isReviewer = Boolean(reviewSession);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-2xl text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
              UPT ICT POLITEKNIK KAMPAR
            </span>
            {isReviewer ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Mode Audit / Review
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-700/50 text-slate-300">
                Data Center & Jaringan
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Sistem Inventaris & Pemantauan Aset ICT
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            {isReviewer
              ? `Tinjauan data untuk keperluan: ${reviewSession?.label} (Scope: ${reviewSession?.scope_type})`
              : 'Pencatatan, audit fisik, mutasi, pemeliharaan berkala, dan manajemen perangkat keras jaringan.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('inventory')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            Lihat Inventaris
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Aset
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats?.total_assets || 0}</span>
            <span className="text-xs text-slate-400 font-medium">unit</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats?.active_assets || 0} unit aktif beroperasi
          </div>
        </div>

        {/* Total Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Nilai Perolehan
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 truncate block">
              {stats?.total_valuation !== undefined ? formatIDR(stats.total_valuation) : 'Terselubung'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Total investasi aset perangkat ICT
          </div>
        </div>

        {/* Maintenance / Servis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Dalam Pemeliharaan
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{stats?.maintenance_assets || 0}</span>
            <span className="text-xs text-slate-400 font-medium">tiket aktif</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Perbaikan & pemeliharaan teknisi
          </div>
        </div>

        {/* Borrowed / Dipinjam */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sedang Dipinjam
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700">{stats?.borrowed_assets || 0}</span>
            <span className="text-xs text-slate-400 font-medium">unit</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Peminjaman operasional dosen / unit
          </div>
        </div>
      </div>

      {/* Warranty Expiring Alerts */}
      {stats?.expiring_warranties && stats.expiring_warranties.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-amber-900 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Peringatan: Masa Garansi Segera Berakhir (&lt; 60 Hari)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.expiring_warranties.map((item: any) => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-xs text-xs">
                <div className="font-bold text-slate-900">{item.asset_code}</div>
                <div className="text-slate-600 truncate">{item.asset_name}</div>
                <div className="mt-1 flex items-center justify-between text-amber-700 font-medium">
                  <span>Selesai: {item.warranty_end}</span>
                  <span className="text-slate-500">{item.room}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Breakdown by Category & Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Aset per Kategori</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('categories')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Kelola Kategori &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {stats?.by_category?.map((cat: any) => {
              const total = stats?.total_assets || 1;
              const percent = Math.round((cat.count / total) * 100);
              return (
                <div key={cat.id} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-slate-800">
                      {cat.name} ({cat.code})
                    </span>
                    <span className="text-slate-500 font-semibold">
                      {cat.count} unit ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  {cat.valuation !== undefined && (
                    <div className="text-right text-[11px] text-slate-400 mt-0.5">
                      Nilai: {formatIDR(cat.valuation)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Distribusi Lokasi & Ruangan</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('locations')}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Kelola Lokasi &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {stats?.by_location?.map((loc: any) => (
              <div
                key={loc.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">{loc.room}</div>
                  <div className="text-slate-400 text-[11px]">{loc.building}</div>
                </div>
                <div className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-bold">
                  {loc.count} aset
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Log (Admin/Staff only) */}
      {!isReviewer && stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Riwayat Aktivitas & Audit Terkini</h3>
            </div>
            <button
              onClick={() => onNavigateToTab('audit_logs')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Lihat Semua Audit Log &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {stats.recent_activity.slice(0, 5).map((log: any) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-900 mr-2">[{log.action}]</span>
                  <span className="text-slate-600">{log.summary}</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Oleh: <strong>{log.actor_name}</strong> ({log.role}) &bull; IP: {log.ip_address}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 shrink-0 ml-4">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
