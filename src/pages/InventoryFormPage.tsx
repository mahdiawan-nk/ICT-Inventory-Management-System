import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Sparkles, Plus, Trash2, Upload } from 'lucide-react';
import { api } from '../api/client';
import { InventoryItem, Category, Location, Vendor, DriveAttachment } from '../types';
import { useToast } from '../components/Toast';

interface InventoryFormPageProps {
  initialData?: InventoryItem | null;
  onBack: () => void;
  onSuccess: () => void;
}

export function InventoryFormPage({ initialData, onBack, onSuccess }: InventoryFormPageProps) {
  const { success, error } = useToast();
  const isEditing = Boolean(initialData);

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewingCode, setPreviewingCode] = useState(false);

  // Form states
  const [assetCode, setAssetCode] = useState(initialData?.asset_code || '');
  const [assetName, setAssetName] = useState(initialData?.asset_name || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [subcategory, setSubcategory] = useState(initialData?.subcategory || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number || '');
  const [assetType, setAssetType] = useState(initialData?.asset_type || 'HARDWARE');
  const [description, setDescription] = useState(initialData?.description || '');
  
  const [acquisitionDate, setAcquisitionDate] = useState(initialData?.acquisition_date || new Date().toISOString().slice(0, 10));
  const [acquisitionCost, setAcquisitionCost] = useState(initialData?.acquisition_cost?.toString() || '0');
  const [fundingSource, setFundingSource] = useState(initialData?.funding_source || 'DIPA Politeknik Kampar');
  const [vendorId, setVendorId] = useState(initialData?.vendor_id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_number || '');
  const [warrantyStart, setWarrantyStart] = useState(initialData?.warranty_start || '');
  const [warrantyEnd, setWarrantyEnd] = useState(initialData?.warranty_end || '');

  const [building, setBuilding] = useState(initialData?.building || 'Gedung Utama Politeknik Kampar');
  const [room, setRoom] = useState(initialData?.room || 'Server Room & Data Center UPT ICT');
  const [rackPosition, setRackPosition] = useState(initialData?.rack_position || '');
  const [department, setDepartment] = useState(initialData?.department || 'UPT ICT');
  const [personInCharge, setPersonInCharge] = useState(initialData?.person_in_charge || 'Mahdiawan N.K., S.Kom.');
  const [responsiblePosition, setResponsiblePosition] = useState(initialData?.responsible_position || 'Kepala UPT ICT');
  const [ownershipStatus, setOwnershipStatus] = useState(initialData?.ownership_status || 'Milik Politeknik Kampar');

  const [condition, setCondition] = useState(initialData?.condition || 'GOOD');
  const [operationalStatus, setOperationalStatus] = useState(initialData?.operational_status || 'ACTIVE');
  const [criticality, setCriticality] = useState(initialData?.criticality || 'HIGH');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Specs
  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>(() => {
    if (initialData?.specifications) {
      return Object.entries(initialData.specifications).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }
    return [
      { key: 'processor', value: '' },
      { key: 'ram', value: '' },
      { key: 'storage', value: '' },
      { key: 'ip_address', value: '' },
    ];
  });

  // Photos
  const [uploadedPhotos, setUploadedPhotos] = useState<DriveAttachment[]>(initialData?.additional_photos || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const [catRes, locRes, vndRes] = await Promise.all([
        api.getCategories(),
        api.getLocations(),
        api.getVendors(),
      ]);
      if (catRes.success) {
        setCategories(catRes.data);
        if (!categoryId && catRes.data.length > 0) {
          setCategoryId(catRes.data[0].id);
        }
      }
      if (locRes.success) setLocations(locRes.data);
      if (vndRes.success) setVendors(vndRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateCodePreview = async () => {
    if (!categoryId) return;
    try {
      setPreviewingCode(true);
      const res = await api.previewAssetCode(categoryId);
      if (res.success) {
        setAssetCode(res.data.generated_code);
        success(`Kode aset otomatis dibuat: ${res.data.generated_code}`);
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal membuat nomor aset');
    } finally {
      setPreviewingCode(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const res = await api.uploadPhoto(file, 'Assets');
      if (res.success) {
        setUploadedPhotos((prev) => [...prev, res.data]);
        success('Foto aset berhasil diunggah.');
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mengunggah foto');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim() || !brand.trim() || !model.trim() || !categoryId || !building.trim() || !room.trim() || !personInCharge.trim()) {
      error('Harap lengkapi semua kolom wajib bertanda bintang (*).');
      return;
    }

    try {
      setLoading(true);

      const specsObj: Record<string, string> = {};
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          specsObj[s.key.trim().toLowerCase()] = s.value.trim();
        }
      });

      const payload = {
        custom_asset_code: assetCode || undefined,
        asset_name: assetName.trim(),
        category_id: categoryId,
        subcategory: subcategory.trim() || undefined,
        brand: brand.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim() || undefined,
        asset_type: assetType as any,
        description: description.trim(),
        specifications: specsObj,
        acquisition_date: acquisitionDate,
        acquisition_cost: Number(acquisitionCost) || 0,
        funding_source: fundingSource.trim(),
        vendor_id: vendorId || undefined,
        invoice_number: invoiceNumber.trim() || undefined,
        warranty_start: warrantyStart || undefined,
        warranty_end: warrantyEnd || undefined,
        building: building.trim(),
        room: room.trim(),
        rack_position: rackPosition.trim() || undefined,
        department: department.trim(),
        person_in_charge: personInCharge.trim(),
        responsible_position: responsiblePosition.trim(),
        ownership_status: ownershipStatus.trim(),
        condition: condition as any,
        operational_status: operationalStatus as any,
        criticality: criticality as any,
        notes: notes.trim() || undefined,
        additional_photos: uploadedPhotos,
        primary_photo_drive_file_id: uploadedPhotos.length > 0 ? uploadedPhotos[0].drive_file_id : undefined,
      };

      if (isEditing && initialData) {
        await api.updateInventory(initialData.id, payload);
        success(`Aset ${initialData.asset_code} berhasil diperbarui.`);
      } else {
        const created = await api.createInventory(payload);
        success(`Aset ${created.data.asset_code} berhasil disimpan.`);
      }

      onSuccess();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal menyimpan aset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Inventaris</span>
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          {isEditing ? `Edit Aset: ${initialData?.asset_code}` : 'Tambah Aset Inventaris Baru'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Identitas & Kode Aset */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-100 pb-2">
            1. Identitas Perangkat & Nomor Registrasi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Category */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Kategori Aset <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) - Prefix: {c.code_prefix}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset Code Generator Preview */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-700 font-semibold">Nomor Kode Aset</label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleGenerateCodePreview}
                    disabled={previewingCode}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Otomatis</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder={isEditing ? assetCode : 'Kosongkan untuk otomatisasi nomor aset'}
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                disabled={isEditing}
                className="w-full px-3 py-2 font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white disabled:opacity-70 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: <code>ICT-[KAT]-[TAHUN]-[0001]</code>
              </span>
            </div>

            {/* Asset Name */}
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                Nama Perangkat <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Server Core Database SIAKAD / Core Switch Distribution"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Merk / Pabrikan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Dell, Cisco, HP, Lenovo, Mikrotik..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Model / Tipe <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="PowerEdge R740, Catalyst 3850..."
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nomor Seri (S/N)
              </label>
              <input
                type="text"
                placeholder="Nomor seri pabrik / Service Tag"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full font-mono px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Asset Type */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Tipe Aset <span className="text-rose-500">*</span>
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="HARDWARE">Hardware (Perangkat Keras)</option>
                <option value="SOFTWARE">Software / Lisensi</option>
                <option value="CONSUMABLE">Barang Habis Pakai / Kabel</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Lokasi & Penanggung Jawab */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-100 pb-2">
            2. Lokasi Fisik & Penanggung Jawab
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Gedung <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Ruangan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Server Room, NOC, Lab Jarkom..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Posisi Rak (Jika Ada)</label>
              <input
                type="text"
                value={rackPosition}
                onChange={(e) => setRackPosition(e.target.value)}
                placeholder="Rack 42U A1 (U18-U19)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Penanggung Jawab (PIC) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={personInCharge}
                onChange={(e) => setPersonInCharge(e.target.value)}
                placeholder="Nama staf/teknisi penanggung jawab"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Jabatan PIC</label>
              <input
                type="text"
                value={responsiblePosition}
                onChange={(e) => setResponsiblePosition(e.target.value)}
                placeholder="Kepala UPT ICT / Teknisi Jaringan"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Status Kepemilikan</label>
              <input
                type="text"
                value={ownershipStatus}
                onChange={(e) => setOwnershipStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Kondisi, Status, & Finansial */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-slate-100 pb-2">
            3. Kondisi, Status Operasional, & Perolehan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Kondisi Fisik</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              >
                <option value="GOOD">Baik</option>
                <option value="MINOR_DAMAGE">Rusak Ringan</option>
                <option value="DAMAGED">Rusak Berat</option>
                <option value="UNUSABLE">Afkir / Rusak Total</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Status Operasional</label>
              <select
                value={operationalStatus}
                onChange={(e) => setOperationalStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              >
                <option value="ACTIVE">Aktif Operasional</option>
                <option value="STORED">Disimpan (Cadangan)</option>
                <option value="BORROWED">Sedang Dipinjam</option>
                <option value="MAINTENANCE">Dalam Servis</option>
                <option value="LOST">Hilang</option>
                <option value="DISPOSED">Dihapuskan</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tingkat Kritikalitas</label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              >
                <option value="LOW">Rendah</option>
                <option value="MEDIUM">Sedang</option>
                <option value="HIGH">Tinggi</option>
                <option value="CRITICAL">Kritis (Data Center)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nilai Perolehan (IDR)</label>
              <input
                type="number"
                min="0"
                value={acquisitionCost}
                onChange={(e) => setAcquisitionCost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tanggal Perolehan</label>
              <input
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Sumber Dana</label>
              <input
                type="text"
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mulai Garansi</label>
              <input
                type="date"
                value={warrantyStart}
                onChange={(e) => setWarrantyStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Berakhir Garansi</label>
              <input
                type="date"
                value={warrantyEnd}
                onChange={(e) => setWarrantyEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">No. Faktur / SPK</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Spesifikasi Teknis Tambahan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              4. Spesifikasi Teknis Fleksibel
            </h2>
            <button
              type="button"
              onClick={() => setSpecs((prev) => [...prev, { key: '', value: '' }])}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baris Atribut</span>
            </button>
          </div>

          <div className="space-y-2">
            {specs.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Atribut (misal: processor, ram, ports, ip_address)"
                  value={item.key}
                  onChange={(e) => {
                    const newSpecs = [...specs];
                    newSpecs[index].key = e.target.value;
                    setSpecs(newSpecs);
                  }}
                  className="w-1/3 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                <input
                  type="text"
                  placeholder="Nilai spesifikasi teknis"
                  value={item.value}
                  onChange={(e) => {
                    const newSpecs = [...specs];
                    newSpecs[index].value = e.target.value;
                    setSpecs(newSpecs);
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 text-xs">
              Catatan & Deskripsi Tambahan
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan pemeliharaan khusus, konfigurasi port, atau keterangan riwayat..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>

        {/* Section 5: Foto Lampiran */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              5. Unggah Foto Aset
            </h2>
            <label className="cursor-pointer text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingPhoto ? 'Mengunggah...' : 'Pilih Foto dari Perangkat'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
          </div>

          {uploadedPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {uploadedPhotos.map((photo, i) => (
                <div key={photo.drive_file_id || i} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square group">
                  <img src={photo.url} alt={photo.file_name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Belum ada foto yang dipilih.</p>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan Aset' : 'Simpan Aset Baru'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
