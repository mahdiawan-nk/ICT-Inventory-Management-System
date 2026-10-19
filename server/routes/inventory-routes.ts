import { Router, Response } from 'express';
import { InventoryService } from '../services/inventory-service';
import {
  AuthenticatedRequest,
  requireOperatorOrAdmin,
  requireAdmin,
  blockReadOnly,
} from '../middleware/auth-middleware';

export const inventoryRouter = Router();

// Preview generated asset code
inventoryRouter.get('/code/preview', requireOperatorOrAdmin, async (req, res: Response) => {
  try {
    const categoryId = req.query.category_id as string;
    if (!categoryId) {
      return res.status(400).json({ success: false, message: 'category_id diperlukan' });
    }
    const code = await InventoryService.generateAssetCode(categoryId);
    return res.json({ success: true, data: { generated_code: code } });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// List inventory with filtering, searching, and pagination
inventoryRouter.get('/', requireOperatorOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filter = {
      search: req.query.search as string,
      category_id: req.query.category_id as string,
      building: req.query.building as string,
      room: req.query.room as string,
      condition: req.query.condition as string,
      operational_status: req.query.operational_status as string,
      criticality: req.query.criticality as string,
      include_deleted: req.query.include_deleted === 'true',
      sortBy: req.query.sortBy as 'asset_code' | 'asset_name' | 'acquisition_date' | 'acquisition_cost' | 'created_at',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 15,
    };

    const result = await InventoryService.listInventory(filter);
    return res.json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Get single inventory item by ID
inventoryRouter.get('/:id', requireOperatorOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await InventoryService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }
    return res.json({ success: true, data: item });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Create new inventory item
inventoryRouter.post('/', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { asset_name, category_id, brand, model, building, room, person_in_charge, condition, operational_status, criticality } = req.body;

    if (!asset_name || !category_id || !brand || !model || !building || !room || !person_in_charge || !condition || !operational_status || !criticality) {
      return res.status(400).json({
        success: false,
        message: 'Harap lengkapi semua data wajib aset (Nama, Kategori, Merk, Model, Lokasi, PIC, Kondisi, Status, Criticality).',
      });
    }

    const created = await InventoryService.createAsset(req.body, req.user!);
    return res.status(201).json({
      success: true,
      message: `Aset ${created.asset_code} berhasil ditambahkan.`,
      data: created,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Update inventory item
inventoryRouter.patch('/:id', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await InventoryService.updateAsset(req.params.id, req.body, req.user!);
    return res.json({
      success: true,
      message: `Aset ${updated.asset_code} berhasil diperbarui.`,
      data: updated,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Soft delete inventory item
inventoryRouter.delete('/:id', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await InventoryService.softDelete(req.params.id, req.user!);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }
    return res.json({
      success: true,
      message: 'Aset berhasil dipindahkan ke status terhapus (soft-delete).',
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Restore soft-deleted item (Admin only)
inventoryRouter.post('/:id/restore', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const restored = await InventoryService.restore(req.params.id, req.user!);
    return res.json({
      success: true,
      message: `Aset ${restored.asset_code} berhasil dipulihkan.`,
      data: restored,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Permanent delete (Admin only)
inventoryRouter.delete('/:id/permanent', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await InventoryService.permanentDelete(req.params.id, req.user!);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Aset tidak ditemukan' });
    }
    return res.json({
      success: true,
      message: 'Aset telah dihapus permanen dari sistem.',
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Attach photo to asset
inventoryRouter.post('/:id/photos', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { attachment, make_primary } = req.body;
    if (!attachment || !attachment.drive_file_id) {
      return res.status(400).json({ success: false, message: 'Data lampiran foto tidak valid.' });
    }
    const updated = await InventoryService.addPhoto(req.params.id, attachment, Boolean(make_primary), req.user!);
    return res.json({
      success: true,
      message: 'Foto aset berhasil disimpan.',
      data: updated,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Set primary photo
inventoryRouter.patch('/:id/photos/primary', requireOperatorOrAdmin, blockReadOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { file_id } = req.body;
    if (!file_id) {
      return res.status(400).json({ success: false, message: 'file_id diperlukan' });
    }
    const updated = await InventoryService.setPrimaryPhoto(req.params.id, file_id, req.user!);
    return res.json({
      success: true,
      message: 'Foto utama berhasil diatur.',
      data: updated,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});
