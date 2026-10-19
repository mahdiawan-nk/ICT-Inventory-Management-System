import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { AssetLoan, InventoryItem } from '../types';
import { AuthenticatedRequest, requireOperatorOrAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const loanRouter = Router();

// List loans
loanRouter.get('/', authenticateAny, async (req, res: Response) => {
  try {
    let list = await storage.find<AssetLoan>('loans');
    const status = req.query.status as string;
    if (status) {
      list = list.filter((l) => l.status === status);
    }
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return res.json({ success: true, data: list });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Create loan record (Pinjam Aset)
loanRouter.post('/', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asset_id, borrower_name, borrower_id, borrower_department, borrower_contact, loan_date, expected_return_date, notes } = req.body;

    if (!asset_id || !borrower_name || !borrower_contact || !loan_date || !expected_return_date) {
      return res.status(400).json({
        success: false,
        message: 'Aset, nama peminjam, kontak, tanggal pinjam, dan rencana pengembalian wajib diisi.',
      });
    }

    const asset = await storage.findById<InventoryItem>('inventory', asset_id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }

    if (asset.operational_status === 'BORROWED') {
      return res.status(400).json({ success: false, message: 'Aset saat ini sedang dipinjam oleh pihak lain.' });
    }

    const seq = await storage.getNextSequence('seq-loans', 1);
    const year = new Date().getFullYear();
    const loan_number = `PINJ-${year}-${String(seq).padStart(4, '0')}`;

    const newLoan: AssetLoan = {
      id: `loan-${Date.now().toString(36)}`,
      loan_number,
      asset_id,
      borrower_name: borrower_name.trim(),
      borrower_id: borrower_id?.trim() || '',
      borrower_department: borrower_department?.trim() || 'Unit Politeknik Kampar',
      borrower_contact: borrower_contact.trim(),
      loan_date,
      expected_return_date,
      condition_out: asset.condition,
      status: 'BORROWED',
      notes: notes?.trim(),
      recorded_by: req.user!.username,
      created_at: new Date().toISOString(),
    };

    await storage.create('loans', newLoan);

    // Update asset status
    await storage.update<InventoryItem>('inventory', asset_id, {
      operational_status: 'BORROWED',
      updated_at: new Date().toISOString(),
      updated_by: req.user!.userId,
    });

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'LOAN_ASSET',
      resource_type: 'LOAN',
      resource_id: newLoan.id,
      summary: `Peminjaman aset ${asset.asset_code} (${asset.asset_name}) kepada ${newLoan.borrower_name}`,
    });

    return res.status(201).json({
      success: true,
      message: `Peminjaman nomor ${newLoan.loan_number} berhasil dicatat.`,
      data: newLoan,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Process asset return (Kembalikan Aset)
loanRouter.post('/:id/return', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const loan = await storage.findById<AssetLoan>('loans', req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Data peminjaman tidak ditemukan' });

    if (loan.status === 'RETURNED') {
      return res.status(400).json({ success: false, message: 'Aset sudah berstatus dikembalikan sebelumnya.' });
    }

    const { condition_in, actual_return_date, notes } = req.body;
    const finalReturnDate = actual_return_date || new Date().toISOString().slice(0, 10);
    const finalCondition = condition_in || loan.condition_out;

    const updated = await storage.update<AssetLoan>('loans', req.params.id, {
      status: 'RETURNED',
      actual_return_date: finalReturnDate,
      condition_in: finalCondition,
      notes: notes ? `${loan.notes ? loan.notes + '\n' : ''}Pengembalian: ${notes}` : loan.notes,
    });

    // Update asset status back to ACTIVE
    await storage.update<InventoryItem>('inventory', loan.asset_id, {
      operational_status: 'ACTIVE',
      condition: finalCondition,
      updated_at: new Date().toISOString(),
      updated_by: req.user!.userId,
    });

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'RETURN_ASSET',
      resource_type: 'LOAN',
      resource_id: req.params.id,
      summary: `Pengembalian aset pinjaman ${loan.loan_number} oleh ${loan.borrower_name} (Kondisi: ${finalCondition})`,
    });

    return res.json({
      success: true,
      message: 'Aset berhasil dicatat kembali ke status aktif inventaris.',
      data: updated,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});
