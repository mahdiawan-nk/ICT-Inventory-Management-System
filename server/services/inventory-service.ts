import crypto from 'crypto';
import { storage } from '../storage/json-storage';
import { InventoryItem, Category, DriveAttachment } from '../types';
import { AuditService } from './audit-service';

export interface InventoryQueryFilter {
  search?: string;
  category_id?: string;
  building?: string;
  room?: string;
  condition?: string;
  operational_status?: string;
  criticality?: string;
  include_deleted?: boolean;
  sortBy?: 'asset_code' | 'asset_name' | 'acquisition_date' | 'acquisition_cost' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  // Scope restriction for Reviewer / Viewer
  scope_type?: 'ALL' | 'CATEGORY' | 'LOCATION';
  scope_value?: string;
}

export class InventoryService {
  // Generate unique asset code atomically
  public static async generateAssetCode(categoryId: string): Promise<string> {
    const categories = await storage.find<Category>('categories', (c) => c.id === categoryId);
    const cat = categories[0];
    const prefix = cat ? cat.code_prefix : 'ICT-GEN';
    const year = new Date().getFullYear();

    const sequenceKey = `${prefix}-${year}`;
    const nextSeq = await storage.getNextSequence(sequenceKey, 1);
    const padded = String(nextSeq).padStart(4, '0');

    return `${prefix}-${year}-${padded}`;
  }

  // Get filtered items with pagination
  public static async listInventory(filter: InventoryQueryFilter = {}): Promise<{
    items: InventoryItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    let all = await storage.find<InventoryItem>('inventory');

    // 1. Soft-delete filter
    if (!filter.include_deleted) {
      all = all.filter((item) => !item.deleted_at);
    }

    // 2. Access Code Scope filter (for Viewer / Reviewer)
    if (filter.scope_type === 'CATEGORY' && filter.scope_value) {
      all = all.filter((item) => item.category_id === filter.scope_value);
    } else if (filter.scope_type === 'LOCATION' && filter.scope_value) {
      const scopeVal = filter.scope_value.toLowerCase();
      all = all.filter(
        (item) =>
          item.building.toLowerCase().includes(scopeVal) ||
          item.room.toLowerCase().includes(scopeVal)
      );
    }

    // 3. User explicit filters
    if (filter.category_id) {
      all = all.filter((item) => item.category_id === filter.category_id);
    }
    if (filter.building) {
      all = all.filter((item) => item.building.toLowerCase() === filter.building!.toLowerCase());
    }
    if (filter.room) {
      all = all.filter((item) => item.room.toLowerCase().includes(filter.room!.toLowerCase()));
    }
    if (filter.condition) {
      all = all.filter((item) => item.condition === filter.condition);
    }
    if (filter.operational_status) {
      all = all.filter((item) => item.operational_status === filter.operational_status);
    }
    if (filter.criticality) {
      all = all.filter((item) => item.criticality === filter.criticality);
    }

    // 4. Keyword search
    if (filter.search) {
      const q = filter.search.toLowerCase().trim();
      all = all.filter(
        (item) =>
          item.asset_code.toLowerCase().includes(q) ||
          item.asset_name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q) ||
          (item.serial_number && item.serial_number.toLowerCase().includes(q)) ||
          item.person_in_charge.toLowerCase().includes(q) ||
          item.room.toLowerCase().includes(q)
      );
    }

    // 5. Sorting
    const sortBy = filter.sortBy || 'asset_code';
    const sortOrder = filter.sortOrder === 'desc' ? -1 : 1;

