import {
  User,
  InventoryItem,
  Category,
  Location,
  Vendor,
  MaintenanceRecord,
  AssetMovement,
  AssetLoan,
  AssetDisposal,
  AccessCode,
  ReviewSession,
  AuditLog,
  DriveAttachment,
} from '../types';

export class ApiError extends Error {
  public status: number;
  public details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private staffToken: string | null = null;
  private reviewToken: string | null = null;

  constructor() {
    this.staffToken = localStorage.getItem('ict_token');
    this.reviewToken = localStorage.getItem('ict_review_token');
  }

  public setStaffToken(token: string | null) {
    this.staffToken = token;
    if (token) localStorage.setItem('ict_token', token);
    else localStorage.removeItem('ict_token');
  }

  public setReviewToken(token: string | null) {
    this.reviewToken = token;
    if (token) localStorage.setItem('ict_review_token', token);
    else localStorage.removeItem('ict_review_token');
  }

  public getStaffToken() {
    return this.staffToken;
  }

  public getReviewToken() {
    return this.reviewToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.staffToken) {
      headers['Authorization'] = `Bearer ${this.staffToken}`;
    }

    if (this.reviewToken) {
      headers['x-review-token'] = this.reviewToken;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const contentType = res.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else if (contentType && (contentType.includes('text/csv') || contentType.includes('text/plain'))) {
      data = await res.text();
      if (!res.ok) throw new ApiError(data, res.status);
      return data as T;
    }

    if (!res.ok) {
      throw new ApiError(data?.message || 'Terjadi kesalahan pada permintaan ke server', res.status, data?.errors);
    }

    return data;
  }

  // --- AUTH ---
  public async login(username: string, password: string):Promise<{ success: boolean; data: { user: User; token: string } }> {
    const res = await this.request<{ success: boolean; data: { user: User; token: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setStaffToken(res.data.token);
    this.setReviewToken(null);
    return res;
  }

  public async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setStaffToken(null);
    }
  }

  public async getMe(): Promise<{ success: boolean; data: User }> {
    return this.request('/api/auth/me');
  }

  public async getUsers(): Promise<{ success: boolean; data: User[] }> {
    return this.request('/api/auth/users');
  }

  public async createUser(user: { username: string; password: string; full_name: string; email: string; role: 'ADMIN' | 'OPERATOR' }): Promise<{ success: boolean; data: User }> {
    return this.request('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  public async updateUser(id: string, updates: Partial<User> & { password?: string }): Promise<{ success: boolean; data: User }> {
    return this.request(`/api/auth/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // --- REVIEW ACCESS PORTAL ---
  public async submitReviewCode(code: string): Promise<{ success: boolean; message?: string; data: { session: ReviewSession; token: string } }> {
    const res = await this.request<{ success: boolean; message?: string; data: { session: ReviewSession; token: string } }>('/api/review/access', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    this.setReviewToken(res.data.token);
    this.setStaffToken(null);
    return res;
  }

  public async getReviewMe(): Promise<{ success: boolean; data: ReviewSession }> {
    return this.request('/api/review/me');
  }

  public async reviewLogout() {
    try {
      await this.request('/api/review/logout', { method: 'POST' });
    } finally {
      this.setReviewToken(null);
    }
  }

  public async getReviewInventory(params: Record<string, string | number> = {}): Promise<{ success: boolean; data: InventoryItem[]; meta: any }> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/review/inventory?${query}`);
  }

  public async getReviewInventoryDetail(id: string): Promise<{ success: boolean; data: InventoryItem }> {
    return this.request(`/api/review/inventory/${id}`);
  }

  public async getReviewReports(): Promise<{ success: boolean; data: any }> {
    return this.request('/api/review/reports');
  }

  // --- INVENTORY ---
  public async getInventory(params: Record<string, string | number | boolean> = {}): Promise<{ success: boolean; data: InventoryItem[]; meta: any }> {
    const strParams: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') strParams[k] = String(v);
    }
    const query = new URLSearchParams(strParams).toString();
    return this.request(`/api/inventory?${query}`);
  }

  public async getInventoryById(id: string): Promise<{ success: boolean; data: InventoryItem }> {
    return this.request(`/api/inventory/${id}`);
  }

