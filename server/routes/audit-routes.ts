import { Router, Response } from 'express';
import { AuditService } from '../services/audit-service';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth-middleware';

export const auditRouter = Router();

// List audit logs (Admin only)
auditRouter.get('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { resource_type, actor_id, action, limit, offset } = req.query;
    const result = await AuditService.getLogs({
      resource_type: resource_type as string,
      actor_id: actor_id as string,
      action: action as string,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    });

    return res.json({
      success: true,
      data: result.logs,
      meta: {
        total: result.total,
        limit: Number(limit) || 50,
        offset: Number(offset) || 0,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
