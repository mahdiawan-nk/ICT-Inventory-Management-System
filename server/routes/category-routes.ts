import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { Category } from '../types';
import { AuthenticatedRequest, requireOperatorOrAdmin, requireAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const categoryRouter = Router();

// List categories (available to all logged in or reviewers)
categoryRouter.get('/', authenticateAny, async (req, res: Response) => {
  try {
    const list = await storage.find<Category>('categories');
    return res.json({ success: true, data: list });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Create category (Admin only)
categoryRouter.post('/', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, description, code_prefix } = req.body;
    if (!code || !name || !code_prefix) {
      return res.status(400).json({ success: false, message: 'Kode, nama, dan prefix kode aset wajib diisi.' });
    }

    const newCat: Category = {
      id: `cat-${code.toLowerCase().trim()}`,
      code: code.toUpperCase().trim(),
      name: name.trim(),
      description: description?.trim() || '',
      code_prefix: code_prefix.toUpperCase().trim(),
      created_at: new Date().toISOString(),
    };

    await storage.create('categories', newCat);

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'CREATE_CATEGORY',
      resource_type: 'CATEGORY',
      resource_id: newCat.id,
      summary: `Membuat kategori inventaris baru: ${newCat.name} (${newCat.code})`,
    });

    return res.status(201).json({ success: true, message: 'Kategori berhasil dibuat', data: newCat });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Update category (Admin only)
categoryRouter.patch('/:id', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await storage.update<Category>('categories', req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    return res.json({ success: true, message: 'Kategori berhasil diperbarui', data: updated });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Delete category (Admin only)
categoryRouter.delete('/:id', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await storage.delete('categories', req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Kategori tidak ditemukan' });
    return res.json({ success: true, message: 'Kategori berhasil dihapus' });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
