import crypto from 'crypto';
import { storage } from '../storage/json-storage';
import { AccessCode, ReviewSession } from '../types';
import { AuditService } from './audit-service';

const SALT = process.env.ACCESS_CODE_SALT || 'polkam-ict-audit-salt-2026';

export class AccessCodeService {
  private static failedAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();

  // Hash code using HMAC-SHA256
  public static hashCode(rawCode: string): string {
    return crypto
      .createHmac('sha256', SALT)
      .update(rawCode.trim().toUpperCase())
      .digest('hex');
  }

  // Generate strong random access code format: PK-AUDIT-XXXX-XXXX
  public static generateRawCode(): string {
    const part1 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PK-AUDIT-${part1}-${part2}`;
  }

  // Create access code (Admin only). Returns plain code ONCE.
  public static async createAccessCode(
    params: {
      label: string;
      role: 'VIEWER' | 'REVIEWER';
      scope_type: 'ALL' | 'CATEGORY' | 'LOCATION';
      scope_value?: string;
      valid_from?: string;
      valid_until: string;
      max_uses?: number;
      session_duration_minutes?: number;
    },
    adminActor: { userId: string; username: string; role: string }
  ): Promise<{ accessCode: AccessCode; rawCode: string }> {
    const rawCode = this.generateRawCode();
    const code_hash = this.hashCode(rawCode);

    const newCode: AccessCode = {
      id: `ac-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      label: params.label.trim(),
      code_hash,
      role: params.role,
      scope_type: params.scope_type,
      scope_value: params.scope_value?.trim(),
      valid_from: params.valid_from || new Date().toISOString(),
      valid_until: params.valid_until,
      max_uses: params.max_uses && params.max_uses > 0 ? params.max_uses : 10,
      current_uses: 0,
      session_duration_minutes: params.session_duration_minutes || 120,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      created_by: adminActor.username,
    };

    await storage.create('access_codes', newCode);

    await AuditService.log({
      actor_id: adminActor.userId,
      actor_name: adminActor.username,
      role: adminActor.role,
      action: 'CREATE_ACCESS_CODE',
      resource_type: 'ACCESS_CODE',
      resource_id: newCode.id,
      summary: `Admin '${adminActor.username}' membuat kode akses ${newCode.role} untuk tujuan '${newCode.label}' (Scope: ${newCode.scope_type}${newCode.scope_value ? ' - ' + newCode.scope_value : ''})`,
      changes_after: { label: newCode.label, role: newCode.role, scope_type: newCode.scope_type, valid_until: newCode.valid_until },
    });

