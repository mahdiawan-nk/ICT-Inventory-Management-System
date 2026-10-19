import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { AssetMovement, InventoryItem } from '../types';
import { AuthenticatedRequest, requireOperatorOrAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const movementRouter = Router();

// List movements
movementRouter.get('/', authenticateAny, async (req, res: Response) => {
  try {
    let list = await storage.find<AssetMovement>('movements');
    const assetId = req.query.asset_id as string;
    if (assetId) {
      list = list.filter((m) => m.asset_id === assetId);
    }
    list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return res.json({ success: true, data: list });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Record new asset movement / mutation
movementRouter.post('/', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asset_id, to_building, to_room, new_pic, mutation_date, reason } = req.body;

    if (!asset_id || !to_building || !to_room || !new_pic || !mutation_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Aset, gedung tujuan, ruangan tujuan, penanggung jawab baru, tanggal, dan alasan wajib diisi.',
      });
    }

    const asset = await storage.findById<InventoryItem>('inventory', asset_id);
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }

    const movement: AssetMovement = {
      id: `mov-${Date.now().toString(36)}`,
      asset_id,
      from_building: asset.building,
      from_room: asset.room,
      to_building: to_building.trim(),
      to_room: to_room.trim(),
      old_pic: asset.person_in_charge,
      new_pic: new_pic.trim(),
      mutation_date,
      reason: reason.trim(),
      recorded_by: req.user!.username,
      created_at: new Date().toISOString(),
    };

    await storage.create('movements', movement);

    // Update asset current location & PIC
    await storage.update<InventoryItem>('inventory', asset_id, {
      building: movement.to_building,
      room: movement.to_room,
      person_in_charge: movement.new_pic,
      updated_at: new Date().toISOString(),
      updated_by: req.user!.userId,
    });

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'MUTATION_INVENTORY',
      resource_type: 'INVENTORY',
      resource_id: asset_id,
      summary: `Mutasi aset ${asset.asset_code}: dipindahkan dari ${movement.from_room} ke ${movement.to_room} (PIC baru: ${movement.new_pic})`,
    });

    return res.status(201).json({
      success: true,
      message: `Mutasi aset ${asset.asset_code} berhasil dicatat.`,
      data: movement,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});
