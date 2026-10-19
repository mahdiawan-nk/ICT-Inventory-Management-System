export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER' | 'REVIEWER';

export type AssetCondition = 'GOOD' | 'MINOR_DAMAGE' | 'DAMAGED' | 'UNUSABLE';
export type OperationalStatus = 'ACTIVE' | 'STORED' | 'BORROWED' | 'MAINTENANCE' | 'LOST' | 'DISPOSED';
export type AssetCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AssetType = 'HARDWARE' | 'SOFTWARE' | 'CONSUMABLE' | 'OTHER';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface DriveAttachment {
  drive_file_id: string;
  file_name: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
  uploaded_by: string;
  url?: string;
  is_primary?: boolean;
}

export interface InventoryItem {
  id: string;
  asset_code: string;
  asset_name: string;
  category_id: string;
  subcategory?: string;
  brand: string;
  model: string;
  serial_number?: string;
  asset_type: AssetType;
  description: string;
  specifications: Record<string, string | number | boolean>;
  
  acquisition_date: string;
  acquisition_cost: number;
  funding_source: string;
  vendor_id?: string;
  invoice_number?: string;
  warranty_start?: string;
  warranty_end?: string;

  // Location & PIC
  building: string;
  room: string;
  rack_position?: string;
  department: string;
  person_in_charge: string;
  responsible_position: string;
  ownership_status: string;

  // Status & condition
  condition: AssetCondition;
  operational_status: OperationalStatus;
  criticality: AssetCriticality;
  notes?: string;

  // Photos & attachments
  primary_photo_drive_file_id?: string;
  additional_photos: DriveAttachment[];
  document_attachments: DriveAttachment[];

  // Metadata
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  code_prefix: string;
  created_at: string;
}

export interface Location {
  id: string;
  building: string;
  floor: string;
  room: string;
  rack?: string;
  notes?: string;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact_person: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  ticket_number: string;
  asset_id: string;
  work_type: string;
  complaint: string;
  start_date: string;
  completion_date?: string;
  technician_vendor: string;
  cost: number;
  action_taken?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  attachments: DriveAttachment[];
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface AssetMovement {
  id: string;
  asset_id: string;
  from_building: string;
  from_room: string;
  to_building: string;
  to_room: string;
  old_pic: string;
  new_pic: string;
  mutation_date: string;
  reason: string;
  recorded_by: string;
  created_at: string;
}

export interface AssetLoan {
  id: string;
  loan_number: string;
  asset_id: string;
  borrower_name: string;
  borrower_id: string;
  borrower_department: string;
  borrower_contact: string;
  loan_date: string;
  expected_return_date: string;
  actual_return_date?: string;
  condition_out: AssetCondition;
  condition_in?: AssetCondition;
  status: 'BORROWED' | 'RETURNED' | 'OVERDUE';
  notes?: string;
  recorded_by: string;
  created_at: string;
}

export interface AssetDisposal {
  id: string;
  asset_id: string;
  disposal_number: string;
  reason: string;
  last_condition: AssetCondition;
  proposed_by: string;
  proposed_at: string;
  approved_by?: string;
  approved_at?: string;
  disposal_date?: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  method?: string;
  notes?: string;
  supporting_docs: DriveAttachment[];
  created_at: string;
}

export interface AccessCode {
  id: string;
  label: string;
  code_hash: string;
  role: 'VIEWER' | 'REVIEWER';
  scope_type: 'ALL' | 'CATEGORY' | 'LOCATION';
  scope_value?: string;
  valid_from: string;
  valid_until: string;
  max_uses: number;
  current_uses: number;
  session_duration_minutes: number;
  status: 'ACTIVE' | 'EXPIRED' | 'EXHAUSTED' | 'REVOKED';
  created_at: string;
  created_by: string;
  last_used_at?: string;
}

export interface ReviewSession {
  id: string;
  access_code_id: string;
  token: string;
  role: 'VIEWER' | 'REVIEWER';
  label: string;
  scope_type: 'ALL' | 'CATEGORY' | 'LOCATION';
  scope_value?: string;
  created_at: string;
  expires_at: string;
  ip_address: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  role: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  timestamp: string;
  ip_address: string;
  request_id?: string;
  summary: string;
  changes_before?: Record<string, unknown> | null;
  changes_after?: Record<string, unknown> | null;
}

export interface SystemSettings {
  app_name: string;
  institution_name: string;
  unit_name: string;
  timezone: string;
  currency: string;
  asset_code_prefix: string;
  next_asset_sequence: number;
  google_drive: {
    enabled: boolean;
    folder_id: string;
    parent_folder_name: string;
    auth_type: 'SERVICE_ACCOUNT' | 'OAUTH';
    client_email?: string;
    has_private_key: boolean;
  };
  backup: {
    auto_backup: boolean;
    interval_hours: number;
    max_backup_files: number;
    last_backup_at?: string;
  };
}
