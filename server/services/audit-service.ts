import crypto from 'crypto';
import { storage } from '../storage/json-storage';
import { AuditLog } from '../types';

export class AuditService {
  public static sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;
    const cloned = JSON.parse(JSON.stringify(data));
    const sensitiveKeys = ['password', 'password_hash', 'code', 'code_hash', 'token', 'private_key'];

    const sanitizeObj = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObj(obj[key] as Record<string, unknown>);
        }
      }
    };

    if (Array.isArray(cloned)) {
      cloned.forEach((item) => {
        if (item && typeof item === 'object') sanitizeObj(item as Record<string, unknown>);
      });
    } else {
      sanitizeObj(cloned as Record<string, unknown>);
    }

    return cloned;
  }

  public static async log(params: {
    actor_id: string;
    actor_name: string;
    role: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    ip_address?: string;
    request_id?: string;
    summary: string;
    changes_before?: Record<string, unknown> | null;
    changes_after?: Record<string, unknown> | null;
  }): Promise<AuditLog> {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      role: params.role,
      action: params.action,
      resource_type: params.resource_type,
      resource_id: params.resource_id,
      timestamp: new Date().toISOString(),
      ip_address: params.ip_address || '127.0.0.1',
      request_id: params.request_id || crypto.randomUUID(),
      summary: params.summary,
      changes_before: (AuditService.sanitizeData(params.changes_before) as Record<string, unknown>) || null,
      changes_after: (AuditService.sanitizeData(params.changes_after) as Record<string, unknown>) || null,
    };

    try {
      await storage.create('audit_logs', entry);
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
    return entry;
  }

  public static async getLogs(filter?: {
    resource_type?: string;
    actor_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    let allLogs = await storage.find<AuditLog>('audit_logs');
    allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (filter?.resource_type) {
      allLogs = allLogs.filter((l) => l.resource_type === filter.resource_type);
    }
    if (filter?.actor_id) {
      allLogs = allLogs.filter((l) => l.actor_id === filter.actor_id);
    }
    if (filter?.action) {
      allLogs = allLogs.filter((l) => l.action.toLowerCase().includes(filter.action!.toLowerCase()));
    }

    const total = allLogs.length;
    const offset = filter?.offset || 0;
    const limit = filter?.limit || 50;

    return {
      logs: allLogs.slice(offset, offset + limit),
      total,
    };
  }
}
