import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, ShieldCheck, ShieldAlert, KeyRound, CheckCircle } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';
import { RoleBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function UsersPage({ currentUser }: { currentUser: User | null }) {
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat pengguna');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('OPERATOR');
    setIsActive(true);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.full_name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setIsActive(u.is_active);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          full_name: fullName.trim(),
          email: email.trim(),
          role,
          is_active: isActive,
          password: password.trim() ? password : undefined,
        });
        success(`Pengguna '${editingUser.username}' berhasil diperbarui.`);
      } else {
        if (!password.trim() || password.length < 6) {
          error('Kata sandi wajib diisi minimal 6 karakter.');
          return;
        }
        await api.createUser({
          username: username.trim(),
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          role,
        });
        success(`Pengguna '${username}' berhasil dibuat.`);
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menyimpan pengguna');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna & RBAC</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan akun internal staf UPT ICT Politeknik Kampar (Administrator dan Operator/Teknisi).
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengguna Internal</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Pengguna</th>
                <th className="py-3.5 px-4">Role Akses</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-4">Login Terakhir</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{u.full_name}</div>
                      <div className="font-mono text-slate-400 text-[11px]">@{u.username}</div>
                    </td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      {u.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString('id-ID') : 'Belum pernah'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? `Edit Pengguna: @${editingUser.username}` : 'Tambah Pengguna Baru'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {!editingUser && (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Username</label>
              <input
                type="text"
                required
                placeholder="nama_pengguna"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Nama Lengkap & Gelar</label>
            <input
              type="text"
              required
              placeholder="Mahdiawan N.K., S.Kom."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Email Resmi</label>
            <input
              type="email"
              required
              placeholder="nama@politeknikkampar.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              {editingUser ? 'Reset Kata Sandi (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Role Akun</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              <option value="OPERATOR">OPERATOR / TEKNISI (CRUD Inventaris, Mutasi, Servis)</option>
              <option value="ADMIN">ADMINISTRATOR (Seluruh Hak Akses + Pengguna & Backup)</option>
            </select>
          </div>

          {editingUser && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="font-semibold text-slate-800">Akun Aktif (Dapat Login)</span>
              </label>
              <span className="text-[10px] text-slate-400 block mt-1">
                Sistem secara otomatis mencegah penonaktifan satu-satunya administrator aktif.
              </span>
            </div>
          )}

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
              {saving ? 'Menyimpan...' : 'Simpan Pengguna'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
