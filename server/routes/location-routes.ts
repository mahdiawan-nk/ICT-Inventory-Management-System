import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { Location } from '../types';
import { AuthenticatedRequest, requireAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const locationRouter = Router();

// List locations (all authenticated or reviewers)
locationRouter.get('/', authenticateAny, async (req, res: Response) => {
  try {
    const list = await storage.find<Location>('locations');
    return res.json({ success: true, data: list });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Create location (Admin only)
locationRouter.post('/', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { building, floor, room, rack, notes } = req.body;
    if (!building || !floor || !room) {
      return res.status(400).json({ success: false, message: 'Gedung, lantai, dan ruangan wajib diisi.' });
    }

    const newLoc: Location = {
      id: `loc-${Date.now().toString(36)}`,
      building: building.trim(),
      floor: floor.trim(),
      room: room.trim(),
      rack: rack?.trim(),
      notes: notes?.trim(),
      created_at: new Date().toISOString(),
    };

    await storage.create('locations', newLoc);

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'CREATE_LOCATION',
      resource_type: 'LOCATION',
      resource_id: newLoc.id,
      summary: `Menambahkan lokasi inventaris: ${newLoc.building} - ${newLoc.room}`,
    });

    return res.status(201).json({ success: true, message: 'Lokasi berhasil ditambahkan', data: newLoc });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Update location
locationRouter.patch('/:id', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await storage.update<Location>('locations', req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan' });
    return res.json({ success: true, message: 'Lokasi berhasil diperbarui', data: updated });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Delete location
locationRouter.delete('/:id', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await storage.delete('locations', req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Lokasi tidak ditemukan' });
    return res.json({ success: true, message: 'Lokasi berhasil dihapus' });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
