import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { SystemSettings } from '../types';
import { requireAdmin, AuthenticatedRequest, authenticateStaff } from '../middleware/auth-middleware';
import { DriveService } from '../services/drive-service';
import { AuditService } from '../services/audit-service';

export const settingsRouter = Router();

// Get settings
settingsRouter.get('/', authenticateStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await storage.find<SystemSettings>('settings');
    const settings = list[0] || {
      app_name: 'ICT Inventory Management System',
      institution_name: 'Politeknik Kampar',
      unit_name: 'UPT ICT',
      timezone: 'Asia/Jakarta',
      currency: 'IDR',
      asset_code_prefix: 'ICT',
      next_asset_sequence: 1,
      google_drive: {
        enabled: false,
        folder_id: '',
        parent_folder_name: 'ICT Inventory - Politeknik Kampar',
        auth_type: 'SERVICE_ACCOUNT',
        has_private_key: false,
      },
      backup: {
        auto_backup: true,
        interval_hours: 24,
        max_backup_files: 10,
      },
    };

    const driveStatus = await DriveService.getStatus();

    return res.json({
      success: true,
      data: {
        settings,
        drive_status: driveStatus,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Update settings (Admin only)
settingsRouter.patch('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await storage.find<SystemSettings>('settings');
    const current = list[0];
    if (!current) throw new Error('Pengaturan sistem tidak ditemukan');

    const updated = await storage.update<SystemSettings & { id: string }>('settings', (current as unknown as { id: string }).id || 'set-default', req.body);

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'UPDATE_SETTINGS',
      resource_type: 'SETTINGS',
      summary: `Admin '${req.user!.username}' memperbarui pengaturan sistem`,
    });

    return res.json({
      success: true,
      message: 'Pengaturan sistem berhasil disimpan.',
      data: updated,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Test Google Drive connection
settingsRouter.get('/drive/status', authenticateStaff, async (req, res: Response) => {
  try {
    const status = await DriveService.getStatus();
    return res.json({
      success: true,
      data: status,
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
