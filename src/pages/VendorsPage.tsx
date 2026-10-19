import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, Phone, Mail, Globe, MapPin } from 'lucide-react';
import { api } from '../api/client';
import { Vendor, User } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function VendorsPage({ currentUser }: { currentUser: User | null }) {
  const { success, error } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVnd, setEditingVnd] = useState<Vendor | null>(null);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const res = await api.getVendors();
      if (res.success) setVendors(res.data);
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingVnd(null);
    setName('');
    setContactPerson('');
    setAddress('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setModalOpen(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVnd(v);
    setName(v.name);
    setContactPerson(v.contact_person);
    setAddress(v.address);
    setPhone(v.phone);
    setEmail(v.email);
    setWebsite(v.website || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingVnd) {
        await api.updateVendor(editingVnd.id, {
          name: name.trim(),
          contact_person: contactPerson.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          website: website.trim() || undefined,
        });
        success('Data vendor berhasil diperbarui.');
      } else {
        await api.createVendor({
          name: name.trim(),
          contact_person: contactPerson.trim(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          website: website.trim() || undefined,
        });
        success('Vendor baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      loadVendors();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menyimpan vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, vendorName: string) => {
    if (!confirm(`Hapus data vendor "${vendorName}"?`)) return;
    try {
      await api.deleteVendor(id);
      success('Vendor berhasil dihapus.');
      loadVendors();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menghapus vendor');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vendor & Rekanan Pengadaan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar penyedia perangkat keras, ISP, dan mitra pemeliharaan sistem ICT Politeknik Kampar.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Vendor</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-xs">
                <Building2 className="w-4 h-4" />
                <span>Mitra Pengadaan Resmi</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{v.name}</h3>
              <p className="text-xs text-slate-500">
                PIC: <strong className="text-slate-800">{v.contact_person}</strong>
              </p>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{v.phone}</span>
                </div>
                {v.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{v.email}</span>
                  </div>
                )}
                {v.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{v.address}</span>
                  </div>
                )}
                {v.website && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Globe className="w-3.5 h-3.5" />
                    <a href={v.website} target="_blank" rel="noreferrer" className="hover:underline">
                      {v.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEdit(v)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(v.id, v.name)}
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
        title={editingVnd ? 'Edit Data Vendor' : 'Tambah Vendor Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Perusahaan / Vendor</label>
            <input
              type="text"
              required
              placeholder="PT Telkom Indonesia, CV Kampar..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Contact Person (PIC)</label>
            <input
              type="text"
              required
              placeholder="Nama Account Manager / Sales"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nomor Telepon / WhatsApp</label>
            <input
              type="text"
              required
              placeholder="0812-xxxx-xxxx / (0761) xxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Email Resmi</label>
            <input
              type="email"
              placeholder="sales@vendor.co.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Alamat Kantor</label>
            <textarea
              rows={2}
              placeholder="Alamat lengkap vendor..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Website (Opsional)</label>
            <input
              type="url"
              placeholder="https://vendor.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
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
              {saving ? 'Menyimpan...' : 'Simpan Vendor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
