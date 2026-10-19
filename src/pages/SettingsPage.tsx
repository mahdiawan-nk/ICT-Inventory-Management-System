import React, { useState, useEffect } from 'react';
import { Settings, Cloud, HardDrive, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ExternalLink } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/Toast';

export function SettingsPage() {
  const { success, error } = useToast();
  const [settingsData, setSettingsData] = useState<any>(null);
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingDrive, setTestingDrive] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res.success) {
        setSettingsData(res.data.settings);
        setDriveStatus(res.data.drive_status);
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDrive = async () => {
    try {
      setTestingDrive(true);
      const res = await api.getDriveStatus();
      if (res.success) {
        setDriveStatus(res.data);
        if (res.data.configured) {
          success(res.data.details);
        } else {
          error(res.data.details);
        }
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memeriksa koneksi Google Drive');
    } finally {
      setTestingDrive(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Pengaturan Sistem & Konfigurasi Google Drive
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Identitas instansi, integrasi Google Drive untuk foto inventaris, dan arsitektur penyimpanan data.
        </p>
      </div>

      {/* Instansi Info Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
        <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-blue-900 border-b border-slate-100 pb-2">
          Identitas Instansi & Zona Waktu
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-slate-400 block text-[10px]">Nama Instansi:</span>
            <span className="font-semibold text-slate-900 text-sm">Politeknik Kampar</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Unit Pelaksana:</span>
            <span className="font-semibold text-slate-900 text-sm">Unit Pelaksana Teknis (UPT) ICT</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Zona Waktu Sistem:</span>
            <span className="font-mono text-slate-800">Asia/Jakarta (WIB, UTC+7)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Mata Uang Acuan:</span>
            <span className="font-mono text-slate-800">Rupiah Indonesia (IDR / Rp)</span>
          </div>
        </div>
      </div>

      {/* Google Drive Status & Setup Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Status Penyimpanan Lampiran & Foto (Google Drive API)
            </h3>
          </div>

          <button
            onClick={handleTestDrive}
            disabled={testingDrive}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition border border-blue-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingDrive ? 'animate-spin' : ''}`} />
            <span>Tes Koneksi Drive</span>
          </button>
        </div>

        {/* Live Status Indicator */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${driveStatus?.configured ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
          {driveStatus?.configured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {driveStatus?.configured ? 'Google Drive Aktif Terhubung' : 'Penyimpanan Lokal Persisten Aktif (Fallback Siap Pakai)'}
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {driveStatus?.details || 'Memeriksa status Google Drive...'}
            </p>
          </div>
        </div>

        {/* Step-by-Step Guide for Google Service Account */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-900 text-xs">
            Panduan Konfigurasi Service Account Google Drive:
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed text-[11px]">
            <li>Buka <strong>Google Cloud Console</strong> dan buat/pilih Google Cloud Project.</li>
            <li>Aktifkan <strong>Google Drive API</strong> pada menu API & Services.</li>
            <li>Buat <strong>Service Account</strong> (misal: <code>ict-inventory@polkam-cloud.iam.gserviceaccount.com</code>).</li>
            <li>Buat <strong>Key</strong> bertipe <strong>JSON</strong> pada service account tersebut dan unduh filenya.</li>
            <li>Buka Google Drive institusi, buat folder (misal: <code>ICT Inventory - Politeknik Kampar</code>), lalu klik <strong>Bagikan (Share)</strong> folder tersebut kepada email service account dengan izin <strong>Editor</strong>.</li>
            <li>Salin <strong>Folder ID</strong> dari URL Google Drive dan masukkan ke environment variable:</li>
          </ol>

          <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto">
{`# Environment Variables untuk Google Drive:
GOOGLE_DRIVE_CLIENT_EMAIL="ict-inventory@project-id.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
GOOGLE_DRIVE_FOLDER_ID="1a2b3c4d5e6f7g8h9i0j_folder_id_anda"`}
          </pre>

          <p className="text-[10px] text-slate-500 italic">
            *Catatan: Selama kredensial belum diisi, foto dan file tetap dapat diunggah secara aman dan disimpan di direktori lokal server <code>data/uploads/</code> dengan proxy URL otomatis tanpa error.
          </p>
        </div>
      </div>

      {/* Storage Architecture Explanation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 text-xs">
        <div className="flex items-center gap-2 text-indigo-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">
          <HardDrive className="w-4 h-4 text-indigo-600" />
          <span>Arsitektur Abstraksi Database JSON & Kesiapan SQL</span>
        </div>

        <p className="text-slate-600 leading-relaxed">
          Seluruh inventaris, tiket servis, mutasi, peminjaman, pengguna, dan audit log dikelola secara persisten melalui <strong>file JSON terpisah di sisi server</strong> (<code>data/*.json</code>) dengan pola:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-0.5">Atomic Write</span>
            <span className="text-slate-500 text-[11px]">Penulisan ke file sementara (.tmp) lalu rename atomik untuk mencegah file korup saat crash.</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-0.5">Mutex Locking</span>
            <span className="text-slate-500 text-[11px]">Serialisasi antrean operasi tulis per-koleksi untuk mencegah lost-update pada operasi multi-user bersamaan.</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800 block mb-0.5">Adapter Interface</span>
            <span className="text-slate-500 text-[11px]">Implementasi <code>IStorageAdapter</code> memudahkan migrasi langsung ke PostgreSQL tanpa merombak logika bisnis.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
