import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { AssetDisposal, InventoryItem } from '../types';
import { AuthenticatedRequest, requireOperatorOrAdmin, requireAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const disposalRouter = Router();

// List disposal proposals
disposalRouter.get('/', authenticateAny, async (req, res: Response) => {
  try {
    let list = await storage.find<AssetDisposal>('disposals');
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return res.json({ success: true, data: list });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Propose asset disposal (Operator or Admin)
disposalRouter.post('/', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asset_id, reason, method, notes, supporting_docs } = req.body;
    if (!asset_id || !reason) {
      return res.status(400).json({ success: false, message: 'Aset dan alasan usulan penghapusan wajib diisi.' });
    }

    const asset = await storage.findById<InventoryItem>('inventory', asset_id);
    if (!asset) return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });

    const seq = await storage.getNextSequence('seq-disposals', 1);
    const year = new Date().getFullYear();
    const disposal_number = `DISP-${year}-${String(seq).padStart(4, '0')}`;

    const newDisp: AssetDisposal = {
      id: `disp-${Date.now().toString(36)}`,
      asset_id,
      disposal_number,
      reason: reason.trim(),
      last_condition: asset.condition,
      proposed_by: req.user!.username,
      proposed_at: new Date().toISOString(),
      status: 'PROPOSED',
      method: method?.trim(),
      notes: notes?.trim(),
      supporting_docs: supporting_docs || [],
      created_at: new Date().toISOString(),
    };

    await storage.create('disposals', newDisp);

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'PROPOSE_DISPOSAL',
      resource_type: 'DISPOSAL',
      resource_id: newDisp.id,
      summary: `Usulan penghapusan aset ${asset.asset_code} (${asset.asset_name}): ${newDisp.reason}`,
    });

    return res.status(201).json({
      success: true,
      message: `Usulan penghapusan nomor ${newDisp.disposal_number} berhasil diajukan.`,
      data: newDisp,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Approve or reject disposal (Admin only)
disposalRouter.post('/:id/action', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, notes } = req.body; // action: 'APPROVE' or 'REJECT'
    const disp = await storage.findById<AssetDisposal>('disposals', req.params.id);
    if (!disp) return res.status(404).json({ success: false, message: 'Usulan penghapusan tidak ditemukan' });

    if (action === 'APPROVE') {
      const now = new Date().toISOString();
      const updated = await storage.update<AssetDisposal>('disposals', req.params.id, {
        status: 'APPROVED',
        approved_by: req.user!.username,
        approved_at: now,
        disposal_date: now.slice(0, 10),
        notes: notes ? `${disp.notes ? disp.notes + '\n' : ''}Persetujuan: ${notes}` : disp.notes,
      });

      // Update asset operational status to DISPOSED
      await storage.update<InventoryItem>('inventory', disp.asset_id, {
        operational_status: 'DISPOSED',
        deleted_at: now,
        deleted_by: req.user!.userId,
      });

      await AuditService.log({
        actor_id: req.user!.userId,
        actor_name: req.user!.username,
        role: req.user!.role,
        action: 'APPROVE_DISPOSAL',
        resource_type: 'DISPOSAL',
        resource_id: disp.id,
        summary: `Admin '${req.user!.username}' menyetujui penghapusan aset (SK/Dok: ${disp.disposal_number})`,
      });

      return res.json({ success: true, message: 'Usulan penghapusan disetujui dan aset telah dihapusbukukan.', data: updated });
    } else if (action === 'REJECT') {
      const updated = await storage.update<AssetDisposal>('disposals', req.params.id, {
        status: 'REJECTED',
        approved_by: req.user!.username,
        approved_at: new Date().toISOString(),
        notes: notes ? `${disp.notes ? disp.notes + '\n' : ''}Penolakan: ${notes}` : disp.notes,
      });

      await AuditService.log({
        actor_id: req.user!.userId,
        actor_name: req.user!.username,
        role: req.user!.role,
        action: 'REJECT_DISPOSAL',
        resource_type: 'DISPOSAL',
        resource_id: disp.id,
        summary: `Admin '${req.user!.username}' menolak usulan penghapusan ${disp.disposal_number}`,
      });

      return res.json({ success: true, message: 'Usulan penghapusan ditolak.', data: updated });
    }

    return res.status(400).json({ success: false, message: 'Aksi tidak valid. Gunakan APPROVE atau REJECT.' });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});
