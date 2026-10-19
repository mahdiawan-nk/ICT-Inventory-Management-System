import { Router, Response } from 'express';
import { AccessCodeService } from '../services/access-code-service';
import { InventoryService } from '../services/inventory-service';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { storage } from '../storage/json-storage';
import { Category, Location, InventoryItem } from '../types';

export const reviewRouter = Router();

// Middleware helper specifically for review routes
async function requireReviewAuth(req: AuthenticatedRequest, res: Response, next: () => void) {
  const token = (req.headers['x-review-token'] as string) || (req.cookies && req.cookies['ict_review_session']);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Kode akses belum dimasukkan atau sesi telah berakhir.',
    });
  }

  const session = await AccessCodeService.getSessionByToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Sesi akses review tidak valid atau kode telah kedaluwarsa/dicabut.',
    });
  }

  req.reviewSession = session;
  next();
}

// 1. Enter review access code (Public endpoint)
reviewRouter.post('/access', async (req, res: Response) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Kode akses wajib diisi.',
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const { session, token } = await AccessCodeService.authenticateReviewer(code, ip);

    // Set HttpOnly cookie for session
    res.cookie('ict_review_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: (session.expires_at ? new Date(session.expires_at).getTime() - Date.now() : 7200000),
    });

    return res.json({
      success: true,
      message: `Akses berhasil diberikan sebagai ${session.role}.`,
      data: {
        session,
        token,
      },
    });
  } catch (err: unknown) {
    return res.status(401).json({
      success: false,
      message: (err as Error).message || 'Gagal memproses kode akses.',
    });
  }
});

// 2. Current Review Session details
reviewRouter.get('/me', requireReviewAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: req.reviewSession,
  });
});

// 3. Review Logout
reviewRouter.post('/logout', (req, res: Response) => {
  res.clearCookie('ict_review_session');
  return res.json({
    success: true,
    message: 'Sesi review berhasil diakhiri.',
  });
});

// 4. Scoped Read-Only Inventory List
reviewRouter.get('/inventory', requireReviewAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = req.reviewSession!;
    const filter = {
      search: req.query.search as string,
      category_id: req.query.category_id as string,
      condition: req.query.condition as string,
      operational_status: req.query.operational_status as string,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      scope_type: session.scope_type,
      scope_value: session.scope_value,
    };

    const result = await InventoryService.listInventory(filter);

    // Filter out internal sensitive fields for viewers
    const publicItems = result.items.map((item) => ({
      id: item.id,
      asset_code: item.asset_code,
      asset_name: item.asset_name,
      category_id: item.category_id,
      subcategory: item.subcategory,
      brand: item.brand,
      model: item.model,
      serial_number: item.serial_number,
      asset_type: item.asset_type,
      description: item.description,
      specifications: item.specifications,
      acquisition_date: item.acquisition_date,
      building: item.building,
      room: item.room,
      rack_position: item.rack_position,
      department: item.department,
      person_in_charge: item.person_in_charge,
      condition: item.condition,
      operational_status: item.operational_status,
      criticality: item.criticality,
      primary_photo_drive_file_id: item.primary_photo_drive_file_id,
      additional_photos: item.additional_photos,
      document_attachments: item.document_attachments,
      // For reviewers, provide acquisition cost if relevant for audit
      acquisition_cost: session.role === 'REVIEWER' ? item.acquisition_cost : undefined,
    }));

    return res.json({
      success: true,
      data: publicItems,
      meta: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        scope: {
          type: session.scope_type,
          value: session.scope_value,
          role: session.role,
        },
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// 5. Scoped Read-Only Asset Detail
reviewRouter.get('/inventory/:id', requireReviewAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = req.reviewSession!;
    const item = await InventoryService.getById(req.params.id, {
      scope_type: session.scope_type,
      scope_value: session.scope_value,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Aset tidak ditemukan atau berada di luar cakupan izin akses Anda.',
      });
    }

    return res.json({
      success: true,
      data: {
        ...item,
        acquisition_cost: session.role === 'REVIEWER' ? item.acquisition_cost : undefined,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// 6. Reviewer / Auditor Report Checklist
reviewRouter.get('/reports', requireReviewAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = req.reviewSession!;
    const filter = {
      scope_type: session.scope_type,
      scope_value: session.scope_value,
      limit: 1000,
    };
    const { items, total } = await InventoryService.listInventory(filter);

    const conditionStats = {
      GOOD: items.filter((i) => i.condition === 'GOOD').length,
      MINOR_DAMAGE: items.filter((i) => i.condition === 'MINOR_DAMAGE').length,
      DAMAGED: items.filter((i) => i.condition === 'DAMAGED').length,
      UNUSABLE: items.filter((i) => i.condition === 'UNUSABLE').length,
    };

    const statusStats = {
      ACTIVE: items.filter((i) => i.operational_status === 'ACTIVE').length,
      STORED: items.filter((i) => i.operational_status === 'STORED').length,
      BORROWED: items.filter((i) => i.operational_status === 'BORROWED').length,
      MAINTENANCE: items.filter((i) => i.operational_status === 'MAINTENANCE').length,
      LOST: items.filter((i) => i.operational_status === 'LOST').length,
      DISPOSED: items.filter((i) => i.operational_status === 'DISPOSED').length,
    };

    const totalValuation = session.role === 'REVIEWER'
      ? items.reduce((sum, item) => sum + (Number(item.acquisition_cost) || 0), 0)
      : undefined;

    return res.json({
      success: true,
      data: {
        summary: {
          total_assets: total,
          total_valuation: totalValuation,
          condition: conditionStats,
          operational_status: statusStats,
        },
        audit_scope: {
          role: session.role,
          label: session.label,
          scope_type: session.scope_type,
          scope_value: session.scope_value,
          expires_at: session.expires_at,
        },
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
