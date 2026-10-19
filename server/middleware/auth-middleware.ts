import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthSession } from '../services/auth-service';
import { AccessCodeService } from '../services/access-code-service';
import { ReviewSession } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthSession;
  reviewSession?: ReviewSession;
}

// Extract token from Bearer header or Cookie
function extractToken(req: Request, cookieName: string): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  return null;
}

// Middleware: Authenticate internal staff (Admin / Operator)
export async function authenticateStaff(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req, 'ict_session');
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Autentikasi diperlukan. Silakan login terlebih dahulu.',
    });
  }

  const session = AuthService.verifyToken(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      message: 'Sesi login tidak valid atau telah kedaluwarsa.',
    });
  }

  req.user = session;
  next();
}

// Middleware: Strictly require ADMIN
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await authenticateStaff(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Operasi ini membutuhkan hak akses Administrator.',
      });
    }
    next();
  });
}

// Middleware: Allow internal staff (Admin & Operator)
export async function requireOperatorOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await authenticateStaff(req, res, () => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'OPERATOR') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Hak akses tidak memadai.',
      });
    }
    next();
  });
}

// Middleware: Allow Staff OR Reviewer/Viewer (Read-only portal access)
export async function authenticateAny(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // 1. Try staff token
  const staffToken = extractToken(req, 'ict_session');
  if (staffToken) {
    const staffSession = AuthService.verifyToken(staffToken);
    if (staffSession) {
      req.user = staffSession;
      return next();
    }
  }

  // 2. Try Review session token
  const reviewToken = (req.headers['x-review-token'] as string) || (req.cookies && req.cookies['ict_review_session']);
  if (reviewToken) {
    const reviewSession = await AccessCodeService.getSessionByToken(reviewToken);
    if (reviewSession) {
      req.reviewSession = reviewSession;
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Akses ditolak: Sesi tidak valid atau kode akses telah berakhir.',
  });
}

// Middleware: Guard write endpoints against VIEWER / REVIEWER
export function blockReadOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.reviewSession && !req.user) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak: Viewer/Reviewer hanya memiliki izin baca (Read-Only) dan tidak dapat mengubah data.',
    });
  }
  next();
}