  public async previewAssetCode(categoryId: string): Promise<{ success: boolean; data: { generated_code: string } }> {
    return this.request(`/api/inventory/code/preview?category_id=${categoryId}`);
  }

  public async createInventory(item: Partial<InventoryItem>): Promise<{ success: boolean; data: InventoryItem }> {
    return this.request('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  public async updateInventory(id: string, updates: Partial<InventoryItem>): Promise<{ success: boolean; data: InventoryItem }> {
    return this.request(`/api/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async softDeleteInventory(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  public async restoreInventory(id: string): Promise<{ success: boolean; data: InventoryItem }> {
    return this.request(`/api/inventory/${id}/restore`, {
      method: 'POST',
    });
  }

  public async permanentDeleteInventory(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/inventory/${id}/permanent`, {
      method: 'DELETE',
    });
  }

  public async uploadPhoto(file: File, category = 'Assets'): Promise<{ success: boolean; data: DriveAttachment }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    return this.request('/api/drive/upload', {
      method: 'POST',
      body: formData,
    });
  }

  public async attachPhotoToAsset(assetId: string, attachment: DriveAttachment, makePrimary = false): Promise<{ success: boolean; data: InventoryItem }> {
    return this.request(`/api/inventory/${assetId}/photos`, {
      method: 'POST',
      body: JSON.stringify({ attachment, make_primary: makePrimary }),
    });
  }

  public async setPrimaryPhoto(assetId: string, fileId: string): Promise<{ success: boolean; data: InventoryItem }> {
    return this.request(`/api/inventory/${assetId}/photos/primary`, {
      method: 'PATCH',
      body: JSON.stringify({ file_id: fileId }),
    });
  }

  // --- CATEGORIES, LOCATIONS, VENDORS ---
  public async getCategories(): Promise<{ success: boolean; data: Category[] }> {
    return this.request('/api/categories');
  }

