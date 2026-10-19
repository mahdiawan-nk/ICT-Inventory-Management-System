import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Eye, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function AuditLogsPage() {
  const { error } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [resourceType, setResourceType] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  // Diff modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [resourceType, actionFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        resource_type: resourceType,
        action: actionFilter,
        limit: 50,
      });
      if (res.success) {
        setLogs(res.data);
        setTotal(res.meta.total);
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit Trail & Jejak Aktivitas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log riwayat append-only untuk seluruh operasi penambahan, perubahan, penghapusan, dan pembuatan kode akses.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Log</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="w-48">
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
          >
            <option value="">Semua Tipe Resource</option>
            <option value="INVENTORY">INVENTORY (Aset)</option>
            <option value="USER">USER (Pengguna)</option>
            <option value="ACCESS_CODE">ACCESS_CODE (Kode Akses)</option>
            <option value="MAINTENANCE">MAINTENANCE (Servis)</option>
            <option value="LOAN">LOAN (Peminjaman)</option>
            <option value="DISPOSAL">DISPOSAL (Penghapusan)</option>
            <option value="BACKUP">BACKUP</option>
            <option value="SETTINGS">SETTINGS</option>
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Cari aksi (CREATE, UPDATE, DELETE, AUTH)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Aktor / Pengguna</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Tipe Resource</th>
                <th className="py-3 px-4">Ringkasan Aktivitas</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Memuat audit log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Tidak ada aktivitas yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.actor_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.role}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-200/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.resource_type}</td>
                    <td className="py-3 px-4 text-slate-800 max-w-sm">{log.summary}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{log.ip_address}</td>
                    <td className="py-3 px-4 text-right">
                      {(log.changes_before || log.changes_after) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Lihat Perubahan"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Modal Diff Changes */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Detail Perubahan: ${selectedLog?.action}`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <strong>Aktor:</strong> {selectedLog?.actor_name} ({selectedLog?.role})
            </div>
            <div>
              <strong>Ringkasan:</strong> {selectedLog?.summary}
            </div>
            <div>
              <strong>Waktu:</strong> {selectedLog && new Date(selectedLog.timestamp).toLocaleString('id-ID')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Sebelum Perubahan</h4>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono max-h-60">
                {selectedLog?.changes_before
                  ? JSON.stringify(selectedLog.changes_before, null, 2)
                  : '// Tidak ada data sebelumnya (Record baru)'}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Sesudah Perubahan</h4>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono max-h-60">
                {selectedLog?.changes_after
                  ? JSON.stringify(selectedLog.changes_after, null, 2)
                  : '// Record dihapus'}
              </pre>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setSelectedLog(null)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
