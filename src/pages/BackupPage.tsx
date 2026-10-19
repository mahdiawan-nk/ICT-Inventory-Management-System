import React, { useState, useEffect } from 'react';
import { DatabaseBackup, Download, RefreshCw, ArchiveRestore, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function BackupPage() {
  const { success, error } = useToast();
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrityStatus, setIntegrityStatus] = useState<any>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);

  // New backup
  const [backupLabel, setBackupLabel] = useState('');
  const [creating, setCreating] = useState(false);

  // Restore modal
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadBackups();
    checkDatabaseIntegrity();
  }, []);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await api.getBackups();
      if (res.success) setBackups(res.data);
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat backup');
    } finally {
      setLoading(false);
    }
  };

  const checkDatabaseIntegrity = async () => {
    try {
      setCheckingIntegrity(true);
      const res = await api.checkIntegrity();
      if (res.success) setIntegrityStatus(res.data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await api.createBackup(backupLabel.trim() || 'manual_snapshot');
      if (res.success) {
        success(`Snapshot backup ${res.data.backupId} berhasil dibuat.`);
        setBackupLabel('');
        loadBackups();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal membuat backup');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    try {
      setRestoring(true);
      const res = await api.restoreBackup(restoreTarget);
      if (res.success) {
        success(res.message);
        setRestoreTarget(null);
        checkDatabaseIntegrity();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memulihkan backup');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Backup & Pemulihan Database JSON
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen snapshot berkala, rollback, dan verifikasi integritas data inventaris server.
          </p>
        </div>

        <button
          onClick={checkDatabaseIntegrity}
          disabled={checkingIntegrity}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition shadow-xs"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{checkingIntegrity ? 'Memeriksa...' : 'Periksa Integritas Database'}</span>
        </button>
      </div>

      {/* Database Integrity Health Box */}
      {integrityStatus && (
        <div className={`p-4 rounded-2xl border text-xs ${integrityStatus.valid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
          <div className="flex items-center gap-2 mb-2 font-bold">
            {integrityStatus.valid ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>Status Integritas JSON Database: {integrityStatus.valid ? 'Semua Koleksi Sehat & Valid' : 'Terdapat Kesalahan Integritas!'}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {Object.entries(integrityStatus.collections || {}).map(([col, val]: [string, any]) => (
              <div key={col} className="p-2 bg-white/80 rounded-lg border border-slate-200">
                <span className="font-mono font-bold block text-[10px] text-slate-700">{col}.json</span>
                <span className="text-slate-500 text-[11px]">{val.count} record</span>
                <span className={`block font-semibold text-[10px] ${val.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {val.valid ? 'Valid' : 'Bermasalah'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Backup Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-2">
          Buat Snapshot Backup Baru
        </h3>
        <form onSubmit={handleCreateBackup} className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="text"
            placeholder="Label backup (misal: pra_audit_2026, migrasi_gedung)..."
            value={backupLabel}
            onChange={(e) => setBackupLabel(e.target.value)}
            className="w-full sm:flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            <DatabaseBackup className="w-4 h-4" />
            <span>{creating ? 'Membuat Snapshot...' : 'Buat Backup Sekarang'}</span>
          </button>
        </form>
      </div>

      {/* Backup List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Daftar Snapshot Backup Server (data/backups)</h3>
          <span className="text-xs text-slate-400 font-medium">{backups.length} arsip tersedia</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nama Folder Backup</th>
                <th className="py-3 px-4">Waktu Pembuatan</th>
                <th className="py-3 px-4 text-right">Aksi Pemulihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">
                    Memuat daftar backup...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">
                    Belum ada file backup tersimpan.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {b.filename}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(b.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setRestoreTarget(b.id)}
                        className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition"
                      >
                        Pulihkan (Restore)
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Restore Warning */}
      <Modal
        isOpen={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        title="PERINGATAN: Pemulihan Database (Restore)"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700">
            Anda akan memulihkan data sistem dari snapshot <strong>{restoreTarget}</strong>.
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1 text-[11px]">
            <p className="font-bold">Prosedur Keamanan Otomatis:</p>
            <p>
              Sebelum data ditimpa, sistem akan secara otomatis membuat <strong>checkpoint keselamatan darurat</strong> (pre_restore_safety_checkpoint) agar data saat ini tidak hilang apabila terjadi kegagalan.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setRestoreTarget(null)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="px-4 py-2 font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl disabled:opacity-50 shadow-xs"
            >
              {restoring ? 'Memulihkan...' : 'Lanjutkan Pemulihan Data'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