  public async createCategory(cat: Partial<Category>): Promise<{ success: boolean; data: Category }> {
    return this.request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(cat),
    });
  }

  public async updateCategory(id: string, cat: Partial<Category>): Promise<{ success: boolean; data: Category }> {
    return this.request(`/api/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(cat),
    });
  }

  public async deleteCategory(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  }

  public async getLocations(): Promise<{ success: boolean; data: Location[] }> {
    return this.request('/api/locations');
  }

  public async createLocation(loc: Partial<Location>): Promise<{ success: boolean; data: Location }> {
    return this.request('/api/locations', {
      method: 'POST',
      body: JSON.stringify(loc),
    });
  }

  public async updateLocation(id: string, loc: Partial<Location>): Promise<{ success: boolean; data: Location }> {
    return this.request(`/api/locations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(loc),
    });
  }

  public async deleteLocation(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/locations/${id}`, {
      method: 'DELETE',
    });
  }

  public async getVendors(): Promise<{ success: boolean; data: Vendor[] }> {
    return this.request('/api/vendors');
  }

  public async createVendor(vnd: Partial<Vendor>): Promise<{ success: boolean; data: Vendor }> {
    return this.request('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(vnd),
    });
  }

  public async updateVendor(id: string, vnd: Partial<Vendor>): Promise<{ success: boolean; data: Vendor }> {
    return this.request(`/api/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(vnd),
    });
  }

  public async deleteVendor(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/vendors/${id}`, {
      method: 'DELETE',
    });
  }

  // --- MAINTENANCE, MOVEMENTS, LOANS, DISPOSALS ---
  public async getMaintenance(assetId?: string): Promise<{ success: boolean; data: MaintenanceRecord[] }> {
    const q = assetId ? `?asset_id=${assetId}` : '';
    return this.request(`/api/maintenance${q}`);
  }

  public async createMaintenance(m: Partial<MaintenanceRecord>): Promise<{ success: boolean; data: MaintenanceRecord }> {
    return this.request('/api/maintenance', {
      method: 'POST',
      body: JSON.stringify(m),
    });
  }

  public async updateMaintenance(id: string, updates: Partial<MaintenanceRecord>): Promise<{ success: boolean; data: MaintenanceRecord }> {
    return this.request(`/api/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async getMovements(assetId?: string): Promise<{ success: boolean; data: AssetMovement[] }> {
    const q = assetId ? `?asset_id=${assetId}` : '';
    return this.request(`/api/movements${q}`);
  }

  public async createMovement(mov: Partial<AssetMovement>): Promise<{ success: boolean; data: AssetMovement }> {
    return this.request('/api/movements', {
      method: 'POST',
      body: JSON.stringify(mov),
    });
  }

  public async getLoans(status?: string): Promise<{ success: boolean; data: AssetLoan[] }> {
    const q = status ? `?status=${status}` : '';
    return this.request(`/api/loans${q}`);
  }

  public async createLoan(loan: Partial<AssetLoan>): Promise<{ success: boolean; data: AssetLoan }> {
    return this.request('/api/loans', {
      method: 'POST',
      body: JSON.stringify(loan),
    });
  }

  public async returnLoan(id: string, payload: { condition_in?: string; actual_return_date?: string; notes?: string }): Promise<{ success: boolean; data: AssetLoan }> {
    return this.request(`/api/loans/${id}/return`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getDisposals(): Promise<{ success: boolean; data: AssetDisposal[] }> {
    return this.request('/api/disposals');
  }

  public async proposeDisposal(disp: Partial<AssetDisposal>): Promise<{ success: boolean; data: AssetDisposal }> {
    return this.request('/api/disposals', {
      method: 'POST',
      body: JSON.stringify(disp),
    });
  }

  public async actionDisposal(id: string, action: 'APPROVE' | 'REJECT', notes?: string): Promise<{ success: boolean; message?: string; data: AssetDisposal }> {
    return this.request(`/api/disposals/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, notes }),
    });
  }

  // --- ACCESS CODES (ADMIN) ---
  public async getAccessCodes(): Promise<{ success: boolean; data: AccessCode[] }> {
    return this.request('/api/admin/access-codes');
  }

  public async createAccessCode(codeData: {
    label: string;
    role: 'VIEWER' | 'REVIEWER';
    scope_type: 'ALL' | 'CATEGORY' | 'LOCATION';
    scope_value?: string;
    valid_from?: string;
    valid_until: string;
    max_uses?: number;
    session_duration_minutes?: number;
  }): Promise<{ success: boolean; data: { accessCode: AccessCode; rawCode: string } }> {
    return this.request('/api/admin/access-codes', {
      method: 'POST',
      body: JSON.stringify(codeData),
    });
  }

  public async revokeAccessCode(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/access-codes/${id}/revoke`, {
      method: 'POST',
    });
  }

  // --- REPORTS & DASHBOARD ---
  public async getDashboardStats(): Promise<{ success: boolean; data: any }> {
    return this.request('/api/reports/dashboard');
  }

  public async exportCsv(filter: Record<string, string> = {}): Promise<string> {
    const q = new URLSearchParams(filter).toString();
    return this.request(`/api/reports/export/csv?${q}`);
  }

  // --- AUDIT LOGS ---
  public async getAuditLogs(params: Record<string, string | number> = {}): Promise<{ success: boolean; data: AuditLog[]; meta: any }> {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return this.request(`/api/audit?${q}`);
  }

  // --- BACKUP & INTEGRITY ---
  public async getBackups(): Promise<{ success: boolean; data: any[] }> {
    return this.request('/api/backup');
  }

  public async createBackup(label?: string): Promise<{ success: boolean; data: any }> {
    return this.request('/api/backup', {
      method: 'POST',
      body: JSON.stringify({ label }),
    });
  }

  public async restoreBackup(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/backup/${id}/restore`, {
      method: 'POST',
    });
  }

  public async checkIntegrity(): Promise<{ success: boolean; data: any }> {
    return this.request('/api/backup/integrity/check');
  }

  // --- SETTINGS & DRIVE ---
  public async getSettings(): Promise<{ success: boolean; data: any }> {
    return this.request('/api/settings');
  }

  public async updateSettings(updates: any): Promise<{ success: boolean; data: any }> {
    return this.request('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  public async getDriveStatus(): Promise<{ success: boolean; data: any }> {
    return this.request('/api/settings/drive/status');
  }
}

export const api = new ApiClient();
