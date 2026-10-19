import React from 'react';
import { AssetCondition, OperationalStatus, AssetCriticality, UserRole } from '../types';

export function ConditionBadge({ condition }: { condition: AssetCondition }) {
  const configs: Record<AssetCondition, { label: string; bg: string }> = {
    GOOD: { label: 'Baik', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    MINOR_DAMAGE: { label: 'Rusak Ringan', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    DAMAGED: { label: 'Rusak Berat', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    UNUSABLE: { label: 'Afkir / Rusak Total', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  };

  const c = configs[condition] || { label: condition, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}>
      {c.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: OperationalStatus }) {
  const configs: Record<OperationalStatus, { label: string; bg: string; dot: string }> = {
    ACTIVE: { label: 'Aktif Operasional', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    STORED: { label: 'Disimpan (Cadangan)', bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
    BORROWED: { label: 'Sedang Dipinjam', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
    MAINTENANCE: { label: 'Dalam Servis', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    LOST: { label: 'Hilang', bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
    DISPOSED: { label: 'Dihapuskan', bg: 'bg-zinc-100 text-zinc-600 border-zinc-300', dot: 'bg-zinc-400' },
  };

  const c = configs[status] || { label: status, bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function CriticalityBadge({ level }: { level: AssetCriticality }) {
  const configs: Record<AssetCriticality, { label: string; bg: string }> = {
    LOW: { label: 'Rendah', bg: 'bg-slate-100 text-slate-700' },
    MEDIUM: { label: 'Sedang', bg: 'bg-sky-100 text-sky-800' },
    HIGH: { label: 'Tinggi', bg: 'bg-orange-100 text-orange-800' },
    CRITICAL: { label: 'Kritis (Data Center)', bg: 'bg-red-100 text-red-800 font-semibold' },
  };

  const c = configs[level] || { label: level, bg: 'bg-slate-100 text-slate-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${c.bg}`}>
      {c.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole | string }) {
  const configs: Record<string, { label: string; bg: string }> = {
    ADMIN: { label: 'Administrator', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    OPERATOR: { label: 'Teknisi / Operator', bg: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    REVIEWER: { label: 'Auditor / Reviewer', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    VIEWER: { label: 'Guest Viewer', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
  };

  const c = configs[role] || { label: role, bg: 'bg-slate-100 text-slate-800 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg}`}>
      {c.label}
    </span>
  );
}
