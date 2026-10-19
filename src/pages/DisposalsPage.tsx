import React, { useState, useEffect } from 'react';
import { Trash2, Plus, CheckCircle, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../api/client';
import { AssetDisposal, InventoryItem, User as CurrentUser } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function DisposalsPage({ currentUser }: { currentUser: CurrentUser | null }) {
  const { success, error } = useToast();
  const [disposals, setDisposals] = useState<AssetDisposal[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('Lelang / Dihibahkan / Pemusnahan Limbah Elektronik (E-Waste)');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isOperatorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dispRes, invRes] = await Promise.all([
        api.getDisposals(),
        api.getInventory({ limit: 100 }),
      ]);
      if (dispRes.success) setDisposals(dispRes.data);
      if (invRes.success) {
        setInventoryList(invRes.data);
        if (invRes.data.length > 0 && !assetId) setAssetId(invRes.data[0].id);
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat usulan penghapusan');
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !reason.trim()) {
      error('Aset dan alasan usulan penghapusan wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.proposeDisposal({
        asset_id: assetId,
        reason: reason.trim(),
        method: method.trim(),
        notes: notes.trim(),
      });
      if (res.success) {
        success(`Usulan penghapusan nomor ${res.data.disposal_number} berhasil diajukan.`);
        setModalOpen(false);
        loadData();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mengajukan usulan penghapusan');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    const actLabel = action === 'APPROVE' ? 'menyetujui' : 'menolak';
    if (!confirm(`Apakah Anda yakin ingin ${actLabel} usulan penghapusan aset ini?`)) return;

    try {
      const res = await api.actionDisposal(id, action);
      if (res.success) {
        success(res.message || 'Status usulan penghapusan berhasil diperbarui.');
        loadData();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memproses aksi');
    }
  };

  const assetMap = new Map(inventoryList.map((i) => [i.id, `${i.asset_code} - ${i.asset_name}`]));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Penghapusan & Afkir Aset</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Proses verifikasi usulan pemutihan, lelang, atau pemusnahan aset rusak/usang UPT ICT.
          </p>
        </div>

        {isOperatorOrAdmin && (
          <button
            onClick={() => {
              setReason('');
              setNotes('');
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Usulan Penghapusan</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Usulan</th>
                <th className="py-3.5 px-4">Aset Terkait</th>
                <th className="py-3.5 px-4">Alasan Penghapusan</th>
                <th className="py-3.5 px-4">Metode Rekomendasi</th>
                <th className="py-3.5 px-4">Pengusul</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Memuat usulan penghapusan...
                  </td>
                </tr>
              ) : disposals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Belum ada usulan penghapusan aset.
                  </td>
                </tr>
              ) : (
                disposals.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">
                      {d.disposal_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {assetMap.get(d.asset_id) || d.asset_id}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs">{d.reason}</td>
                    <td className="py-3 px-4 text-slate-500">{d.method || '-'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>@{d.proposed_by}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(d.proposed_at).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {d.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Disetujui
                        </span>
                      ) : d.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          Ditolak
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Menunggu Persetujuan
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin && d.status === 'PROPOSED' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAction(d.id, 'APPROVE')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handleAction(d.id, 'REJECT')}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Propose */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajukan Usulan Penghapusan Aset"
      >
        <form onSubmit={handlePropose} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Pilih Aset yang Diusulkan</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              {inventoryList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.asset_code} - {i.asset_name} ({i.condition})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Alasan Penghapusan (Kondisi & Kerusakan)
            </label>
            <textarea
              rows={3}
              required
              placeholder="Contoh: Motherboard terbakar dan komponen suku cadang sudah obsolete/tidak diproduksi lagi oleh vendor..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Metode Penghapusan Rekomendasi</label>
            <input
              type="text"
              required
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Catatan Tambahan / SK Usulan</label>
            <textarea
              rows={2}
              placeholder="Nomor surat berita acara pemeriksaan barang rusak..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              className="px-5 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Kirim Usulan Penghapusan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
