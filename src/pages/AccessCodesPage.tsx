import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, ShieldAlert, Copy, Check, XCircle, Clock, Eye, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { AccessCode, Category, Location, User } from '../types';
import { RoleBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function AccessCodesPage({ currentUser }: { currentUser: User | null }) {
  const { success, error } = useToast();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [role, setRole] = useState<'VIEWER' | 'REVIEWER'>('REVIEWER');
  const [scopeType, setScopeType] = useState<'ALL' | 'CATEGORY' | 'LOCATION'>('ALL');
  const [scopeValue, setScopeValue] = useState('');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [maxUses, setMaxUses] = useState('10');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('120');
  const [saving, setSaving] = useState(false);

  // One-time code disclosure modal
  const [rawCodeModalOpen, setRawCodeModalOpen] = useState(false);
  const [createdRawCode, setCreatedRawCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [codeRes, catRes, locRes] = await Promise.all([
        api.getAccessCodes(),
        api.getCategories(),
        api.getLocations(),
      ]);
      if (codeRes.success) setCodes(codeRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (locRes.success) setLocations(locRes.data);
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat kode akses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      error('Tujuan / Label kode akses wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.createAccessCode({
        label: label.trim(),
        role,
        scope_type: scopeType,
        scope_value: scopeType !== 'ALL' ? scopeValue : undefined,
        valid_until: new Date(validUntil + 'T23:59:59').toISOString(),
        max_uses: Number(maxUses) || 10,
        session_duration_minutes: Number(sessionDurationMinutes) || 120,
      });

      if (res.success) {
        setCreatedRawCode(res.data.rawCode);
        setModalOpen(false);
        setRawCodeModalOpen(true);
        loadData();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal membuat kode akses');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id: string, codeLabel: string) => {
    if (!confirm(`Apakah Anda yakin ingin mencabut kode akses untuk "${codeLabel}"? Kode tidak akan bisa digunakan lagi untuk masuk.`)) {
      return;
    }
    try {
      await api.revokeAccessCode(id);
      success('Kode akses berhasil dicabut.');
      loadData();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mencabut kode akses');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdRawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    success('Kode akses berhasil disalin ke clipboard.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Kode Akses Viewer & Reviewer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem autentikasi tanpa akun login untuk auditor eksternal, rektorat, atau reviewer instansi.
          </p>
        </div>

        <button
          onClick={() => {
            setLabel('');
            setRole('REVIEWER');
            setScopeType('ALL');
            setMaxUses('10');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kode Akses Baru</span>
        </button>
      </div>

      {/* Security Info Card */}
      <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
        <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Mekanisme Keamanan Kode Akses</p>
          <p className="text-blue-800 leading-relaxed text-[11px]">
            Kode akses mentah di-generate secara kriptografis dan <strong>hanya ditampilkan satu kali</strong> saat pembuatan. Server hanya menyimpan hash kode HMAC-SHA256 dengan salt. Setiap sesi reviewer memiliki batas waktu aktif, batasan kuota penggunaan, dan dibatasi hanya pada scope inventaris yang ditentukan.
          </p>
        </div>
      </div>

      {/* Code Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tujuan / Label Akses</th>
                <th className="py-3.5 px-4">Role Akses</th>
                <th className="py-3.5 px-4">Scope Cakupan</th>
                <th className="py-3.5 px-4">Penggunaan</th>
                <th className="py-3.5 px-4">Masa Berlaku</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Memuat kode akses...
                  </td>
                </tr>
              ) : codes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Belum ada kode akses yang aktif.
                  </td>
                </tr>
              ) : (
                codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{c.label}</div>
                      <div className="text-[10px] text-slate-400">
                        Oleh: @{c.created_by} &bull; {new Date(c.created_at).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={c.role} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {c.scope_type === 'ALL' ? 'Semua Aset' : `${c.scope_type}: ${c.scope_value}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {c.current_uses} / {c.max_uses} kali
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>s/d {new Date(c.valid_until).toLocaleDateString('id-ID')}</div>
                      <div className="text-[10px] text-slate-400">Sesi: {c.session_duration_minutes} mnt</div>
                    </td>
                    <td className="py-3 px-4">
                      {c.status === 'ACTIVE' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      ) : c.status === 'REVOKED' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Dicabut
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {c.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevoke(c.id, c.label)}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                        >
                          Cabut Akses
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

      {/* Modal Create Access Code */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Buat Kode Akses Viewer / Reviewer"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Tujuan Akses / Label Kegiatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Audit Inventaris Semester Ganjil 2026 / Pemeriksaan BPK"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tipe Hak Akses</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              >
                <option value="REVIEWER">REVIEWER (Dapat Melihat Nilai & Laporan)</option>
                <option value="VIEWER">VIEWER (Hanya Melihat Daftar Fisik)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Cakupan Data (Scope)</label>
              <select
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              >
                <option value="ALL">Semua Aset Inventaris</option>
                <option value="CATEGORY">Kategori Tertentu</option>
                <option value="LOCATION">Lokasi / Ruangan Tertentu</option>
              </select>
            </div>
          </div>

          {scopeType === 'CATEGORY' && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pilih Kategori Khusus</label>
              <select
                value={scopeValue}
                onChange={(e) => setScopeValue(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              >
                <option value="">Pilih Kategori...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {scopeType === 'LOCATION' && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Pilih Ruangan / Gedung</label>
              <select
                value={scopeValue}
                onChange={(e) => setScopeValue(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              >
                <option value="">Pilih Ruangan...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.room}>
                    {l.room} ({l.building})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Batas Waktu</label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Maks. Penggunaan</label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Durasi Sesi (Mnt)</label>
              <input
                type="number"
                min="15"
                max="720"
                value={sessionDurationMinutes}
                onChange={(e) => setSessionDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
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
              {saving ? 'Membuat...' : 'Buat Kode Akses'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal One-Time Raw Code Disclosure */}
      <Modal
        isOpen={rawCodeModalOpen}
        onClose={() => setRawCodeModalOpen(false)}
        title="Kode Akses Berhasil Dibuat"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>PERHATIAN PENTING:</strong> Kode ini hanya ditampilkan satu kali demi keamanan! Harap salin dan serahkan kode ini kepada auditor/viewer yang bersangkutan sekarang.
            </div>
          </div>

          <div className="p-4 bg-slate-900 rounded-2xl text-center space-y-2">
            <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase block">
              Kode Akses Autentikasi
            </span>
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-emerald-400 select-all">
              {createdRawCode}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-400 text-[11px]">
              Tersimpan sebagai hash kriptografis di server
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Salin Kode Akses'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
