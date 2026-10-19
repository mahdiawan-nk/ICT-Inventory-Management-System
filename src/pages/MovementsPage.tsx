import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, MapPin, Calendar, User, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { AssetMovement, InventoryItem, User as CurrentUser } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function MovementsPage({ currentUser }: { currentUser: CurrentUser | null }) {
  const { success, error } = useToast();
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [toBuilding, setToBuilding] = useState('Gedung Utama Politeknik Kampar');
  const [toRoom, setToRoom] = useState('');
  const [newPic, setNewPic] = useState('');
  const [mutationDate, setMutationDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const isOperatorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [movRes, invRes] = await Promise.all([
        api.getMovements(),
        api.getInventory({ limit: 100 }),
      ]);
      if (movRes.success) setMovements(movRes.data);
      if (invRes.success) {
        setInventoryList(invRes.data);
        if (invRes.data.length > 0 && !assetId) {
          setAssetId(invRes.data[0].id);
          setNewPic(invRes.data[0].person_in_charge);
        }
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat data mutasi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !toRoom.trim() || !newPic.trim() || !reason.trim()) {
      error('Harap lengkapi semua kolom mutasi.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.createMovement({
        asset_id: assetId,
        to_building: toBuilding.trim(),
        to_room: toRoom.trim(),
        new_pic: newPic.trim(),
        mutation_date: mutationDate,
        reason: reason.trim(),
      });
      if (res.success) {
        success('Mutasi aset berhasil dicatat. Lokasi dan PIC aset telah diperbarui.');
        setModalOpen(false);
        loadData();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mencatat mutasi');
    } finally {
      setSaving(false);
    }
  };

  const assetMap = new Map(inventoryList.map((i) => [i.id, `${i.asset_code} - ${i.asset_name}`]));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mutasi & Relokasi Aset</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan perpindahan fisik perangkat antar ruangan, gedung, dan pengalihan penanggung jawab.
          </p>
        </div>

        {isOperatorOrAdmin && (
          <button
            onClick={() => {
              setToRoom('');
              setReason('');
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Mutasi Baru</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Aset Terkait</th>
                <th className="py-3.5 px-4">Relokasi Ruangan</th>
                <th className="py-3.5 px-4">Penanggung Jawab (PIC)</th>
                <th className="py-3.5 px-4">Alasan Pemindahan</th>
                <th className="py-3.5 px-4 text-right">Pencatat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Memuat riwayat mutasi...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Belum ada riwayat mutasi aset yang dicatat.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {m.mutation_date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-700">
                      {assetMap.get(m.asset_id) || m.asset_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <span className="text-slate-500">{m.from_room}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-blue-900 font-bold">{m.to_room}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.to_building}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-500 line-through text-[11px]">{m.old_pic}</div>
                      <div className="font-semibold text-slate-900">{m.new_pic}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">{m.reason}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      @{m.recorded_by}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Mutasi */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Formulir Mutasi & Relokasi Aset"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Aset yang Dimutasi</label>
            <select
              value={assetId}
              onChange={(e) => {
                setAssetId(e.target.value);
                const match = inventoryList.find((i) => i.id === e.target.value);
                if (match) setNewPic(match.person_in_charge);
              }}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              {inventoryList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.asset_code} - {item.asset_name} (Ruang: {item.room})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Gedung Tujuan</label>
              <input
                type="text"
                required
                value={toBuilding}
                onChange={(e) => setToBuilding(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Ruangan / Lab Tujuan</label>
              <input
                type="text"
                required
                placeholder="Misal: Lab Jaringan Komputer"
                value={toRoom}
                onChange={(e) => setToRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">PIC Baru</label>
              <input
                type="text"
                required
                placeholder="Nama staf penerima aset"
                value={newPic}
                onChange={(e) => setNewPic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tanggal Mutasi</label>
              <input
                type="date"
                required
                value={mutationDate}
                onChange={(e) => setMutationDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Alasan Relokasi / Dasar Mutasi</label>
            <textarea
              rows={2}
              required
              placeholder="Contoh: Kebutuhan praktikum mahasiswa di Lab Jaringan semester ganjil..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              {saving ? 'Menyimpan...' : 'Simpan Mutasi Aset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
