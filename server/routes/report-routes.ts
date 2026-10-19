import { Router, Response } from 'express';
import { storage } from '../storage/json-storage';
import { InventoryItem, Category, Location, AssetLoan, MaintenanceRecord, AuditLog } from '../types';
import { AuthenticatedRequest, authenticateStaff, authenticateAny } from '../middleware/auth-middleware';

export const reportRouter = Router();

// Dashboard summary analytics
reportRouter.get('/dashboard', authenticateAny, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isReviewer = Boolean(req.reviewSession);
    const scope = req.reviewSession
      ? { type: req.reviewSession.scope_type, value: req.reviewSession.scope_value }
      : undefined;

    let allInventory = await storage.find<InventoryItem>('inventory', (i) => !i.deleted_at);

    if (scope && scope.type === 'CATEGORY' && scope.value) {
      allInventory = allInventory.filter((i) => i.category_id === scope.value);
    } else if (scope && scope.type === 'LOCATION' && scope.value) {
      const val = scope.value.toLowerCase();
      allInventory = allInventory.filter((i) => i.building.toLowerCase().includes(val) || i.room.toLowerCase().includes(val));
    }

    const categories = await storage.find<Category>('categories');
    const locations = await storage.find<Location>('locations');
    const loans = await storage.find<AssetLoan>('loans', (l) => l.status === 'BORROWED');
    const maintenance = await storage.find<MaintenanceRecord>('maintenance', (m) => m.status === 'IN_PROGRESS' || m.status === 'PENDING');
    const auditLogs = await storage.find<AuditLog>('audit_logs');
    auditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const totalValuation = allInventory.reduce((acc, curr) => acc + (Number(curr.acquisition_cost) || 0), 0);

    // Condition breakdown
    const conditionCounts = {
      GOOD: allInventory.filter((i) => i.condition === 'GOOD').length,
      MINOR_DAMAGE: allInventory.filter((i) => i.condition === 'MINOR_DAMAGE').length,
      DAMAGED: allInventory.filter((i) => i.condition === 'DAMAGED').length,
      UNUSABLE: allInventory.filter((i) => i.condition === 'UNUSABLE').length,
    };

    // Operational status breakdown
    const statusCounts = {
      ACTIVE: allInventory.filter((i) => i.operational_status === 'ACTIVE').length,
      STORED: allInventory.filter((i) => i.operational_status === 'STORED').length,
      BORROWED: allInventory.filter((i) => i.operational_status === 'BORROWED').length,
      MAINTENANCE: allInventory.filter((i) => i.operational_status === 'MAINTENANCE').length,
      LOST: allInventory.filter((i) => i.operational_status === 'LOST').length,
      DISPOSED: allInventory.filter((i) => i.operational_status === 'DISPOSED').length,
    };

    // Category breakdown
    const categoryStats = categories.map((cat) => {
      const items = allInventory.filter((i) => i.category_id === cat.id);
      const catValuation = items.reduce((sum, item) => sum + (Number(item.acquisition_cost) || 0), 0);
      return {
        id: cat.id,
        name: cat.name,
        code: cat.code,
        count: items.length,
        valuation: isReviewer && req.reviewSession?.role === 'VIEWER' ? undefined : catValuation,
      };
    });

    // Location breakdown
    const locationStats = locations.map((loc) => {
      const count = allInventory.filter(
        (i) => i.room.toLowerCase() === loc.room.toLowerCase() || (i.building === loc.building && i.room === loc.room)
      ).length;
      return {
        id: loc.id,
        building: loc.building,
        room: loc.room,
        count,
      };
    });

    // Expiring warranty check (within 60 days)
    const now = new Date();
    const in60Days = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
    const expiringWarranties = allInventory
      .filter((i) => i.warranty_end && new Date(i.warranty_end) >= now && new Date(i.warranty_end) <= in60Days)
      .map((i) => ({
        id: i.id,
        asset_code: i.asset_code,
        asset_name: i.asset_name,
        warranty_end: i.warranty_end,
        room: i.room,
        person_in_charge: i.person_in_charge,
      }));

    return res.json({
      success: true,
      data: {
        total_assets: allInventory.length,
        total_valuation: isReviewer && req.reviewSession?.role === 'VIEWER' ? undefined : totalValuation,
        active_assets: statusCounts.ACTIVE,
        borrowed_assets: loans.length,
        maintenance_assets: maintenance.length,
        damaged_assets: conditionCounts.DAMAGED + conditionCounts.UNUSABLE,
        conditions: conditionCounts,
        statuses: statusCounts,
        by_category: categoryStats,
        by_location: locationStats,
        expiring_warranties: expiringWarranties,
        recent_activity: isReviewer ? [] : auditLogs.slice(0, 10),
      },
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// CSV Export for inventory reports
reportRouter.get('/export/csv', authenticateStaff, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category_id, condition, operational_status, room } = req.query;
    let items = await storage.find<InventoryItem>('inventory', (i) => !i.deleted_at);

    if (category_id) items = items.filter((i) => i.category_id === category_id);
    if (condition) items = items.filter((i) => i.condition === condition);
    if (operational_status) items = items.filter((i) => i.operational_status === operational_status);
    if (room) items = items.filter((i) => i.room.toLowerCase().includes((room as string).toLowerCase()));

    const categories = await storage.find<Category>('categories');
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    const headers = [
      'No',
      'Kode Aset',
      'Nama Perangkat',
      'Kategori',
      'Merk',
      'Model',
      'Nomor Seri',
      'Tipe Aset',
      'Tanggal Perolehan',
      'Nilai Perolehan (IDR)',
      'Sumber Dana',
      'Gedung',
      'Ruangan',
      'Penanggung Jawab',
      'Kondisi',
      'Status Operasional',
      'Kritikalitas',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    const rows = items.map((item, idx) => [
      idx + 1,
      escapeCsv(item.asset_code),
      escapeCsv(item.asset_name),
      escapeCsv(catMap.get(item.category_id) || item.category_id),
      escapeCsv(item.brand),
      escapeCsv(item.model),
      escapeCsv(item.serial_number || '-'),
      escapeCsv(item.asset_type),
      escapeCsv(item.acquisition_date),
      item.acquisition_cost,
      escapeCsv(item.funding_source || '-'),
      escapeCsv(item.building),
      escapeCsv(item.room),
      escapeCsv(item.person_in_charge),
      escapeCsv(item.condition),
      escapeCsv(item.operational_status),
      escapeCsv(item.criticality),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Inventaris_ICT_Politeknik_Kampar_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    // Add UTF-8 BOM so Excel opens it with correct formatting
    return res.send('\uFEFF' + csvContent);
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: (err as Error).message });
  }
});
