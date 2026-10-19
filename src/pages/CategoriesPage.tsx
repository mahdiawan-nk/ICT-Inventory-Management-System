import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { api } from '../api/client';
import { Category, User } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function CategoriesPage({ currentUser }: { currentUser: User | null }) {
  const { success, error } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.getCategories();
      if (res.success) setCategories(res.data);
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCat(null);
    setCode('');
    setName('');
    setDescription('');
    setCodePrefix('ICT-');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCat(c);
    setCode(c.code);
    setName(c.name);
    setDescription(c.description);
    setCodePrefix(c.code_prefix);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingCat) {
        await api.updateCategory(editingCat.id, {
          name: name.trim(),
          description: description.trim(),
          code_prefix: codePrefix.trim().toUpperCase(),
        });
        success('Kategori berhasil diperbarui.');
      } else {
        await api.createCategory({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim(),
          code_prefix: codePrefix.trim().toUpperCase(),
        });
        success('Kategori baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      loadCategories();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus kategori "${name}"?`)) return;
    try {
      await api.deleteCategory(id);
      success('Kategori berhasil dihapus.');
      loadCategories();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menghapus kategori');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kategori Aset & Prefix Kode</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelompokan jenis perangkat keras, jaringan, dan software UPT ICT Politeknik Kampar.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                  {c.code}
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  Prefix: <strong>{c.code_prefix}</strong>
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{c.name}</h3>
              <p className="text-xs text-slate-500">{c.description || 'Tidak ada deskripsi khusus.'}</p>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? 'Edit Kategori Aset' : 'Tambah Kategori Aset Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {!editingCat && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Kode Kategori (Singkat)</label>
              <input
                type="text"
                required
                placeholder="SRV, NET, COM, PWR, TOL..."
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 uppercase font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Kategori</label>
            <input
              type="text"
              required
              placeholder="Server & Storage, Perangkat Jaringan..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Prefix Kode Aset</label>
            <input
              type="text"
              required
              placeholder="ICT-SRV, ICT-NET..."
              value={codePrefix}
              onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 uppercase font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Deskripsi Cakupan</label>
            <textarea
              rows={3}
              placeholder="Perangkat yang masuk dalam kategori ini..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {saving ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
