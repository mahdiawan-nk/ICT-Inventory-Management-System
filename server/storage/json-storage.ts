import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { IStorageAdapter } from './storage-interface';
import { User, Category, Location, Vendor, SystemSettings, InventoryItem } from '../types';

export class JsonStorageAdapter implements IStorageAdapter {
  private baseDir: string;
  private backupDir: string;
  private fileLocks: Map<string, Promise<unknown>> = new Map();

  constructor(baseDir = path.resolve(process.cwd(), 'data')) {
    this.baseDir = baseDir;
    this.backupDir = path.join(baseDir, 'backups');
  }

  // Mutex lock to serialize operations per collection
  private async acquireLock<T>(collection: string, operation: () => Promise<T>): Promise<T> {
    const currentLock = this.fileLocks.get(collection) || Promise.resolve();
    let releaseLock: () => void;
    const newLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.fileLocks.set(collection, newLock);

    try {
      await currentLock;
      return await operation();
    } finally {
      releaseLock!();
      if (this.fileLocks.get(collection) === newLock) {
        this.fileLocks.delete(collection);
      }
    }
  }

  private getFilePath(collection: string): string {
    return path.join(this.baseDir, `${collection}.json`);
  }

  private async readCollectionUnsafe<T>(collection: string): Promise<T[]> {
    const filePath = this.getFilePath(collection);
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      if (!raw.trim()) return [];
      return JSON.parse(raw) as T[];
    } catch (err) {
      console.error(`Error reading collection ${collection}:`, err);
      return [];
    }
  }

  // Atomic file write: write to temp file then rename
  private async writeCollectionUnsafe<T>(collection: string, data: T[]): Promise<void> {
    if (!fs.existsSync(this.baseDir)) {
      await fs.promises.mkdir(this.baseDir, { recursive: true });
    }
    const filePath = this.getFilePath(collection);
    const tempPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const jsonStr = JSON.stringify(data, null, 2);

    await fs.promises.writeFile(tempPath, jsonStr, 'utf-8');
    await fs.promises.rename(tempPath, filePath);
  }

  public async init(): Promise<void> {
    // Ensure base and backup directories exist
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    const uploadsDir = path.join(this.baseDir, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Seed defaults if not present
    await this.seedDefaults();
  }

  private async seedDefaults(): Promise<void> {
    // 1. Users
    const users = await this.readCollectionUnsafe<User>('users');
    if (users.length === 0) {
      const defaultPasswordHash = await bcrypt.hash('AdminICTPolkam2026!', 10);
      const operatorPasswordHash = await bcrypt.hash('OperatorICT2026!', 10);

      const defaultAdmin: User = {
        id: 'usr-admin-01',
        username: 'admin',
        password_hash: defaultPasswordHash,
        full_name: 'Administrator UPT ICT',
        email: 'ict@politeknikkampar.ac.id',
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const defaultOperator: User = {
        id: 'usr-operator-01',
        username: 'operator',
        password_hash: operatorPasswordHash,
        full_name: 'Teknisi Jaringan & Sistem',
        email: 'teknisi.ict@politeknikkampar.ac.id',
        role: 'OPERATOR',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await this.writeCollectionUnsafe('users', [defaultAdmin, defaultOperator]);
    }

    // 2. Categories
    const categories = await this.readCollectionUnsafe<Category>('categories');
    if (categories.length === 0) {
      const defaultCategories: Category[] = [
        {
          id: 'cat-srv',
          code: 'SRV',
          name: 'Server & Storage',
          description: 'Server fisik rackmount/tower, NAS, SAN, dan storage array',
          code_prefix: 'ICT-SRV',
          created_at: new Date().toISOString(),
        },
        {
          id: 'cat-net',
          code: 'NET',
          name: 'Perangkat Jaringan',
          description: 'Router, switch core/distribution/access, AP, firewall, ONT',
          code_prefix: 'ICT-NET',
          created_at: new Date().toISOString(),
        },
        {
          id: 'cat-com',
          code: 'COM',
          name: 'Komputer & Workstation',
          description: 'PC Desktop, Laptop dinas, Mini PC, Workstation lab',
          code_prefix: 'ICT-COM',
          created_at: new Date().toISOString(),
        },
        {
          id: 'cat-pwr',
          code: 'PWR',
          name: 'Power & UPS Data Center',
          description: 'Uninterruptible Power Supply (UPS), PDU, stabilizer, genset panel',
          code_prefix: 'ICT-PWR',
          created_at: new Date().toISOString(),
        },
        {
          id: 'cat-tol',
          code: 'TOL',
          name: 'Peralatan Kerja Teknisi',
          description: 'Splicer fiber optik, OTDR, crimping tool, cable tester, multimeter',
          code_prefix: 'ICT-TOL',
          created_at: new Date().toISOString(),
        },
        {
          id: 'cat-cns',
          code: 'CNS',
          name: 'Komponen & Suku Cadang',
          description: 'Patch cord, SFP transceivers, kabel UTP Cat6, RAM, adaptor',
          code_prefix: 'ICT-CNS',
          created_at: new Date().toISOString(),
        },
        {
          id: 'cat-sft',
          code: 'SFT',
          name: 'Lisensi & Software',
          description: 'Lisensi OS Server, Antivirus, Firewall license, Virtualization',
          code_prefix: 'ICT-SFT',
          created_at: new Date().toISOString(),
        },
      ];
      await this.writeCollectionUnsafe('categories', defaultCategories);
    }

    // 3. Locations
    const locations = await this.readCollectionUnsafe<Location>('locations');
    if (locations.length === 0) {
      const defaultLocations: Location[] = [
        {
          id: 'loc-srv-dc',
          building: 'Gedung Utama Politeknik Kampar',
          floor: 'Lantai 2',
          room: 'Server Room & Data Center UPT ICT',
          rack: 'Rack 42U A1 / A2',
          notes: 'Ruang ber-AC 18C, access biometric kontrol',
          created_at: new Date().toISOString(),
        },
        {
          id: 'loc-noc',
          building: 'Gedung Utama Politeknik Kampar',
          floor: 'Lantai 2',
          room: 'Ruang Network Operation Center (NOC) ICT',
          rack: 'Wallmount 12U',
          notes: 'Ruang kendali pemantauan jaringan kampus',
          created_at: new Date().toISOString(),
        },
        {
          id: 'loc-lab-jarkom',
          building: 'Gedung Workshop & Lab',
          floor: 'Lantai 1',
          room: 'Laboratorium Jaringan Komputer',
          rack: 'Rack Edukasi 24U',
          notes: 'Praktikum mahasiswa dan konfigurasi router/switch',
          created_at: new Date().toISOString(),
        },
        {
          id: 'loc-workshop',
          building: 'Gedung Utama Politeknik Kampar',
          floor: 'Lantai 1',
          room: 'Bengkel & Ruang Teknisi ICT',
          rack: 'Lemari Toolkit & Sparepart',
          notes: 'Penyimpanan peralatan kerja & servis unit rusak',
          created_at: new Date().toISOString(),
        },
        {
          id: 'loc-gedung-direktorat',
          building: 'Gedung Rektorat & Direktorat',
          floor: 'Lantai 2',
          room: 'IDF Distribution Switch Rektorat',
          rack: 'Wallmount 9U',
          notes: 'Distribusi koneksi pimpinan & administrasi',
          created_at: new Date().toISOString(),
        },
      ];
      await this.writeCollectionUnsafe('locations', defaultLocations);
    }

    // 4. Vendors
    const vendors = await this.readCollectionUnsafe<Vendor>('vendors');
    if (vendors.length === 0) {
      const defaultVendors: Vendor[] = [
        {
          id: 'vnd-01',
          name: 'PT Telkom Indonesia (Witel Riau Daratan)',
          contact_person: 'Account Manager Kampar',
          address: 'Jl. Jenderal Sudirman No. 199, Pekanbaru',
          phone: '(0761) 32000',
          email: 'corporate.riau@telkom.co.id',
          website: 'https://telkom.co.id',
          created_at: new Date().toISOString(),
        },
        {
          id: 'vnd-02',
          name: 'CV Kampar Mandiri Solusindo',
          contact_person: 'Hendra Saputra, S.T.',
          address: 'Jl. Prof. M. Yamin No. 45, Bangkinang Kota',
          phone: '0812-7654-3210',
          email: 'sales@kampar-solusindo.com',
          website: 'https://kampar-solusindo.com',
          created_at: new Date().toISOString(),
        },
        {
          id: 'vnd-03',
          name: 'PT Master Sistem Infotama',
          contact_person: 'Eko Wahyudi',
          address: 'Wisma Sudirman Lt. 7, Jakarta Pusat',
          phone: '(021) 5711234',
          email: 'info@mastersystem.co.id',
          website: 'https://mastersystem.co.id',
          created_at: new Date().toISOString(),
        },
      ];
      await this.writeCollectionUnsafe('vendors', defaultVendors);
    }

    // 5. System Settings
    const settings = await this.readCollectionUnsafe<SystemSettings>('settings');
    if (settings.length === 0) {
      const defaultSettings: SystemSettings = {
        app_name: 'ICT Inventory Management System',
        institution_name: 'Politeknik Kampar',
        unit_name: 'Unit Pelaksana Teknis (UPT) ICT',
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
        asset_code_prefix: 'ICT',
        next_asset_sequence: 100,
        google_drive: {
          enabled: false,
          folder_id: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
          parent_folder_name: 'ICT Inventory - Politeknik Kampar',
          auth_type: 'SERVICE_ACCOUNT',
          client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
          has_private_key: Boolean(process.env.GOOGLE_DRIVE_PRIVATE_KEY),
        },
        backup: {
          auto_backup: true,
          interval_hours: 24,
          max_backup_files: 10,
          last_backup_at: new Date().toISOString(),
        },
      };
      await this.writeCollectionUnsafe('settings', [defaultSettings]);
    }

    // 6. Seed Realistic Initial Inventory Items if empty
    const inventory = await this.readCollectionUnsafe<InventoryItem>('inventory');
    if (inventory.length === 0) {
      const sampleInventory: InventoryItem[] = [
        {
          id: 'inv-srv-001',
          asset_code: 'ICT-SRV-2026-0001',
          asset_name: 'Server Core Database & SIAKAD',
          category_id: 'cat-srv',
          subcategory: 'Rackmount Server 2U',
          brand: 'Dell EMC',
          model: 'PowerEdge R740',
          serial_number: 'CN-0N86V7-72461-89B-0012',
          asset_type: 'HARDWARE',
          description: 'Server utama database Sistem Informasi Akademik (SIAKAD) Politeknik Kampar.',
          specifications: {
            processor: '2x Intel Xeon Silver 4214R (24 Cores total)',
            ram: '128 GB DDR4 ECC Registered',
            storage: '4x 1.2TB SAS 10K RPM RAID 10 + 2x 480GB NVMe SSD Cache',
            psu: 'Dual Redundant 750W Titanium',
            nic: '4x 10GbE SFP+ Ports',
            ip_address: '10.10.1.10',
          },
          acquisition_date: '2023-08-15',
          acquisition_cost: 98500000,
          funding_source: 'DIPA Kemendikbudristek 2023',
          vendor_id: 'vnd-03',
          invoice_number: 'INV-MSI-2023-0891',
          warranty_start: '2023-08-15',
          warranty_end: '2026-08-15',
          building: 'Gedung Utama Politeknik Kampar',
          room: 'Server Room & Data Center UPT ICT',
          rack_position: 'Rack 42U A1 (U18-U19)',
          department: 'UPT ICT',
          person_in_charge: 'Mahdiawan N.K., S.Kom.',
          responsible_position: 'Kepala UPT ICT',
          ownership_status: 'Milik Politeknik Kampar',
          condition: 'GOOD',
          operational_status: 'ACTIVE',
          criticality: 'CRITICAL',
          notes: 'Maintenance berkala setiap 3 bulan (thermal paste & dust cleaning).',
          additional_photos: [],
          document_attachments: [],
          created_at: new Date('2024-01-10').toISOString(),
          created_by: 'usr-admin-01',
          updated_at: new Date().toISOString(),
          updated_by: 'usr-admin-01',
        },
        {
          id: 'inv-net-001',
          asset_code: 'ICT-NET-2026-0001',
          asset_name: 'Core Switch Fiber Distribution',
          category_id: 'cat-net',
          subcategory: 'Layer 3 Managed Switch',
          brand: 'Cisco Systems',
          model: 'Catalyst 3850-24XS-S',
          serial_number: 'FCW2219B0L3',
          asset_type: 'HARDWARE',
          description: 'Core switch backbone fiber optik distribusi antar gedung kampus.',
          specifications: {
            ports: '24x 10G SFP+ Ports',
            throughput: '320 Gbps',
            stacking: 'StackWise-480 Ready',
            ip_address: '10.10.0.1',
          },
          acquisition_date: '2022-11-20',
          acquisition_cost: 67200000,
          funding_source: 'Anggaran Rutin UPT ICT 2022',
          vendor_id: 'vnd-03',
          invoice_number: 'INV-MSI-2022-1102',
          warranty_start: '2022-11-20',
          warranty_end: '2025-11-20',
          building: 'Gedung Utama Politeknik Kampar',
          room: 'Server Room & Data Center UPT ICT',
          rack_position: 'Rack 42U A1 (U24)',
          department: 'UPT ICT',
          person_in_charge: 'Teknisi Jaringan & Sistem',
          responsible_position: 'Network Administrator',
          ownership_status: 'Milik Politeknik Kampar',
          condition: 'GOOD',
          operational_status: 'ACTIVE',
          criticality: 'CRITICAL',
          notes: 'Mendistribusikan trunk VLAN 10 (SIAKAD), VLAN 20 (Dosen/Staf), VLAN 30 (Mahasiswa/WiFi).',
          additional_photos: [],
          document_attachments: [],
          created_at: new Date('2024-01-10').toISOString(),
          created_by: 'usr-admin-01',
          updated_at: new Date().toISOString(),
          updated_by: 'usr-admin-01',
        },
        {
          id: 'inv-pwr-001',
          asset_code: 'ICT-PWR-2026-0001',
          asset_name: 'Online UPS Data Center 10 kVA',
          category_id: 'cat-pwr',
          subcategory: 'Online Double Conversion UPS',
          brand: 'APC by Schneider Electric',
          model: 'Smart-UPS RT 10000VA RM 230V',
          serial_number: 'QS1943180291',
          asset_type: 'HARDWARE',
          description: 'Penyokong daya darurat untuk rack server A1 & A2 dengan battery pack eksternal.',
          specifications: {
            capacity: '10 kVA / 10 kW',
            input_voltage: '230V / 400V 3-Phase',
            battery_runtime: '45 menit pada beban 50%',
            snmp_card: 'APC Network Management Card 3 (AP9640)',
            ip_address: '10.10.1.250',
          },
          acquisition_date: '2022-06-10',
          acquisition_cost: 54000000,
          funding_source: 'DIPA BLU Politeknik Kampar',
          vendor_id: 'vnd-02',
          invoice_number: 'KMS-INV-2022-0610',
          warranty_start: '2022-06-10',
          warranty_end: '2024-06-10',
          building: 'Gedung Utama Politeknik Kampar',
          room: 'Server Room & Data Center UPT ICT',
          rack_position: 'Rack 42U A2 (U1-U6)',
          department: 'UPT ICT',
          person_in_charge: 'Mahdiawan N.K., S.Kom.',
          responsible_position: 'Kepala UPT ICT',
          ownership_status: 'Milik Politeknik Kampar',
          condition: 'GOOD',
          operational_status: 'ACTIVE',
          criticality: 'CRITICAL',
          notes: 'Penggantian baterai internal dilakukan November 2024.',
          additional_photos: [],
          document_attachments: [],
          created_at: new Date('2024-01-10').toISOString(),
          created_by: 'usr-admin-01',
          updated_at: new Date().toISOString(),
          updated_by: 'usr-admin-01',
        },
        {
          id: 'inv-tol-001',
          asset_code: 'ICT-TOL-2026-0001',
          asset_name: 'Optical Fusion Splicer Fiber Optik',
          category_id: 'cat-tol',
          subcategory: 'Fiber Splicer Kit',
          brand: 'Fujikura',
          model: '90S+ Core Alignment Fusion Splicer',
          serial_number: 'FS90-8819273',
          asset_type: 'HARDWARE',
          description: 'Alat penyambung serat optik presisi tinggi untuk pemeliharaan kabel fiber antar gedung kampus.',
          specifications: {
            splice_time: '7 detik (SM Fast)',
            heating_time: '9-13 detik',
            loss_estimation: '0.02 dB (SM) / 0.01 dB (MM)',
            battery_capacity: '300 splice and heat cycles',
          },
          acquisition_date: '2023-02-14',
          acquisition_cost: 42000000,
          funding_source: 'Pengembangan Sarana Lab Jaringan',
          vendor_id: 'vnd-02',
          invoice_number: 'KMS-2023-0214',
          warranty_start: '2023-02-14',
          warranty_end: '2025-02-14',
          building: 'Gedung Utama Politeknik Kampar',
          room: 'Bengkel & Ruang Teknisi ICT',
          rack_position: 'Koper Hardcase Teknisi',
          department: 'UPT ICT',
          person_in_charge: 'Teknisi Jaringan & Sistem',
          responsible_position: 'Teknisi Jaringan',
          ownership_status: 'Milik Politeknik Kampar',
          condition: 'GOOD',
          operational_status: 'ACTIVE',
          criticality: 'HIGH',
          notes: 'Lengkap dengan cleaver CT50 dan thermal stripper.',
          additional_photos: [],
          document_attachments: [],
          created_at: new Date('2024-02-01').toISOString(),
          created_by: 'usr-admin-01',
          updated_at: new Date().toISOString(),
          updated_by: 'usr-admin-01',
        },
        {
          id: 'inv-com-001',
          asset_code: 'ICT-COM-2026-0001',
          asset_name: 'Workstation Monitoring NOC & SysAdmin',
          category_id: 'cat-com',
          subcategory: 'Tower Workstation',
          brand: 'Lenovo',
          model: 'ThinkStation P360 Tower',
          serial_number: 'MJ09X1K8',
          asset_type: 'HARDWARE',
          description: 'PC Workstation untuk pemantauan grafana, PRTG, dan manajemen virtual machine UPT ICT.',
          specifications: {
            processor: 'Intel Core i7-12700 (12 Core, up to 4.90 GHz)',
            ram: '32 GB DDR5 4800MHz',
            gpu: 'NVIDIA T1000 8GB GDDR6 (Triple Display)',
            storage: '1TB M.2 PCIe Gen4 NVMe SSD',
          },
          acquisition_date: '2023-09-01',
          acquisition_cost: 26500000,
          funding_source: 'Anggaran Operasional UPT ICT',
          vendor_id: 'vnd-02',
          invoice_number: 'KMS-INV-2023-0901',
          warranty_start: '2023-09-01',
          warranty_end: '2026-09-01',
          building: 'Gedung Utama Politeknik Kampar',
          room: 'Ruang Network Operation Center (NOC) ICT',
          rack_position: 'Meja Operator NOC #1',
          department: 'UPT ICT',
          person_in_charge: 'Teknisi Jaringan & Sistem',
          responsible_position: 'Operator Sistem',
          ownership_status: 'Milik Politeknik Kampar',
          condition: 'GOOD',
          operational_status: 'ACTIVE',
          criticality: 'MEDIUM',
          notes: 'Terhubung ke 3 unit monitor 27 inch untuk dashboard pemantauan live.',
          additional_photos: [],
          document_attachments: [],
          created_at: new Date('2024-02-01').toISOString(),
          created_by: 'usr-admin-01',
          updated_at: new Date().toISOString(),
          updated_by: 'usr-admin-01',
        },
      ];
      await this.writeCollectionUnsafe('inventory', sampleInventory);
    }
  }

  public async find<T>(collection: string, filter?: (item: T) => boolean): Promise<T[]> {
    return this.acquireLock(collection, async () => {
      const all = await this.readCollectionUnsafe<T>(collection);
      if (!filter) return all;
      return all.filter(filter);
    });
  }

  public async findById<T extends { id: string }>(collection: string, id: string): Promise<T | null> {
    return this.acquireLock(collection, async () => {
      const all = await this.readCollectionUnsafe<T>(collection);
      const found = all.find((item) => item.id === id);
      return found || null;
    });
  }

  public async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
    return this.acquireLock(collection, async () => {
      const all = await this.readCollectionUnsafe<T>(collection);
      const index = all.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        throw new Error(`Item with id ${item.id} already exists in ${collection}`);
      }
      all.push(item);
      await this.writeCollectionUnsafe(collection, all);
      return item;
    });
  }

  public async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<T | null> {
    return this.acquireLock(collection, async () => {
      const all = await this.readCollectionUnsafe<T>(collection);
      const index = all.findIndex((i) => i.id === id);
      if (index === -1) return null;

      const updated = { ...all[index], ...updates };
      all[index] = updated;
      await this.writeCollectionUnsafe(collection, all);
      return updated;
    });
  }

  public async delete<T extends { id: string }>(collection: string, id: string): Promise<boolean> {
    return this.acquireLock(collection, async () => {
      const all = await this.readCollectionUnsafe<T>(collection);
      const filtered = all.filter((i) => i.id !== id);
      if (filtered.length === all.length) return false;
      await this.writeCollectionUnsafe(collection, filtered);
      return true;
    });
  }

  public async count<T>(collection: string, filter?: (item: T) => boolean): Promise<number> {
    return this.acquireLock(collection, async () => {
      const all = await this.readCollectionUnsafe<T>(collection);
      if (!filter) return all.length;
      return all.filter(filter).length;
    });
  }

  public async transaction<R>(fn: () => Promise<R>): Promise<R> {
    // In JSON adapter, execute synchronously within transaction
    return fn();
  }

  public async getNextSequence(key: string, startFrom = 1): Promise<number> {
    return this.acquireLock('counters', async () => {
      const counters = await this.readCollectionUnsafe<{ id: string; current: number }>('counters');
      const item = counters.find((c) => c.id === key);
      let nextVal = startFrom;
      if (item) {
        item.current += 1;
        nextVal = item.current;
      } else {
        counters.push({ id: key, current: startFrom });
        nextVal = startFrom;
      }
      await this.writeCollectionUnsafe('counters', counters);
      return nextVal;
    });
  }

  public async createBackup(label = 'manual'): Promise<{ backupId: string; filePath: string; timestamp: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${label}_${timestamp}`;
    const backupFolder = path.join(this.backupDir, backupId);

    await fs.promises.mkdir(backupFolder, { recursive: true });

    // Copy all .json files in baseDir into the backup folder
    const files = await fs.promises.readdir(this.baseDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const src = path.join(this.baseDir, file);
        const dest = path.join(backupFolder, file);
        await fs.promises.copyFile(src, dest);
      }
    }

    // Write a manifest
    const manifest = {
      backupId,
      timestamp: new Date().toISOString(),
      label,
      files: files.filter((f) => f.endsWith('.json')),
    };
    await fs.promises.writeFile(path.join(backupFolder, 'manifest.json'), JSON.stringify(manifest, null, 2));

    return { backupId, filePath: backupFolder, timestamp: manifest.timestamp };
  }

  public async listBackups(): Promise<Array<{ id: string; filename: string; timestamp: string; size: number }>> {
    if (!fs.existsSync(this.backupDir)) return [];
    const entries = await fs.promises.readdir(this.backupDir, { withFileTypes: true });
    const backups: Array<{ id: string; filename: string; timestamp: string; size: number }> = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(this.backupDir, entry.name, 'manifest.json');
        let ts = '';
        if (fs.existsSync(manifestPath)) {
          try {
            const m = JSON.parse(await fs.promises.readFile(manifestPath, 'utf-8'));
            ts = m.timestamp;
          } catch {
            ts = (await fs.promises.stat(manifestPath)).mtime.toISOString();
          }
        }
        backups.push({
          id: entry.name,
          filename: entry.name,
          timestamp: ts || new Date().toISOString(),
          size: 1024 * 10,
        });
      }
    }
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  public async restoreBackup(backupId: string): Promise<{ success: boolean; message: string }> {
    const backupFolder = path.join(this.backupDir, backupId);
    if (!fs.existsSync(backupFolder)) {
      throw new Error(`Backup folder ${backupId} not found`);
    }

    // Safety: Create a pre-restore checkpoint
    await this.createBackup('pre_restore_safety_checkpoint');

    // Copy json files back to baseDir
    const files = await fs.promises.readdir(backupFolder);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'manifest.json') {
        const src = path.join(backupFolder, file);
        const dest = path.join(this.baseDir, file);
        await fs.promises.copyFile(src, dest);
      }
    }

    return { success: true, message: `Data inventaris berhasil dipulihkan dari backup ${backupId}` };
  }

  public async verifyIntegrity(): Promise<{ valid: boolean; collections: Record<string, { count: number; valid: boolean; error?: string }> }> {
    const requiredCollections = [
      'users',
      'categories',
      'locations',
      'vendors',
      'inventory',
      'settings',
    ];
    let allValid = true;
    const collectionsStatus: Record<string, { count: number; valid: boolean; error?: string }> = {};

    for (const col of requiredCollections) {
      try {
        const items = await this.readCollectionUnsafe<{ id: string }>(col);
        const hasDuplicateIds = new Set(items.map((i) => i.id)).size !== items.length;
        if (hasDuplicateIds) {
          allValid = false;
          collectionsStatus[col] = { count: items.length, valid: false, error: 'Terdapat ID duplikat pada file JSON' };
        } else {
          collectionsStatus[col] = { count: items.length, valid: true };
        }
      } catch (err: unknown) {
        allValid = false;
        collectionsStatus[col] = { count: 0, valid: false, error: (err as Error).message };
      }
    }

    return { valid: allValid, collections: collectionsStatus };
  }
}

export const storage = new JsonStorageAdapter();
