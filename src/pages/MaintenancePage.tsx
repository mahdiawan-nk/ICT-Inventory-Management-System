import React, { useState, useEffect } from 'react';
import { Wrench, Plus, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../api/client';
import { MaintenanceRecord, InventoryItem, User } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function MaintenancePage({ currentUser }: { currentUser: User | null }) {
  const { success, error } = useToast();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceRecord | null>(null);

  // Form states
  const [assetId, setAssetId] = useState('');
  const [workType, setWorkType] = useState('Servis Perangkat Keras');
  const [complaint, setComplaint] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [technicianVendor, setTechnicianVendor] = useState('Teknisi Internal ICT');
  const [cost, setCost] = useState('0');
  const [actionTaken, setActionTaken] = useState('');
  const [status, setStatus] = useState<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS');
  const [saving, setSaving] = useState(false);

  // Complete ticket state
  const [resolutionNote, setResolutionNote] = useState('');
  const [finalCost, setFinalCost] = useState('0');

  const isOperatorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mntRes, invRes] = await Promise.all([
        api.getMaintenance(),
        api.getInventory({ limit: 100 }),
      ]);
      if (mntRes.success) setRecords(mntRes.data);
      if (invRes.success) {
        setInventoryList(invRes.data);
        if (invRes.data.length > 0 && !assetId) setAssetId(invRes.data[0].id);
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat data pemeliharaan');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.createMaintenance({
        asset_id: assetId,
        work_type: workType.trim(),
        complaint: complaint.trim(),
        start_date: startDate,
        technician_vendor: technicianVendor.trim(),
        cost: Number(cost) || 0,
        status,
      });
      if (res.success) {
        success(`Tiket ${res.data.ticket_number} berhasil dibuka.`);
        setModalOpen(false);
        loadData();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal membuat tiket');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenComplete = (ticket: MaintenanceRecord) => {
    setSelectedTicket(ticket);
    setResolutionNote(ticket.action_taken || '');
    setFinalCost(String(ticket.cost || 0));
    setCompleteModalOpen(true);
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSaving(true);
      await api.updateMaintenance(selectedTicket.id, {
        status: 'COMPLETED',
        action_taken: resolutionNote.trim(),
        cost: Number(finalCost) || 0,
      });
      success(`Tiket ${selectedTicket.ticket_number} berhasil diselesaikan. Aset kembali berstatus Aktif.`);
      setCompleteModalOpen(false);
      loadData();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menyelesaikan tiket');
    } finally {
      setSaving(false);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const assetMap = new Map(inventoryList.map((i) => [i.id, `${i.asset_code} - ${i.asset_name}`]));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pemeliharaan & Tiket Servis</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan perbaikan, servis berkala, penggantian suku cadang, dan biaya pemeliharaan.
          </p>
        </div>

        {isOperatorOrAdmin && (
          <button
            onClick={() => {
              setComplaint('');
              setCost('0');
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buka Tiket Pemeliharaan</span>
          </button>
        )}
      </div>

      {/* Ticket List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Tiket</th>
                <th className="py-3.5 px-4">Aset Terkait</th>
                <th className="py-3.5 px-4">Jenis Pekerjaan</th>
                <th className="py-3.5 px-4">Keluhan & Tindakan</th>
                <th className="py-3.5 px-4">Teknisi / Vendor</th>
                <th className="py-3.5 px-4">Biaya</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Memuat tiket pemeliharaan...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Belum ada riwayat pemeliharaan tercatat.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {r.ticket_number}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {assetMap.get(r.asset_id) || r.asset_id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.work_type}</td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 truncate">{r.complaint}</div>
                      {r.action_taken && (
                        <div className="text-[11px] text-emerald-700 truncate">Solusi: {r.action_taken}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{r.technician_vendor}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{formatIDR(r.cost)}</td>
                    <td className="py-3 px-4">
                      {r.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Selesai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Proses Servis
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isOperatorOrAdmin && r.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleOpenComplete(r)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                        >
                          Selesaikan
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal New Ticket */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buka Tiket Pemeliharaan Baru"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Aset Inventaris</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              {inventoryList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.asset_code} - {item.asset_name} ({item.room})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Jenis Pekerjaan</label>
            <input
              type="text"
              required
              placeholder="Penggantian RAM, Servis Power Supply, Maintenance Berkala..."
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Keluhan / Gejala Kerusakan</label>
            <textarea
              rows={2}
              required
              placeholder="Deskripsi masalah teknis..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Teknisi / Vendor Rekanan</label>
              <input
                type="text"
                required
                value={technicianVendor}
                onChange={(e) => setTechnicianVendor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Estimasi Biaya (IDR)</label>
              <input
                type="number"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tanggal Mulai Servis</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Buka Tiket Servis'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Complete Ticket */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title={`Selesaikan Pemeliharaan: ${selectedTicket?.ticket_number}`}
      >
        <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Tindakan yang Dilakukan (Solusi / Penggantian Komponen)
            </label>
            <textarea
              rows={3}
              required
              placeholder="Contoh: Mengganti PSU 750W Titanium dengan unit baru dari vendor, testing 24 jam normal."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Realisasi Biaya Akhir (IDR)</label>
            <input
              type="number"
              min="0"
              value={finalCost}
              onChange={(e) => setFinalCost(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px]">
            Setelah tiket diselesaikan, status operasional perangkat akan otomatis kembali menjadi <strong>Aktif (Baik)</strong>.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCompleteModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Selesaikan Tiket & Aktifkan Aset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
