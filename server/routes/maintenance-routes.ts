import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { MaintenanceRecord, InventoryItem } from '../types';
import { AuthenticatedRequest, requireOperatorOrAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const maintenanceRouter = Router();

// List maintenance records
maintenanceRouter.get('/', authenticateAny, async (req, res: Response) => {
  try {
    let list = await storage.find<MaintenanceRecord>('maintenance');
    const assetId = req.query.asset_id as string;
    const status = req.query.status as string;

    if (assetId) {
      list = list.filter((m) => m.asset_id === assetId);
    }
    if (status) {
      list = list.filter((m) => m.status === status);
    }

    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return res.json({ success: true, data: list });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Create maintenance ticket
maintenanceRouter.post('/', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asset_id, work_type, complaint, start_date, technician_vendor, cost, action_taken, status, attachments } = req.body;

    if (!asset_id || !work_type || !complaint || !start_date || !technician_vendor) {
      return res.status(400).json({
        success: false,
        message: 'Aset, jenis pekerjaan, keluhan, tanggal mulai, dan teknisi/vendor wajib diisi.',
      });
    }

    const asset = await storage.findById<InventoryItem>('inventory', asset_id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }

    const seq = await storage.getNextSequence('seq-maintenance', 1);
    const year = new Date().getFullYear();
    const ticket_number = `TIK-MNT-${year}-${String(seq).padStart(4, '0')}`;

    const newMnt: MaintenanceRecord = {
      id: `mnt-${Date.now().toString(36)}`,
      ticket_number,
      asset_id,
      work_type: work_type.trim(),
      complaint: complaint.trim(),
      start_date,
      technician_vendor: technician_vendor.trim(),
      cost: Number(cost) || 0,
      action_taken: action_taken?.trim() || '',
      status: status || 'IN_PROGRESS',
      attachments: attachments || [],
      created_at: new Date().toISOString(),
      created_by: req.user!.username,
      updated_at: new Date().toISOString(),
    };

    await storage.create('maintenance', newMnt);

    // Update asset operational status to MAINTENANCE
    if (newMnt.status === 'IN_PROGRESS' || newMnt.status === 'PENDING') {
      await storage.update<InventoryItem>('inventory', asset_id, {
        operational_status: 'MAINTENANCE',
        condition: 'DAMAGED',
      });
    }

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'CREATE_MAINTENANCE',
      resource_type: 'MAINTENANCE',
      resource_id: newMnt.id,
      summary: `Membuka tiket pemeliharaan ${newMnt.ticket_number} untuk aset ${asset.asset_code}`,
    });

    return res.status(201).json({
      success: true,
      message: `Tiket pemeliharaan ${newMnt.ticket_number} berhasil dibuat.`,
      data: newMnt,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Update maintenance ticket (e.g. complete maintenance)
maintenanceRouter.patch('/:id', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await storage.findById<MaintenanceRecord>('maintenance', req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });

    const updates: Partial<MaintenanceRecord> = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    // If marked completed, set completion date and return asset status to ACTIVE
    if (updates.status === 'COMPLETED' && !updates.completion_date) {
      updates.completion_date = new Date().toISOString().slice(0, 10);
      await storage.update<InventoryItem>('inventory', existing.asset_id, {
        operational_status: 'ACTIVE',
        condition: 'GOOD',
      });
    }

    const updated = await storage.update<MaintenanceRecord>('maintenance', req.params.id, updates);

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'UPDATE_MAINTENANCE',
      resource_type: 'MAINTENANCE',
      resource_id: req.params.id,
      summary: `Memperbarui tiket pemeliharaan ${existing.ticket_number} (Status: ${updates.status || existing.status})`,
    });

    return res.json({ success: true, message: 'Tiket pemeliharaan berhasil diperbarui', data: updated });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});
