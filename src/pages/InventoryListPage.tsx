import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  AlertCircle,
  ArchiveRestore,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { InventoryItem, Category, User, ReviewSession } from '../types';
import { ConditionBadge, StatusBadge, CriticalityBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

interface InventoryListPageProps {
  currentUser: User | null;
  reviewSession: ReviewSession | null;
  onSelectAsset: (assetId: string) => void;
  onOpenCreateModal: () => void;
  onEditAsset: (asset: InventoryItem) => void;
}

export function InventoryListPage({
  currentUser,
  reviewSession,
  onSelectAsset,
  onOpenCreateModal,
  onEditAsset,
}: InventoryListPageProps) {
  const { success, error } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<InventoryItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isReviewer = Boolean(reviewSession);
  const isAdmin = currentUser?.role === 'ADMIN';
  const isOperatorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR';

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [page, search, selectedCategory, selectedCondition, selectedStatus, includeDeleted]);

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      if (isReviewer) {
        const res = await api.getReviewInventory({
          search,
          category_id: selectedCategory,
          condition: selectedCondition,
          operational_status: selectedStatus,
          page,
          limit: 15,
        });
        if (res.success) {
          setItems(res.data);
          setTotal(res.meta.total);
          setTotalPages(res.meta.totalPages);
        }
      } else {
        const res = await api.getInventory({
          search,
          category_id: selectedCategory,
          condition: selectedCondition,
          operational_status: selectedStatus,
          include_deleted: includeDeleted,
          page,
          limit: 15,
        });
        if (res.success) {
          setItems(res.data);
          setTotal(res.meta.total);
          setTotalPages(res.meta.totalPages);
        }
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat daftar inventaris');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(true);
      await api.softDeleteInventory(deleteTarget.id);
      success(`Aset ${deleteTarget.asset_code} berhasil dipindahkan ke status terhapus (soft-delete).`);
      setDeleteTarget(null);
      loadInventory();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menghapus aset');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return;
    try {
      setActionLoading(true);
      await api.permanentDeleteInventory(permanentDeleteTarget.id);
      success(`Aset ${permanentDeleteTarget.asset_code} telah dihapus permanen dari sistem.`);
      setPermanentDeleteTarget(null);
      loadInventory();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menghapus permanen');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (item: InventoryItem) => {
    try {
      setActionLoading(true);
      await api.restoreInventory(item.id);
      success(`Aset ${item.asset_code} berhasil dipulihkan.`);
      loadInventory();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memulihkan aset');
    } finally {
      setActionLoading(false);
    }
  };

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-5">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Daftar Inventaris Aset UPT ICT
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total {total} aset tercatat pada sistem database JSON
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOperatorOrAdmin && (
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Aset Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode, nama, merk, serial..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div>
            <select
              value={selectedCondition}
              onChange={(e) => {
                setSelectedCondition(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Semua Kondisi Fisik</option>
              <option value="GOOD">Baik</option>
              <option value="MINOR_DAMAGE">Rusak Ringan</option>
              <option value="DAMAGED">Rusak Berat</option>
              <option value="UNUSABLE">Afkir / Rusak Total</option>
            </select>
          </div>

          {/* Operational Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Semua Status Operasional</option>
              <option value="ACTIVE">Aktif Operasional</option>
              <option value="STORED">Disimpan (Cadangan)</option>
              <option value="BORROWED">Sedang Dipinjam</option>
              <option value="MAINTENANCE">Dalam Servis</option>
              <option value="LOST">Hilang</option>
              <option value="DISPOSED">Dihapuskan</option>
            </select>
          </div>
        </div>

        {/* Admin Deleted Toggle */}
        {isAdmin && !isReviewer && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <span>Tampilkan aset yang telah dihapus (Soft-Deleted Items)</span>
            </label>

            {(search || selectedCategory || selectedCondition || selectedStatus || includeDeleted) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('');
                  setSelectedCondition('');
                  setSelectedStatus('');
                  setIncludeDeleted(false);
                  setPage(1);
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Reset Filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Kode Aset</th>
                <th className="py-3.5 px-4">Nama Perangkat & Merk</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Lokasi & PIC</th>
                <th className="py-3.5 px-4">Kondisi</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                      <span>Memuat data inventaris...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <span className="font-semibold text-slate-700">Tidak ada aset ditemukan</span>
                      <span className="text-[11px] text-slate-400">
                        Coba sesuaikan kata kunci pencarian atau filter yang dipilih.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition ${item.deleted_at ? 'bg-rose-50/40 text-rose-900' : ''}`}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-blue-700">
                      <button
                        onClick={() => onSelectAsset(item.id)}
                        className="hover:underline text-left"
                      >
                        {item.asset_code}
                      </button>
                      {item.deleted_at && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-700 font-sans uppercase">
                          Terhapus
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.asset_name}</div>
                      <div className="text-slate-400 text-[11px]">
                        {item.brand} {item.model} {item.serial_number ? `• SN: ${item.serial_number}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {catMap.get(item.category_id) || item.category_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{item.room}</div>
                      <div className="text-slate-400 text-[11px]">{item.person_in_charge}</div>
                    </td>
                    <td className="py-3 px-4">
                      <ConditionBadge condition={item.condition} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.operational_status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectAsset(item.id)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Lihat Detail & Spesifikasi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isOperatorOrAdmin && !item.deleted_at && (
                          <button
                            onClick={() => onEditAsset(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Data Aset"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {isOperatorOrAdmin && !item.deleted_at && (
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Aset (Soft Delete)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {isAdmin && item.deleted_at && (
                          <>
                            <button
                              onClick={() => handleRestore(item)}
                              disabled={actionLoading}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Pulihkan Aset (Restore)"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPermanentDeleteTarget(item)}
                              disabled={actionLoading}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Permanen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition font-medium text-slate-700"
              >
                Sebelumnya
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition font-medium text-slate-700"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Soft Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Penghapusan Aset (Soft Delete)"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Apakah Anda yakin ingin menghapus aset <strong>{deleteTarget?.asset_code}</strong> ({deleteTarget?.asset_name})?
          </p>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800">
            Data akan ditandai sebagai <code>deleted_at</code> dan tidak akan muncul pada daftar aktif inventaris. Administrator dapat memulihkannya kembali sewaktu-waktu.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              onClick={handleSoftDelete}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-xs"
            >
              {actionLoading ? 'Menghapus...' : 'Ya, Hapus Aset'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Permanent Delete Confirmation */}
      <Modal
        isOpen={Boolean(permanentDeleteTarget)}
        onClose={() => setPermanentDeleteTarget(null)}
        title="PERINGATAN: Hapus Permanen"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Anda akan menghapus secara <strong>PERMANEN</strong> aset <strong>{permanentDeleteTarget?.asset_code}</strong> dari file JSON database. Tindakan ini tidak dapat dibatalkan!
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setPermanentDeleteTarget(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              onClick={handlePermanentDelete}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition shadow-xs"
            >
              {actionLoading ? 'Menghapus...' : 'Hapus Permanen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
