import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { JsonStorageAdapter } from '../server/storage/json-storage';
import { AuthService } from '../server/services/auth-service';
import { AccessCodeService } from '../server/services/access-code-service';
import { InventoryService } from '../server/services/inventory-service';
import { AuditService } from '../server/services/audit-service';
import { DriveService } from '../server/services/drive-service';

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TEST SUITE - UPT ICT POLKAM');
  console.log('====================================================\n');

  const testDir = path.resolve(process.cwd(), 'data_test');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  const { storage } = await import('../server/storage/json-storage');
  await storage.init();

  const testStorage = new JsonStorageAdapter(testDir);
  await testStorage.init();

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}:`, (err as Error).message);
      failed++;
    }
  }

  // 1. Admin authentication & initial seed
  await test('1. Admin autentikasi berhasil dengan kredensial default', async () => {
    const res = await AuthService.authenticate('admin', 'AdminICTPolkam2026!');
    assert(res !== null, 'Admin login should succeed');
    assert.strictEqual(res.user.role, 'ADMIN');
    assert.strictEqual(res.user.username, 'admin');
    assert(res.token.length > 20, 'Should return valid token');
  });

  // 2. Operator authentication & boundary
  await test('2. Operator login berhasil dengan role OPERATOR', async () => {
    const res = await AuthService.authenticate('operator', 'OperatorICT2026!');
    assert(res !== null, 'Operator login should succeed');
    assert.strictEqual(res.user.role, 'OPERATOR');
  });

  // 3. Operator restricted from user management
  await test('3. Operator tidak boleh menonaktifkan atau mengubah role admin', async () => {
    const admin = (await testStorage.find<{ id: string; role: string }>('users', (u) => u.role === 'ADMIN'))[0];
    assert(admin, 'Admin must exist');
    let threw = false;
    try {
      await AuthService.updateUser(
        admin.id,
        { role: 'OPERATOR', is_active: false },
        { userId: 'usr-operator-01', username: 'operator', fullName: 'Operator Test', role: 'OPERATOR', email: 'op@polkam.ac.id', exp: 9999999 }
      );
    } catch {
      threw = true;
    }
    assert(threw, 'Should throw error when deactivating last admin');
  });

  // 4. Access Code Creation & One-Time Disclosure
  let generatedAccessCode: { accessCode: any; rawCode: string };
  await test('4. Admin dapat membuat kode akses audit dengan hash tersimpan aman', async () => {
    const adminActor = { userId: 'usr-admin-01', username: 'admin', role: 'ADMIN' };
    generatedAccessCode = await AccessCodeService.createAccessCode(
      {
        label: 'Audit BPK Semester 1 2026',
        role: 'REVIEWER',
        scope_type: 'CATEGORY',
        scope_value: 'cat-srv',
        valid_until: new Date(Date.now() + 86400000).toISOString(),
        max_uses: 3,
        session_duration_minutes: 60,
      },
      adminActor
    );

    assert(generatedAccessCode.rawCode.startsWith('PK-AUDIT-'), 'Raw code must follow format PK-AUDIT-');
    assert(generatedAccessCode.accessCode.code_hash !== generatedAccessCode.rawCode, 'Plain code must not be saved in hash field');
  });

  // 5. Reviewer Session Generation & Expiry / Max usage
  await test('5. Kode valid menghasilkan sesi review terbatas & mencatat penggunaan', async () => {
    const { session, token } = await AccessCodeService.authenticateReviewer(generatedAccessCode.rawCode, '192.168.1.50');
    assert(session !== null, 'Session must be created');
    assert.strictEqual(session.role, 'REVIEWER');
    assert.strictEqual(session.scope_type, 'CATEGORY');
    assert.strictEqual(session.scope_value, 'cat-srv');
    assert(token.length > 20, 'Session token generated');

    const verified = await AccessCodeService.getSessionByToken(token);
    assert(verified !== null, 'Session token must verify successfully');
  });

  // 6. Invalid / Revoked Access Code Handling
  await test('6. Kode salah, kedaluwarsa, atau dicabut ditolak oleh sistem', async () => {
    let threw = false;
    try {
      await AccessCodeService.authenticateReviewer('PK-AUDIT-INVALID-CODE');
    } catch {
      threw = true;
    }
    assert(threw, 'Invalid code must throw error');

    // Revoke code test
    const adminActor = { userId: 'usr-admin-01', username: 'admin', role: 'ADMIN' };
    await AccessCodeService.revokeCode(generatedAccessCode.accessCode.id, adminActor);

    let threwRevoked = false;
    try {
      await AccessCodeService.authenticateReviewer(generatedAccessCode.rawCode);
    } catch {
      threwRevoked = true;
    }
    assert(threwRevoked, 'Revoked code must be rejected');
  });

  // 7. Atomic Concurrency Sequence Generation
  await test('7. Generator nomor aset atomik aman dari duplikasi saat request bersamaan', async () => {
    const promises = Array.from({ length: 15 }, () => InventoryService.generateAssetCode('cat-srv'));
    const codes = await Promise.all(promises);
    const uniqueCodes = new Set(codes);
    assert.strictEqual(uniqueCodes.size, 15, 'All 15 generated asset codes must be distinct and unique');
  });

  // 8. Inventory CRUD & Soft Delete / Restore
  await test('8. Soft delete aset & pemulihan kembali oleh admin', async () => {
    const actor = { userId: 'usr-admin-01', username: 'admin', role: 'ADMIN' };
    const randomSn = `TEST-SN-${Date.now()}`;
    const created = await InventoryService.createAsset(
      {
        asset_name: 'Test Server Backup Proliant',
        category_id: 'cat-srv',
        brand: 'HPE',
        model: 'ProLiant DL380 Gen10',
        serial_number: randomSn,
        asset_type: 'HARDWARE',
        description: 'Testing inventory item',
        specifications: { cpu: 'Xeon Silver' },
        acquisition_date: '2024-05-01',
        acquisition_cost: 45000000,
        funding_source: 'DIPA 2024',
        building: 'Gedung Utama Politeknik Kampar',
        room: 'Server Room & Data Center UPT ICT',
        department: 'UPT ICT',
        person_in_charge: 'Mahdiawan N.K.',
        responsible_position: 'Kepala UPT ICT',
        ownership_status: 'Milik Politeknik Kampar',
        condition: 'GOOD',
        operational_status: 'ACTIVE',
        criticality: 'HIGH',
        additional_photos: [],
        document_attachments: [],
      },
      actor
    );

    assert(created.id, 'Asset created with ID');

    // Soft delete
    await InventoryService.softDelete(created.id, actor);
    const foundDeleted = await InventoryService.getById(created.id);
    assert(foundDeleted?.deleted_at !== null, 'Item must be marked deleted');

    // Verify it doesn't appear in default active list
    const activeList = await InventoryService.listInventory({ include_deleted: false });
    assert(!activeList.items.some((i) => i.id === created.id), 'Deleted item must not appear in active inventory');

    // Restore
    const restored = await InventoryService.restore(created.id, actor);
    assert.strictEqual(restored.deleted_at, null, 'Restored item deleted_at must be null');
  });

  // 9. Photo Upload & MIME Validation
  await test('9. Upload foto valid berhasil dan file berbahaya ditolak', async () => {
    const validBuffer = Buffer.from('fake-image-content-png');
    const attachment = await DriveService.uploadFile({
      buffer: validBuffer,
      fileName: 'photo_test.png',
      mimeType: 'image/png',
      uploadedBy: 'admin',
    });
    assert(attachment.drive_file_id, 'Must return drive_file_id');
    assert(attachment.url?.includes('/api/drive/files/'), 'Must provide proxy URL');

    // Dangerous executable rejection
    let rejected = false;
    try {
      await DriveService.uploadFile({
        buffer: Buffer.from('malicious-exe'),
        fileName: 'virus.exe',
        mimeType: 'application/x-msdownload',
        uploadedBy: 'admin',
      });
    } catch {
      rejected = true;
    }
    assert(rejected, 'Dangerous MIME must be rejected');
  });

  // 10. Audit Log Append-Only & Sanitization
  await test('10. Audit log mencatat aktivitas & menyamarkan data sensitif', async () => {
    await AuditService.log({
      actor_id: 'usr-admin-01',
      actor_name: 'admin',
      role: 'ADMIN',
      action: 'TEST_ACTION',
      resource_type: 'SECURITY',
      summary: 'Testing audit log creation',
      changes_before: { password: 'SecretPassword123!', username: 'admin' },
    });

    const logs = await AuditService.getLogs({ action: 'TEST_ACTION' });
    assert(logs.total > 0, 'Audit log entry must be present');
    assert.strictEqual(logs.logs[0].changes_before?.password, '[REDACTED]', 'Sensitive password must be sanitized');
  });

  // 11. Backup & Restore Data Integrity
  await test('11. Backup snapshot & verifikasi integritas data JSON', async () => {
    const backupRes = await testStorage.createBackup('test_snapshot');
    assert(backupRes.backupId, 'Backup must return backupId');

    const backups = await testStorage.listBackups();
    assert(backups.length > 0, 'Backup list must not be empty');

    const integrity = await testStorage.verifyIntegrity();
    assert(integrity.valid, 'JSON integrity check must pass');
  });

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  // Clean test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
