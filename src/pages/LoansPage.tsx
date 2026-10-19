import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, CheckCircle, Clock, AlertTriangle, User, Phone } from 'lucide-react';
import { api } from '../api/client';
import { AssetLoan, InventoryItem, User as CurrentUser } from '../types';
import { ConditionBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export function LoansPage({ currentUser }: { currentUser: CurrentUser | null }) {
  const { success, error } = useToast();
  const [loans, setLoans] = useState<AssetLoan[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<AssetLoan | null>(null);

  // New loan states
  const [assetId, setAssetId] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [borrowerDepartment, setBorrowerDepartment] = useState('Prodi Teknik Informatika');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [loanDate, setLoanDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Return loan states
  const [conditionIn, setConditionIn] = useState('GOOD');
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [returnNotes, setReturnNotes] = useState('');

  const isOperatorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OPERATOR';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [loanRes, invRes] = await Promise.all([
        api.getLoans(),
        api.getInventory({ limit: 100 }),
      ]);
      if (loanRes.success) setLoans(loanRes.data);
      if (invRes.success) {
        // filter assets that are not borrowed or deleted
        const available = invRes.data.filter((i) => !i.deleted_at && i.operational_status !== 'BORROWED');
        setInventoryList(available);
        if (available.length > 0 && !assetId) setAssetId(available[0].id);
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memuat data peminjaman');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !borrowerName.trim() || !borrowerContact.trim()) {
      error('Harap lengkapi semua data wajib.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.createLoan({
        asset_id: assetId,
        borrower_name: borrowerName.trim(),
        borrower_id: borrowerId.trim(),
        borrower_department: borrowerDepartment.trim(),
        borrower_contact: borrowerContact.trim(),
        loan_date: loanDate,
        expected_return_date: expectedReturnDate,
        notes: notes.trim(),
      });
      if (res.success) {
        success(`Peminjaman nomor ${res.data.loan_number} berhasil dicatat.`);
        setModalOpen(false);
        loadData();
      }
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal mencatat peminjaman');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenReturn = (loan: AssetLoan) => {
    setSelectedLoan(loan);
    setConditionIn(loan.condition_out || 'GOOD');
    setReturnNotes('');
    setReturnModalOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    try {
      setSaving(true);
      await api.returnLoan(selectedLoan.id, {
        condition_in: conditionIn,
        actual_return_date: actualReturnDate,
        notes: returnNotes.trim(),
      });
      success(`Pengembalian aset ${selectedLoan.loan_number} berhasil dicatat. Status aset kembali Aktif.`);
      setReturnModalOpen(false);
      loadData();
    } catch (err: unknown) {
      error((err as Error).message || 'Gagal memproses pengembalian');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Peminjaman Perangkat</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan peminjaman laptop dinas, toolkit teknisi, proyektor, dan switch cadangan.
          </p>
        </div>

        {isOperatorOrAdmin && (
          <button
            onClick={() => {
              setBorrowerName('');
              setBorrowerContact('');
              setNotes('');
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Peminjaman Baru</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Pinjam</th>
                <th className="py-3.5 px-4">Peminjam & Unit</th>
                <th className="py-3.5 px-4">Tanggal Pinjam</th>
                <th className="py-3.5 px-4">Rencana Kembali</th>
                <th className="py-3.5 px-4">Kondisi Awal</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Memuat data peminjaman...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Belum ada catatan peminjaman perangkat.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {loan.loan_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{loan.borrower_name}</div>
                      <div className="text-slate-400 text-[11px]">
                        {loan.borrower_department} &bull; {loan.borrower_contact}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{loan.loan_date}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {loan.expected_return_date}
                    </td>
                    <td className="py-3 px-4">
                      <ConditionBadge condition={loan.condition_out} />
                    </td>
                    <td className="py-3 px-4">
                      {loan.status === 'RETURNED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Dikembalikan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          Sedang Dipinjam
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isOperatorOrAdmin && loan.status === 'BORROWED' && (
                        <button
                          onClick={() => handleOpenReturn(loan)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                        >
                          Proses Pengembalian
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

      {/* Modal New Loan */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Formulir Peminjaman Perangkat ICT"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Pilih Perangkat</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              {inventoryList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.asset_code} - {i.asset_name} ({i.brand} {i.model})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Nama Peminjam</label>
              <input
                type="text"
                required
                placeholder="Nama Dosen / Staf / Mahasiswa"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">NIP / NIDN / NIM</label>
              <input
                type="text"
                placeholder="Nomor identitas peminjam"
                value={borrowerId}
                onChange={(e) => setBorrowerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Unit / Program Studi</label>
              <input
                type="text"
                required
                value={borrowerDepartment}
                onChange={(e) => setBorrowerDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">No. Kontak / WhatsApp</label>
              <input
                type="text"
                required
                placeholder="0812-xxxx-xxxx"
                value={borrowerContact}
                onChange={(e) => setBorrowerContact(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tanggal Pinjam</label>
              <input
                type="date"
                required
                value={loanDate}
                onChange={(e) => setLoanDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Rencana Tanggal Pengembalian</label>
              <input
                type="date"
                required
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Keperluan Pinjam</label>
            <textarea
              rows={2}
              placeholder="Contoh: Kegiatan Uji Kompetensi Kejuruan / Akreditasi Institusi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {saving ? 'Menyimpan...' : 'Simpan Peminjaman'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Return Loan */}
      <Modal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        title={`Konfirmasi Pengembalian: ${selectedLoan?.loan_number}`}
      >
        <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Kondisi Fisik Saat Dikembalikan</label>
            <select
              value={conditionIn}
              onChange={(e) => setConditionIn(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            >
              <option value="GOOD">Baik (Normal tanpa kendala)</option>
              <option value="MINOR_DAMAGE">Rusak Ringan (Ada goresan/kendala minor)</option>
              <option value="DAMAGED">Rusak Berat (Perlu perbaikan segera)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tanggal Pengembalian</label>
            <input
              type="date"
              required
              value={actualReturnDate}
              onChange={(e) => setActualReturnDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Catatan Pemeriksaan</label>
            <textarea
              rows={2}
              placeholder="Kelengkapan adaptor, kabel power, tas..."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setReturnModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Konfirmasi Pengembalian'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
