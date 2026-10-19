import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Shield,
  Tag,
  Wrench,
  ArrowRightLeft,
  CalendarClock,
  Trash2,
  Upload,
  Image as ImageIcon,
  Check,
  Printer,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { InventoryItem, User as CurrentUser, ReviewSession, DriveAttachment } from '../types';
import { ConditionBadge, StatusBadge, CriticalityBadge } from '../components/Badge';
import { useToast } from '../components/Toast';

interface InventoryDetailPageProps {
  assetId: string;
  currentUser: CurrentUser | null;
  reviewSession: ReviewSession | null;
  onBack: () => void;
  onEdit: (item: InventoryItem) => void;
  onOpenMutationModal?: (item: InventoryItem) => void;
  onOpenLoanModal?: (item: InventoryItem) => void;
  onOpenMaintenanceModal?: (item: InventoryItem) => void;
  onOpenDisposalModal?: (item: InventoryItem) => void;
}

export function InventoryDetailPage({
  assetId,
  currentUser,
  reviewSession,
  onBack,
  onEdit,
  onOpenMutationModal,
  onOpenLoanModal,
  onOpenMaintenanceModal,
  onOpenDisposalModal,
}: InventoryDetailPageProps) {
  const { success, error } = useToast();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);

  const isReviewer = Boolean(reviewSession);
  const isOperatorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR';

  useEffect(() => {
    loadItem();
  }, [assetId]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const res = isReviewer
        ? await api.getReviewInventoryDetail(assetId)
        : await api.getInventoryById(assetId);
      if (res.success) {
        setItem(res.data);
        if (res.data.additional_photos && res.data.additional_photos.length > 0) {
          const primary = res.data.additional_photos.find((p) => p.drive_file_id === res.data.primary_photo_drive_file_id) || res.data.additional_photos[0];
          setActivePhotoUrl(primary.url || null);
        }
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat detail aset');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    try {
      setUploadingPhoto(true);
      const uploadRes = await api.uploadPhoto(file, 'Assets');
      if (uploadRes.success) {
        const attachRes = await api.attachPhotoToAsset(item.id, uploadRes.data, false);
        if (attachRes.success) {
          setItem(attachRes.data);
          setActivePhotoUrl(uploadRes.data.url || null);
          success('Foto aset berhasil diunggah dan disimpan.');
        }
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mengunggah foto');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSetPrimary = async (fileId: string) => {
    if (!item) return;
    try {
      const res = await api.setPrimaryPhoto(item.id, fileId);
      if (res.success) {
        setItem(res.data);
        success('Foto utama aset diperbarui.');
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mengubah foto utama');
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Aset tidak ditemukan atau Anda tidak memiliki akses.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Inventaris</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Print Label Button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition"
            title="Cetak label / kartu aset"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Tag Aset</span>
          </button>

          {isOperatorOrAdmin && !item.deleted_at && (
            <>
              {onOpenMutationModal && (
                <button
                  onClick={() => onOpenMutationModal(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Mutasi Aset</span>
                </button>
              )}

              {onOpenLoanModal && item.operational_status !== 'BORROWED' && (
                <button
                  onClick={() => onOpenLoanModal(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Pinjamkan</span>
                </button>
              )}

              {onOpenMaintenanceModal && (
                <button
                  onClick={() => onOpenMaintenanceModal(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Servis / Tiket</span>
                </button>
              )}

              {onOpenDisposalModal && (
                <button
                  onClick={() => onOpenDisposalModal(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Usulkan Hapus</span>
                </button>
              )}

              <button
                onClick={() => onEdit(item)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-xs"
              >
                Edit Aset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Card with Asset Code & Badges */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {item.asset_code}
              </span>
              <ConditionBadge condition={item.condition} />
              <StatusBadge status={item.operational_status} />
              <CriticalityBadge level={item.criticality} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {item.asset_name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Merk: <strong className="text-slate-800">{item.brand}</strong> &bull; Model:{' '}
              <strong className="text-slate-800">{item.model}</strong>
              {item.serial_number ? ` • S/N: ${item.serial_number}` : ''}
            </p>
          </div>

          {/* Printable Tag Asset Badge */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl flex items-center gap-3 shrink-0">
            <div className="w-14 h-14 bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center p-1 font-mono text-[9px] text-center select-none shadow-xs">
              <div className="font-bold text-[8px] text-blue-800">UPT ICT</div>
              <div className="w-10 h-7 my-0.5 border border-dashed border-slate-400 flex items-center justify-center text-[7px] text-slate-400">
                BARCODE
              </div>
              <div className="truncate w-full text-[7px] text-slate-700">{item.asset_code}</div>
            </div>
            <div className="text-[11px] space-y-0.5">
              <div className="font-bold text-slate-900">POLITEKNIK KAMPAR</div>
              <div className="text-slate-500 text-[10px]">Aset Inventaris Resmi</div>
              <div className="text-[10px] text-blue-700 font-semibold">{item.room}</div>
            </div>
          </div>
        </div>

        {/* Media & Photos Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Photo Gallery */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Foto Aset (Google Drive)</span>
              </h3>
              {isOperatorOrAdmin && (
                <label className="cursor-pointer text-[11px] text-blue-600 font-medium hover:underline flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>{uploadingPhoto ? 'Mengunggah...' : 'Upload Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Main Preview */}
            <div className="aspect-4/3 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
              {activePhotoUrl ? (
                <img
                  src={activePhotoUrl}
                  alt={item.asset_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400 p-4 text-center">
                  <ImageIcon className="w-10 h-10 stroke-1" />
                  <span className="text-xs">Belum ada foto yang diunggah</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {item.additional_photos && item.additional_photos.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {item.additional_photos.map((photo) => (
                  <div
                    key={photo.drive_file_id}
                    onClick={() => setActivePhotoUrl(photo.url || null)}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer shrink-0 transition ${
                      activePhotoUrl === photo.url ? 'border-blue-600 shadow-xs' : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photo.url} alt={photo.file_name} className="w-full h-full object-cover" />
                    {photo.drive_file_id === item.primary_photo_drive_file_id && (
                      <span className="absolute bottom-0 inset-x-0 bg-blue-600 text-white text-[8px] text-center font-bold">
                        UTAMA
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Column 1: Lokasi & Penanggung Jawab */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
            <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-800">
              <MapPin className="w-3.5 h-3.5" />
              <span>Lokasi & Penanggung Jawab</span>
            </h3>
            <div className="space-y-2 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px]">Gedung & Ruangan:</span>
                <span className="font-semibold text-slate-900">{item.building}</span> &bull; {item.room}
              </div>
              {item.rack_position && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Posisi Rak Data Center:</span>
                  <span className="font-mono font-medium text-slate-800">{item.rack_position}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[10px]">Unit / Departemen:</span>
                <span>{item.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Penanggung Jawab (PIC):</span>
                <span className="font-semibold text-slate-900">{item.person_in_charge}</span>
                {item.responsible_position && <span className="text-slate-500"> ({item.responsible_position})</span>}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Status Kepemilikan:</span>
                <span>{item.ownership_status}</span>
              </div>
            </div>
          </div>

          {/* Details Column 2: Finansial & Garansi */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 text-xs">
            <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-800">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Perolehan & Garansi</span>
            </h3>
            <div className="space-y-2 text-slate-700">
              {item.acquisition_cost !== undefined && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Nilai Perolehan:</span>
                  <span className="font-bold text-slate-900 text-sm">{formatIDR(item.acquisition_cost)}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[10px]">Tanggal Perolehan:</span>
                <span>{item.acquisition_date || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Sumber Pendanaan:</span>
                <span>{item.funding_source || '-'}</span>
              </div>
              {item.invoice_number && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Nomor Faktur / SPK:</span>
                  <span className="font-mono text-slate-800">{item.invoice_number}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[10px]">Masa Garansi:</span>
                <span>{item.warranty_start || '-'} s/d {item.warranty_end || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specifications Block */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Spesifikasi Teknis Perangkat
          </h3>
          {item.specifications && Object.keys(item.specifications).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(item.specifications).map(([key, value]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] block font-semibold">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-800 font-medium font-mono text-[11px]">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Belum ada spesifikasi teknis tambahan tercatat.</p>
          )}

          {item.description && (
            <div className="mt-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100/60 text-xs text-slate-700">
              <strong className="text-blue-900 block mb-0.5">Deskripsi / Catatan Perangkat:</strong>
              {item.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
