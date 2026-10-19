import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { Vendor } from '../types';
import { AuthenticatedRequest, requireAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';
import { AuditService } from '../services/audit-service';

export const vendorRouter = Router();

// List vendors
vendorRouter.get('/', authenticateAny, async (req, res: Response) => {
  try {
    const list = await storage.find<Vendor>('vendors');
    return res.json({ success: true, data: list });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Create vendor (Admin only)
vendorRouter.post('/', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, contact_person, address, phone, email, website } = req.body;
    if (!name || !contact_person || !phone) {
      return res.status(400).json({ success: false, message: 'Nama vendor, kontak person, dan nomor telepon wajib diisi.' });
    }

    const newVendor: Vendor = {
      id: `vnd-${Date.now().toString(36)}`,
      name: name.trim(),
      contact_person: contact_person.trim(),
      address: address?.trim() || '',
      phone: phone.trim(),
      email: email?.trim() || '',
      website: website?.trim() || '',
      created_at: new Date().toISOString(),
    };

    await storage.create('vendors', newVendor);

    await AuditService.log({
      actor_id: req.user!.userId,
      actor_name: req.user!.username,
      role: req.user!.role,
      action: 'CREATE_VENDOR',
      resource_type: 'VENDOR',
      resource_id: newVendor.id,
      summary: `Menambahkan vendor pengadaan: ${newVendor.name}`,
    });

    return res.status(201).json({ success: true, message: 'Vendor berhasil ditambahkan', data: newVendor });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Update vendor
vendorRouter.patch('/:id', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await storage.update<Vendor>('vendors', req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Vendor tidak ditemukan' });
    return res.json({ success: true, message: 'Vendor berhasil diperbarui', data: updated });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Delete vendor
vendorRouter.delete('/:id', requireAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deleted = await storage.delete('vendors', req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Vendor tidak ditemukan' });
    return res.json({ success: true, message: 'Vendor berhasil dihapus' });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
