import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const backupRouter = Router();

// List all backups
backupRouter.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backups = await storage.listBackups();
    return res.json({ success: true, data: backups });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Create new backup snapshot
backupRouter.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label } = req.body;
    const result = await storage.createBackup(label || 'manual');

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'CREATE_BACKUP',
      resource_type: 'BACKUP',
      resource_id: result.backupId,
      summary: `Admin '${req.user!.username}' membuat backup snapshot: ${result.backupId}`,
    });

    return res.status(201).json({
      success: true,
      message: `Backup ${result.backupId} berhasil dibuat.`,
      data: result,
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Restore backup
backupRouter.post('/:id/restore', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await storage.restoreBackup(req.params.id);

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'RESTORE_BACKUP',
      resource_type: 'BACKUP',
      resource_id: req.params.id,
      summary: `PERINGATAN: Admin '${req.user!.username}' memulihkan data inventaris dari backup ${req.params.id}`,
    });

    return res.json({
      success: true,
      message: result.message,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Integrity check of all JSON databases
backupRouter.get('/integrity/check', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await storage.verifyIntegrity();
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
