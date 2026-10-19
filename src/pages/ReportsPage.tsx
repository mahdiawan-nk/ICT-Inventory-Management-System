import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  CheckSquare,
  Building,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { InventoryItem, Category, User, ReviewSession } from '../types';
import { ConditionBadge, StatusBadge } from '../components/Badge';
import { useToast } from '../components/Toast';

export function ReportsPage({
  currentUser,
  reviewSession,
}: {
  currentUser: User | null;
  reviewSession: ReviewSession | null;
}) {
  const { success, error } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [reportType, setReportType] = useState<'all' | 'audit_checklist' | 'financial' | 'maintenance'>('all');

  const isReviewer = Boolean(reviewSession);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedCondition, selectedStatus, roomFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const catRes = await api.getCategories();
      if (catRes.success) setCategories(catRes.data);

      if (isReviewer) {
        const res = await api.getReviewInventory({
          category_id: selectedCategory,
          condition: selectedCondition,
          operational_status: selectedStatus,
          limit: 200,
        });
        if (res.success) setItems(res.data);
      } else {
        const res = await api.getInventory({
          category_id: selectedCategory,
          condition: selectedCondition,
          operational_status: selectedStatus,
          room: roomFilter,
          limit: 200,
        });
        if (res.success) setItems(res.data);
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat data laporan');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportCsv({
        category_id: selectedCategory,
        condition: selectedCondition,
        operational_status: selectedStatus,
        room: roomFilter,
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Laporan_Inventaris_UPT_ICT_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('File CSV laporan inventaris berhasil diunduh.');
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mengekspor CSV');
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const totalValuation = items.reduce((acc, curr) => acc + (Number(curr.acquisition_cost) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Laporan & Rekapitulasi Inventaris
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unit Pelaksana Teknis (UPT) ICT Politeknik Kampar &bull; Zona Waktu: Asia/Jakarta
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Cetak PDF</span>
          </button>

          {!isReviewer && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor CSV (Excel)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Mode Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Report Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jenis Laporan</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              <option value="all">Semua Rekapitulasi Inventaris</option>
              <option value="audit_checklist">Formulir Audit Fisik Lapangan</option>
              <option value="financial">Laporan Nilai Perolehan & Sumber Dana</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Filter Kondisi</label>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              <option value="">Semua Kondisi</option>
              <option value="GOOD">Baik</option>
              <option value="MINOR_DAMAGE">Rusak Ringan</option>
              <option value="DAMAGED">Rusak Berat</option>
              <option value="UNUSABLE">Afkir</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Operasional</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              <option value="">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="STORED">Disimpan (Cadangan)</option>
              <option value="BORROWED">Sedang Dipinjam</option>
              <option value="MAINTENANCE">Dalam Servis</option>
              <option value="DISPOSED">Dihapuskan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Valuation Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Total Aset Dilaporkan</span>
          <span className="text-2xl font-bold text-slate-900">{items.length} unit</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Kondisi Baik</span>
          <span className="text-2xl font-bold text-emerald-700">
            {items.filter((i) => i.condition === 'GOOD').length} unit
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs text-slate-500 block">Total Valuasi Nilai</span>
          <span className="text-2xl font-bold text-blue-900">
            {formatIDR(totalValuation)}
          </span>
        </div>
      </div>

      {/* Report Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {reportType === 'audit_checklist'
                ? 'Checklist Verifikasi Fisik Inventaris'
                : reportType === 'financial'
                ? 'Laporan Nilai Perolehan dan Sumber Pendanaan'
                : 'Daftar Rinci Seluruh Aset Terdaftar'}
            </h3>
            <span className="text-[11px] text-slate-500">
              Dicetak pada: {new Date().toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3">Kode Aset</th>
                <th className="py-3 px-3">Nama Perangkat & Merk</th>
                <th className="py-3 px-3">Ruangan & PIC</th>
                <th className="py-3 px-3">Kondisi</th>
                <th className="py-3 px-3">Status</th>
                {reportType === 'financial' && <th className="py-3 px-3 text-right">Nilai Perolehan</th>}
                {reportType === 'financial' && <th className="py-3 px-3">Sumber Dana</th>}
                {reportType === 'audit_checklist' && (
                  <th className="py-3 px-3 text-center">Paraf / Fisik Sesuai</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{item.asset_code}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{item.asset_name}</div>
                    <div className="text-[11px] text-slate-400">
                      {item.brand} {item.model} {item.serial_number ? `• S/N: ${item.serial_number}` : ''}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-800">{item.room}</div>
                    <div className="text-[11px] text-slate-500">{item.person_in_charge}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <ConditionBadge condition={item.condition} />
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={item.operational_status} />
                  </td>
                  {reportType === 'financial' && (
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatIDR(item.acquisition_cost)}
                    </td>
                  )}
                  {reportType === 'financial' && (
                    <td className="py-2.5 px-3 text-slate-600">{item.funding_source || '-'}</td>
                  )}
                  {reportType === 'audit_checklist' && (
                    <td className="py-2.5 px-3 text-center">
                      <div className="w-6 h-6 border-2 border-slate-300 rounded mx-auto" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
