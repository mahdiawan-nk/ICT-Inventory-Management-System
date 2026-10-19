import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { storage } from '../storage/json-storage';
import { User } from '../types';
import { AuditService } from './audit-service';

const SESSION_SECRET = process.env.SESSION_SECRET || 'ict-polkam-inventory-secret-key-2026';

export interface AuthSession {
  userId: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'OPERATOR';
  email: string;
  exp: number;
}

export class AuthService {
  public static signToken(session: Omit<AuthSession, 'exp'>, durationHours = 12): string {
    const exp = Math.floor(Date.now() / 1000) + durationHours * 3600;
    const payload = { ...session, exp };
    const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payloadStr)
      .digest('base64url');
    return `${payloadStr}.${signature}`;
  }

  public static verifyToken(token: string): AuthSession | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [payloadStr, signature] = parts;
      const expectedSig = crypto
        .createHmac('sha256', SESSION_SECRET)
        .update(payloadStr)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8')) as AuthSession;
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  public static async authenticate(username: string, passwordPlain: string, ipAddress = '127.0.0.1'): Promise<{ user: Omit<User, 'password_hash'>; token: string } | null> {
    const users = await storage.find<User>('users', (u) => u.username.toLowerCase() === username.toLowerCase().trim());
    const user = users[0];

    if (!user || !user.is_active) {
      await AuditService.log({
        actor_id: 'anonymous',
        actor_name: username,
        role: 'ANONYMOUS',
        action: 'AUTH_FAILED',
        resource_type: 'USER',
        ip_address: ipAddress,
        summary: `Gagal login: Username '${username}' tidak ditemukan atau tidak aktif`,
      });
      return null;
    }

    const matches = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!matches) {
      await AuditService.log({
        actor_id: user.id,
        actor_name: user.username,
        role: user.role,
        action: 'AUTH_FAILED',
        resource_type: 'USER',
        resource_id: user.id,
        ip_address: ipAddress,
        summary: `Gagal login: Kata sandi salah untuk akun '${username}'`,
      });
      return null;
    }

    // Update last login
    await storage.update<User>('users', user.id, {
      last_login_at: new Date().toISOString(),
    });

    const token = this.signToken({
      userId: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      email: user.email,
    });

    await AuditService.log({
      actor_id: user.id,
      actor_name: user.username,
      role: user.role,
      action: 'LOGIN_SUCCESS',
      resource_type: 'USER',
      resource_id: user.id,
      ip_address: ipAddress,
      summary: `Pengguna '${user.username}' (${user.role}) berhasil masuk ke sistem`,
    });

    // Strip password_hash
    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public static async getAllUsers(): Promise<Array<Omit<User, 'password_hash'>>> {
    const users = await storage.find<User>('users');
    return users.map(({ password_hash, ...u }) => u);
  }

  public static async createUser(
    params: {
      username: string;
      passwordPlain: string;
      full_name: string;
      email: string;
      role: 'ADMIN' | 'OPERATOR';
    },
    adminActor: AuthSession
  ): Promise<Omit<User, 'password_hash'>> {
    const existing = await storage.find<User>('users', (u) => u.username.toLowerCase() === params.username.toLowerCase());
    if (existing.length > 0) {
      throw new Error(`Username '${params.username}' sudah digunakan`);
    }

    const password_hash = await bcrypt.hash(params.passwordPlain, 10);
    const newUser: User = {
      id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      username: params.username.trim(),
      password_hash,
      full_name: params.full_name.trim(),
      email: params.email.trim(),
      role: params.role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await storage.create('users', newUser);

    await AuditService.log({
      actor_id: adminActor.userId,
      actor_name: adminActor.username,
      role: adminActor.role,
      action: 'CREATE_USER',
      resource_type: 'USER',
      resource_id: newUser.id,
      summary: `Admin '${adminActor.username}' membuat pengguna baru '${newUser.username}' (${newUser.role})`,
    });

    const { password_hash: _, ...safe } = newUser;
    return safe;
  }

  public static async updateUser(
    userId: string,
    updates: {
      full_name?: string;
      email?: string;
      role?: 'ADMIN' | 'OPERATOR';
      is_active?: boolean;
      passwordPlain?: string;
    },
    adminActor: AuthSession
  ): Promise<Omit<User, 'password_hash'>> {
    const existing = await storage.findById<User>('users', userId);
    if (!existing) {
      throw new Error('Pengguna tidak ditemukan');
    }

    // Safety constraint: Prevent deactivating or removing last admin
    if (existing.role === 'ADMIN' && (updates.role === 'OPERATOR' || updates.is_active === false)) {
      const activeAdmins = await storage.find<User>('users', (u) => u.role === 'ADMIN' && u.is_active && u.id !== userId);
      if (activeAdmins.length === 0) {
        throw new Error('Tidak dapat menonaktifkan atau menurunkan role satu-satunya Administrator aktif');
      }
    }

    const updatePayload: Partial<User> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.full_name) updatePayload.full_name = updates.full_name.trim();
    if (updates.email) updatePayload.email = updates.email.trim();
    if (updates.role) updatePayload.role = updates.role;
    if (typeof updates.is_active === 'boolean') updatePayload.is_active = updates.is_active;
    if (updates.passwordPlain && updates.passwordPlain.trim().length >= 6) {
      updatePayload.password_hash = await bcrypt.hash(updates.passwordPlain, 10);
    }

    const updated = await storage.update<User>('users', userId, updatePayload);
    if (!updated) throw new Error('Gagal memperbarui pengguna');

    await AuditService.log({
      actor_id: adminActor.userId,
      actor_name: adminActor.username,
      role: adminActor.role,
      action: 'UPDATE_USER',
      resource_type: 'USER',
      resource_id: userId,
      summary: `Admin '${adminActor.username}' memperbarui akun '${updated.username}'`,
      changes_before: { full_name: existing.full_name, role: existing.role, is_active: existing.is_active },
      changes_after: { full_name: updated.full_name, role: updated.role, is_active: updated.is_active },
    });

    const { password_hash: _, ...safe } = updated;
    return safe;
  }
}