    all.sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    const total = all.length;
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 15));
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    return {
      items: all.slice(offset, offset + limit),
      total,
      page,
      totalPages,
    };
  }

  // Get single asset by ID (with scope validation)
  public static async getById(
    id: string,
    scope?: { scope_type: 'ALL' | 'CATEGORY' | 'LOCATION'; scope_value?: string }
  ): Promise<InventoryItem | null> {
    const item = await storage.findById<InventoryItem>('inventory', id);
    if (!item) return null;

    if (scope && scope.scope_type === 'CATEGORY' && scope.scope_value) {
      if (item.category_id !== scope.scope_value) return null;
    } else if (scope && scope.scope_type === 'LOCATION' && scope.scope_value) {
      const scopeVal = scope.scope_value.toLowerCase();
      if (!item.building.toLowerCase().includes(scopeVal) && !item.room.toLowerCase().includes(scopeVal)) {
        return null;
      }
    }

    return item;
  }

  // Create asset (Operator & Admin)
  public static async createAsset(
    payload: Omit<InventoryItem, 'id' | 'asset_code' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'> & { custom_asset_code?: string },
    actor: { userId: string; username: string; role: string }
  ): Promise<InventoryItem> {
    // Check serial number uniqueness if provided
    if (payload.serial_number && payload.serial_number.trim()) {
      const existingSerial = await storage.find<InventoryItem>(
        'inventory',
        (i) => !i.deleted_at && i.serial_number?.toLowerCase() === payload.serial_number!.trim().toLowerCase()
      );
      if (existingSerial.length > 0) {
        throw new Error(`Serial number '${payload.serial_number}' sudah terdaftar pada aset: ${existingSerial[0].asset_code} (${existingSerial[0].asset_name})`);
      }
    }

    const asset_code = payload.custom_asset_code?.trim() || (await this.generateAssetCode(payload.category_id));

    // Check code uniqueness
    const existingCode = await storage.find<InventoryItem>('inventory', (i) => i.asset_code.toLowerCase() === asset_code.toLowerCase());
    if (existingCode.length > 0) {
      throw new Error(`Kode aset '${asset_code}' sudah ada.`);
    }

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      asset_code,
      asset_name: payload.asset_name.trim(),
      category_id: payload.category_id,
      subcategory: payload.subcategory?.trim(),
      brand: payload.brand.trim(),
      model: payload.model.trim(),
      serial_number: payload.serial_number?.trim() || undefined,
      asset_type: payload.asset_type || 'HARDWARE',
      description: payload.description?.trim() || '',
      specifications: payload.specifications || {},
      acquisition_date: payload.acquisition_date,
      acquisition_cost: Number(payload.acquisition_cost) || 0,
      funding_source: payload.funding_source?.trim() || '',
      vendor_id: payload.vendor_id || undefined,
      invoice_number: payload.invoice_number?.trim() || undefined,
      warranty_start: payload.warranty_start || undefined,
      warranty_end: payload.warranty_end || undefined,
      building: payload.building.trim(),
      room: payload.room.trim(),
      rack_position: payload.rack_position?.trim() || undefined,
      department: payload.department?.trim() || 'UPT ICT',
      person_in_charge: payload.person_in_charge.trim(),
      responsible_position: payload.responsible_position?.trim() || '',
      ownership_status: payload.ownership_status?.trim() || 'Milik Politeknik Kampar',
      condition: payload.condition,
      operational_status: payload.operational_status,
      criticality: payload.criticality,
      notes: payload.notes?.trim() || undefined,
      primary_photo_drive_file_id: payload.primary_photo_drive_file_id,
      additional_photos: payload.additional_photos || [],
      document_attachments: payload.document_attachments || [],
      created_at: new Date().toISOString(),
      created_by: actor.userId,
      updated_at: new Date().toISOString(),
      updated_by: actor.userId,
      deleted_at: null,
      deleted_by: null,
    };

    await storage.create('inventory', newItem);

    await AuditService.log({
      actor_id: actor.userId,
      actor_name: actor.username,
      role: actor.role,
      action: 'CREATE_INVENTORY',
      resource_type: 'INVENTORY',
      resource_id: newItem.id,
      summary: `Menambahkan aset baru: ${newItem.asset_code} - ${newItem.asset_name}`,
      changes_after: {
        asset_code: newItem.asset_code,
        asset_name: newItem.asset_name,
        category_id: newItem.category_id,
        condition: newItem.condition,
        cost: newItem.acquisition_cost,
      },
    });

    return newItem;
  }

  // Update asset
  public static async updateAsset(
    id: string,
    updates: Partial<InventoryItem>,
    actor: { userId: string; username: string; role: string }
  ): Promise<InventoryItem> {
    const existing = await storage.findById<InventoryItem>('inventory', id);
    if (!existing) {
      throw new Error('Aset tidak ditemukan');
    }

    if (existing.deleted_at) {
      throw new Error('Aset sedang dalam status terhapus (soft-deleted). Pulihkan terlebih dahulu.');
    }

    // Check serial uniqueness if changed
    if (updates.serial_number && updates.serial_number.trim() !== existing.serial_number) {
      const existingSerial = await storage.find<InventoryItem>(
        'inventory',
        (i) => i.id !== id && !i.deleted_at && i.serial_number?.toLowerCase() === updates.serial_number!.trim().toLowerCase()
      );
      if (existingSerial.length > 0) {
        throw new Error(`Serial number '${updates.serial_number}' sudah terdaftar pada aset: ${existingSerial[0].asset_code}`);
      }
    }

    const payload: Partial<InventoryItem> = {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: actor.userId,
    };

    // Protect immutable fields
    delete payload.id;
    delete payload.asset_code;
    delete payload.created_at;
    delete payload.created_by;
    delete payload.deleted_at;
    delete payload.deleted_by;

    const updated = await storage.update<InventoryItem>('inventory', id, payload);
    if (!updated) throw new Error('Gagal memperbarui aset');

    await AuditService.log({
      actor_id: actor.userId,
      actor_name: actor.username,
      role: actor.role,
      action: 'UPDATE_INVENTORY',
      resource_type: 'INVENTORY',
      resource_id: id,
      summary: `Memperbarui aset: ${updated.asset_code} - ${updated.asset_name}`,
      changes_before: {
        condition: existing.condition,
        status: existing.operational_status,
        room: existing.room,
        pic: existing.person_in_charge,
      },
      changes_after: {
        condition: updated.condition,
        status: updated.operational_status,
        room: updated.room,
        pic: updated.person_in_charge,
      },
    });

    return updated;
  }

  // Soft delete (Operator & Admin)
  public static async softDelete(
    id: string,
    actor: { userId: string; username: string; role: string }
  ): Promise<boolean> {
    const existing = await storage.findById<InventoryItem>('inventory', id);
    if (!existing) return false;

    await storage.update<InventoryItem>('inventory', id, {
      deleted_at: new Date().toISOString(),
      deleted_by: actor.userId,
      operational_status: 'DISPOSED',
    });

    await AuditService.log({
      actor_id: actor.userId,
      actor_name: actor.username,
      role: actor.role,
      action: 'SOFT_DELETE_INVENTORY',
      resource_type: 'INVENTORY',
      resource_id: id,
      summary: `Menghapus aset (soft-delete): ${existing.asset_code} - ${existing.asset_name}`,
    });

    return true;
  }

  // Restore soft-deleted asset (Admin only)
  public static async restore(
    id: string,
    actor: { userId: string; username: string; role: string }
  ): Promise<InventoryItem> {
    const existing = await storage.findById<InventoryItem>('inventory', id);
    if (!existing) throw new Error('Aset tidak ditemukan');
    if (!existing.deleted_at) throw new Error('Aset ini tidak dalam status terhapus');

    const updated = await storage.update<InventoryItem>('inventory', id, {
      deleted_at: null,
      deleted_by: null,
      operational_status: 'ACTIVE',
      updated_at: new Date().toISOString(),
      updated_by: actor.userId,
    });

    await AuditService.log({
      actor_id: actor.userId,
      actor_name: actor.username,
      role: actor.role,
      action: 'RESTORE_INVENTORY',
      resource_type: 'INVENTORY',
      resource_id: id,
      summary: `Admin '${actor.username}' memulihkan aset: ${existing.asset_code} - ${existing.asset_name}`,
    });

    return updated!;
  }

  // Permanent Delete (Admin only)
  public static async permanentDelete(
    id: string,
    actor: { userId: string; username: string; role: string }
  ): Promise<boolean> {
    const existing = await storage.findById<InventoryItem>('inventory', id);
    if (!existing) return false;

    const res = await storage.delete('inventory', id);

    await AuditService.log({
      actor_id: actor.userId,
      actor_name: actor.username,
      role: actor.role,
      action: 'PERMANENT_DELETE_INVENTORY',
      resource_type: 'INVENTORY',
      resource_id: id,
      summary: `PERINGATAN: Admin '${actor.username}' menghapus permanen aset ${existing.asset_code} (${existing.asset_name}) dari sistem`,
    });

    return res;
  }

  // Add photo attachment to asset
  public static async addPhoto(
    assetId: string,
    attachment: DriveAttachment,
    makePrimary = false,
    actor: { userId: string; username: string; role: string }
  ): Promise<InventoryItem> {
    const asset = await storage.findById<InventoryItem>('inventory', assetId);
    if (!asset) throw new Error('Aset tidak ditemukan');

    const photos = [...asset.additional_photos];
    if (makePrimary || !asset.primary_photo_drive_file_id) {
      asset.primary_photo_drive_file_id = attachment.drive_file_id;
      attachment.is_primary = true;
    }

    photos.push(attachment);

    const updated = await storage.update<InventoryItem>('inventory', assetId, {
      additional_photos: photos,
      primary_photo_drive_file_id: asset.primary_photo_drive_file_id,
      updated_at: new Date().toISOString(),
      updated_by: actor.userId,
    });

    return updated!;
  }

  // Set primary photo
  public static async setPrimaryPhoto(
    assetId: string,
    fileId: string,
    actor: { userId: string; username: string; role: string }
  ): Promise<InventoryItem> {
    const asset = await storage.findById<InventoryItem>('inventory', assetId);
    if (!asset) throw new Error('Aset tidak ditemukan');

    const photos = asset.additional_photos.map((p) => ({
      ...p,
      is_primary: p.drive_file_id === fileId,
    }));

    const updated = await storage.update<InventoryItem>('inventory', assetId, {
      primary_photo_drive_file_id: fileId,
      additional_photos: photos,
      updated_at: new Date().toISOString(),
      updated_by: actor.userId,
    });

    return updated!;
  }
}
