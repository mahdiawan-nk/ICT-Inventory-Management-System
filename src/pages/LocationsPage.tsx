import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Location, User } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function LocationsPage({ currentUser }: { currentUser: User | null }) {
  const { success, error } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('Lantai 1');
  const [room, setRoom] = useState('');
  const [rack, setRack] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const res = await api.getLocations();
      if (res.success) setLocations(res.data);
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat lokasi');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingLoc(null);
    setBuilding('Gedung Utama Politeknik Kampar');
    setFloor('Lantai 1');
    setRoom('');
    setRack('');
    setNotes('');
    setModalOpen(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLoc(loc);
    setBuilding(loc.building);
    setFloor(loc.floor);
    setRoom(loc.room);
    setRack(loc.rack || '');
    setNotes(loc.notes || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingLoc) {
        await api.updateLocation(editingLoc.id, {
          building: building.trim(),
          floor: floor.trim(),
          room: room.trim(),
          rack: rack.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        success('Lokasi berhasil diperbarui.');
      } else {
        await api.createLocation({
          building: building.trim(),
          floor: floor.trim(),
          room: room.trim(),
          rack: rack.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        success('Lokasi baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      loadLocations();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menyimpan lokasi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, roomName: string) => {
    if (!confirm(`Hapus lokasi "${roomName}"?`)) return;
    try {
      await api.deleteLocation(id);
      success('Lokasi berhasil dihapus.');
      loadLocations();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menghapus lokasi');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Lokasi, Gedung, & Ruangan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar persebaran fisik perangkat di lingkungan kampus Politeknik Kampar.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Lokasi</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{loc.floor} &bull; {loc.building}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{loc.room}</h3>
              {loc.rack && (
                <div className="text-xs text-slate-600 font-mono mt-1">
                  Posisi Rak: <strong>{loc.rack}</strong>
                </div>
              )}
              {loc.notes && (
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {loc.notes}
                </p>
              )}
            </div>

            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(loc)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(loc.id, loc.room)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLoc ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Gedung</label>
            <input
              type="text"
              required
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Lantai</label>
            <input
              type="text"
              required
              placeholder="Lantai 1, Lantai 2..."
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Ruangan / Lab</label>
            <input
              type="text"
              required
              placeholder="Server Room & Data Center, Ruang NOC, Lab Jaringan..."
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Keterangan Rak (Opsional)</label>
            <input
              type="text"
              placeholder="Rack 42U A1 / A2, Wallmount 9U..."
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Catatan Akses / Lingkungan</label>
            <textarea
              rows={2}
              placeholder="Kondisi AC, akses biometrik, pembatasan..."
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
              className="px-5 py-2 font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Lokasi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