    return { accessCode: newCode, rawCode };
  }

  // Rate limiter check for brute force protection
  private static checkRateLimit(ip: string): void {
    const attempt = this.failedAttempts.get(ip);
    if (attempt) {
      if (attempt.lockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
        throw new Error(`Terlalu banyak percobaan gagal. IP diblokir sementara selama ${remainingMinutes} menit.`);
      }
      if (attempt.lockedUntil <= Date.now() && attempt.lockedUntil > 0) {
        // Reset after cooldown
        this.failedAttempts.delete(ip);
      }
    }
  }

  private static recordFailedAttempt(ip: string): void {
    const current = this.failedAttempts.get(ip) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins lockout
    }
    this.failedAttempts.set(ip, current);
  }

  private static clearFailedAttempts(ip: string): void {
    this.failedAttempts.delete(ip);
  }

  // Validate raw code, increment usage count, generate a scoped review session
  public static async authenticateReviewer(
    rawCode: string,
    ipAddress = '127.0.0.1'
  ): Promise<{ session: ReviewSession; token: string }> {
    this.checkRateLimit(ipAddress);

    const hash = this.hashCode(rawCode);
    const codes = await storage.find<AccessCode>('access_codes');
    const matchedCode = codes.find((c) => c.code_hash === hash);

    if (!matchedCode) {
      this.recordFailedAttempt(ipAddress);
      await AuditService.log({
        actor_id: 'anonymous',
        actor_name: 'Guest Reviewer',
        role: 'REVIEWER_ATTEMPT',
        action: 'ACCESS_CODE_INVALID',
        resource_type: 'ACCESS_CODE',
        ip_address: ipAddress,
        summary: `Percobaan kode akses tidak valid dari IP ${ipAddress}`,
      });
      throw new Error('Kode akses tidak valid');
    }

    // Check revoked status
    if (matchedCode.status === 'REVOKED') {
      this.recordFailedAttempt(ipAddress);
      await AuditService.log({
        actor_id: 'anonymous',
        actor_name: 'Guest Reviewer',
        role: 'REVIEWER_ATTEMPT',
        action: 'ACCESS_CODE_REVOKED',
        resource_type: 'ACCESS_CODE',
        resource_id: matchedCode.id,
        ip_address: ipAddress,
        summary: `Mencoba menggunakan kode akses yang telah dicabut (${matchedCode.label})`,
      });
      throw new Error('Kode akses ini telah dicabut oleh administrator');
    }

    const now = new Date();
    // Check valid from
    if (new Date(matchedCode.valid_from) > now) {
      throw new Error('Kode akses belum aktif');
    }

    // Check valid until
    if (new Date(matchedCode.valid_until) < now) {
      await storage.update<AccessCode>('access_codes', matchedCode.id, { status: 'EXPIRED' });
      throw new Error('Kode akses telah kedaluwarsa');
    }

    // Check max uses
    if (matchedCode.current_uses >= matchedCode.max_uses) {
      await storage.update<AccessCode>('access_codes', matchedCode.id, { status: 'EXHAUSTED' });
      throw new Error('Kode akses telah mencapai batas maksimum penggunaan');
    }

    // Code is valid! Update usages
    const updatedUses = matchedCode.current_uses + 1;
    const newStatus = updatedUses >= matchedCode.max_uses ? 'EXHAUSTED' : 'ACTIVE';
    await storage.update<AccessCode>('access_codes', matchedCode.id, {
      current_uses: updatedUses,
      status: newStatus,
      last_used_at: now.toISOString(),
    });

    this.clearFailedAttempts(ipAddress);

    // Create session
    const durationMinutes = matchedCode.session_duration_minutes || 120;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const session: ReviewSession = {
      id: `rev-sess-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      access_code_id: matchedCode.id,
      token: sessionToken,
      role: matchedCode.role,
      label: matchedCode.label,
      scope_type: matchedCode.scope_type,
      scope_value: matchedCode.scope_value,
      created_at: now.toISOString(),
      expires_at: expiresAt,
      ip_address: ipAddress,
    };

    await storage.create('review_sessions', session);

    await AuditService.log({
      actor_id: session.id,
      actor_name: `Reviewer (${matchedCode.label})`,
      role: session.role,
      action: 'REVIEW_SESSION_CREATED',
      resource_type: 'ACCESS_CODE',
      resource_id: matchedCode.id,
      ip_address: ipAddress,
      summary: `Sesi akses review (${session.role}) dibuat untuk '${matchedCode.label}' dengan scope ${session.scope_type}`,
    });

    return { session, token: sessionToken };
  }

  // Validate an existing ReviewSession token
  public static async getSessionByToken(token: string): Promise<ReviewSession | null> {
    if (!token) return null;
    const sessions = await storage.find<ReviewSession>('review_sessions', (s) => s.token === token);
    const session = sessions[0];
    if (!session) return null;

    if (new Date(session.expires_at) < new Date()) {
      return null;
    }

    // Verify parent access code is not revoked in the meantime
    const code = await storage.findById<AccessCode>('access_codes', session.access_code_id);
    if (!code || code.status === 'REVOKED') {
      return null;
    }

    return session;
  }

  // Revoke an access code
  public static async revokeCode(codeId: string, adminActor: { userId: string; username: string; role: string }): Promise<boolean> {
    const code = await storage.findById<AccessCode>('access_codes', codeId);
    if (!code) return false;

    await storage.update<AccessCode>('access_codes', codeId, { status: 'REVOKED' });

    await AuditService.log({
      actor_id: adminActor.userId,
      actor_name: adminActor.username,
      role: adminActor.role,
      action: 'REVOKE_ACCESS_CODE',
      resource_type: 'ACCESS_CODE',
      resource_id: codeId,
      summary: `Admin '${adminActor.username}' mencabut kode akses '${code.label}' (${code.role})`,
    });

    return true;
  }

  // List all access codes (Admin only, never returns raw code or hash)
  public static async listCodes(): Promise<Array<Omit<AccessCode, 'code_hash'>>> {
    const codes = await storage.find<AccessCode>('access_codes');
    return codes
      .map(({ code_hash, ...rest }) => rest)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}
