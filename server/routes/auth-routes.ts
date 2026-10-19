import { Router, Response } from 'express';
import { AuthService } from '../services/auth-service';
import { AuthenticatedRequest, authenticateStaff, requireAdmin } from '../middleware/auth-middleware';

export const authRouter = Router();

// Staff Login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan kata sandi wajib diisi.',
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await AuthService.authenticate(username, password, ip);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: 'Username atau kata sandi tidak cocok, atau akun telah dinonaktifkan.',
      });
    }

    // Set secure cookie
    res.cookie('ict_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 3600 * 1000,
    });

    return res.json({
      success: true,
      message: 'Login berhasil.',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      message: (err as Error).message || 'Terjadi kesalahan pada server saat login.',
    });
  }
});

// Staff Logout
authRouter.post('/logout', (req, res: Response) => {
  res.clearCookie('ict_session');
  return res.json({
    success: true,
    message: 'Berhasil keluar dari sistem.',
  });
});

// Current User Profile
authRouter.get('/me', authenticateStaff, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: req.user,
  });
});

// Admin: List all internal users
authRouter.get('/users', requireAdmin, async (req, res: Response) => {
  try {
    const users = await AuthService.getAllUsers();
    return res.json({
      success: true,
      data: users,
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// Admin: Create new internal user
authRouter.post('/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { username, password, full_name, email, role } = req.body;
    if (!username || !password || !full_name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Data pengguna tidak lengkap. Harap isi semua kolom.',
      });
    }

    const newUser = await AuthService.createUser(
      {
        username,
        passwordPlain: password,
        full_name,
        email,
        role,
      },
      req.user!
    );

    return res.status(201).json({
      success: true,
      message: `Pengguna '${newUser.username}' berhasil ditambahkan.`,
      data: newUser,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});

// Admin: Update internal user
authRouter.patch('/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AuthService.updateUser(req.params.id, req.body, req.user!);
    return res.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      data: updated,
    });
  } catch (err: unknown) {
    return res.status(400).json({ success: false, message: (err as Error).message });
  }
});
