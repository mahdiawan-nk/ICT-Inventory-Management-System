import { Router, Response } from 'express';
import { AccessCodeService } from '../services/access-code-service';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth-middleware';

export const accessCodeRouter = Router();

// Admin: List all generated access codes
accessCodeRouter.get('/', requireAdmin, async (req, res: Response) => {
  try {
    const list = await AccessCodeService.listCodes();
    return res.json({
      success: true,
      data: list,
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Admin: Generate a new access code (returns raw code ONCE)
accessCodeRouter.post('/', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label, role, scope_type, scope_value, valid_from, valid_until, max_uses, session_duration_minutes } = req.body;

    if (!label || !role || !valid_until) {
      return res.status(400).json({
        success: false,
        message: 'Tujuan/Label, role (VIEWER/REVIEWER), dan batas waktu kedaluwarsa wajib diisi.',
      });
    }

    const result = await AccessCodeService.createAccessCode(
      {
        label,
        role: role as 'VIEWER' | 'REVIEWER',
        scope_type: scope_type || 'ALL',
        scope_value,
        valid_from,
        valid_until,
        max_uses: Number(max_uses) || 10,
        session_duration_minutes: Number(session_duration_minutes) || 120,
      },
      req.user!
    );

    return res.status(201).json({
      success: true,
      message: 'Kode akses berhasil dibuat. Harap salin kode ini sekarang karena hanya ditampilkan satu kali demi keamanan.',
      data: {
        accessCode: result.accessCode,
        rawCode: result.rawCode, // One-time disclosure
      },
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Admin: Revoke an access code immediately
accessCodeRouter.post('/:id/revoke', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const revoked = await AccessCodeService.revokeCode(req.params.id, req.user!);
    if (!revoked) {
      return res.status(404).json({ success: false, message: 'Kode akses tidak ditemukan.' });
    }
    return res.json({
      success: true,
      message: 'Kode akses berhasil dicabut dan tidak dapat digunakan lagi.',
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
