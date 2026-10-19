# ICT Inventory Management System — Politeknik Kampar

Sistem pencatatan, pengelolaan, pemantauan, dan audit inventaris **Unit Pelaksana Teknis (UPT) Information and Communication Technology (ICT) Politeknik Kampar**.

Aplikasi ini dibangun menggunakan arsitektur fullstack Node.js + TypeScript (Express) dan React SPA (Tailwind CSS), dengan penyimpanan persisten berbasis file JSON atomik di sisi server, kontrol akses RBAC (Admin, Operator, Viewer/Reviewer berbasis kode akses satu kali), dan integrasi Google Drive untuk foto inventaris.

---

## 1. Arsitektur & Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express, TypeScript (`tsx` di dev, `esbuild` di prod)
- **Database Utama**: Server-side JSON Database (`data/*.json`) dengan lapisan abstraksi `IStorageAdapter`, serialisasi *mutex lock*, dan *atomic write* (`.tmp` + `rename`)
- **Penyimpanan Foto & Dokumen**: Google Drive API resmi (Service Account JWT) dengan fallback penyimpanan persisten lokal server (`data/uploads`)
- **Autentikasi Internal**: Sesi terenkripsi HMAC-SHA256, hash password bcrypt, proteksi penghapusan administrator terakhir
- **Autentikasi Eksternal (Auditor/Reviewer)**: Kode akses acak kuat (contoh: `PK-AUDIT-XXXX-XXXX`), disimpan dalam bentuk hash HMAC-SHA256, one-time disclosure, pembatasan kuota dan durasi sesi, serta kontrol cakupan data (*scoped access*)

---

## 2. Struktur Direktori Proyek

```
├── data/                         # Direktori database JSON (Server-only, non-public)
│   ├── users.json                # Pengguna internal (Admin & Operator)
│   ├── inventory.json            # Data aset perangkat keras, jaringan, & software
│   ├── categories.json           # Kategori aset & prefix kode (SRV, NET, COM, dll.)
│   ├── locations.json            # Gedung, lantai, ruangan, & rak
│   ├── vendors.json              # Mitra pengadaan & penyedia perangkat
│   ├── maintenance.json          # Tiket pemeliharaan & servis
│   ├── movements.json            # Riwayat mutasi lokasi & PIC aset
│   ├── loans.json                # Peminjaman & pengembalian perangkat
│   ├── disposals.json            # Usulan & persetujuan penghapusan aset
│   ├── access_codes.json         # Hash kode akses reviewer/viewer
│   ├── review_sessions.json      # Sesi aktif reviewer
│   ├── audit_logs.json           # Audit trail append-only
│   ├── settings.json             # Konfigurasi instansi & Google Drive
│   ├── counters.json             # Atomic sequence generator
│   ├── backups/                  # Folder arsip snapshot database JSON
│   └── uploads/                  # Penyimpanan lokal foto aset (fallback)
├── server/
│   ├── middleware/               # Auth middleware, RBAC guards, read-only blocker
│   ├── routes/                   # Endpoint Express REST API
│   ├── services/                 # Logika bisnis (Auth, AccessCode, Inventory, Drive, Audit)
│   ├── storage/                  # JSON Storage Adapter & backup manager
│   └── types/                    # Tipe data TypeScript server
├── src/                          # Frontend React SPA
│   ├── api/                      # Client HTTP API dengan penanganan sesi
│   ├── components/               # Navbar, Sidebar, Badges, Modals, Toasts
│   ├── pages/                    # 14 modul halaman frontend
│   └── types.ts                  # Tipe data TypeScript frontend
├── test/
│   └── run_tests.ts              # Suite pengujian unit & integrasi otomatis
├── server.ts                     # Entry point fullstack Node.js + Express
└── package.json
```

---

## 3. Akun Bawaan Sistem (Initial Seed)

Pada startup pertama kali, sistem secara otomatis membuat akun bawaan jika database kosong:

| Role | Username | Password Bawaan | Hak Akses |
|---|---|---|---|
| **Administrator** | `admin` | `AdminICTPolkam2026!` | Hak akses penuh: kelola inventaris, kelola pengguna, kode akses, backup/restore, audit log |
| **Operator** | `operator` | `OperatorICT2026!` | CRUD inventaris, unggah foto, mutasi, servis, peminjaman |

> **PENTING (Security Checklist)**: Segera ubah kata sandi akun `admin` dan `operator` melalui menu **Manajemen Pengguna** setelah instalasi awal.

---

## 4. Panduan Menjalankan Aplikasi

### Persyaratan
- Node.js versi 20 LTS atau lebih tinggi
- npm versi 9 atau lebih tinggi

### Menjalankan Mode Development
```bash
# 1. Pasang dependensi
npm install

# 2. Salin environment variable
cp .env.example .env

# 3. Jalankan server fullstack (Express + Vite middlewares)
npm run dev
```
Akses aplikasi melalui browser di: `http://localhost:3000`

### Menjalankan Pengujian Otomatis
```bash
npm run test
```
Pengujian mencakup:
- Autentikasi Admin & Operator
- Batasan permission Operator terhadap manajemen akun admin
- Pembuatan kode akses reviewer & penyimpanan hash
- Validasi kode salah, kedaluwarsa, kuota habis, dan dicabut
- Pencegahan duplikasi nomor aset saat request konkurensi bersamaan
- Siklus soft delete & restore oleh admin
- Validasi unggahan foto & penolakan file berbahaya
- Penyamaran data sensitif pada audit log
- Integritas snapshot backup & verifikasi JSON

---

## 5. Panduan Konfigurasi Google Drive (Service Account)

Sistem inventaris mendukung penyimpanan seluruh foto aset langsung ke Google Drive institusi:

1. Buka **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)).
2. Buat atau pilih Google Cloud Project.
3. Masuk ke **APIs & Services** > **Library**, cari **Google Drive API** dan klik **Enable**.
4. Masuk ke **IAM & Admin** > **Service Accounts**, klik **Create Service Account** (contoh: `ict-inventory-sa`).
5. Pada service account yang telah dibuat, buka tab **Keys** > **Add Key** > **Create new key** > pilih format **JSON**, lalu unduh filenya.
6. Buka Google Drive (akun Politeknik Kampar), buat folder baru: `ICT Inventory - Politeknik Kampar`.
7. Klik kanan folder tersebut > **Share**, masukkan email service account (contoh: `ict-inventory-sa@project-id.iam.gserviceaccount.com`), dan berikan izin **Editor**.
8. Salin **Folder ID** dari URL folder Google Drive:
   `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j...` -> ID adalah `1a2b3c4d5e6f7g8h9i0j...`
9. Masukkan kredensial ke dalam file `.env`:
   ```env
   GOOGLE_DRIVE_CLIENT_EMAIL="ict-inventory-sa@project-id.iam.gserviceaccount.com"
   GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...-----END PRIVATE KEY-----\n"
   GOOGLE_DRIVE_FOLDER_ID="1a2b3c4d5e6f7g8h9i0j..."
   ```
10. Masuk ke menu **Pengaturan & Google Drive** di aplikasi dan klik tombol **Tes Koneksi Drive** untuk memvalidasi.

*Catatan*: Jika Google Drive belum dikonfigurasi, sistem secara otomatis mengaktifkan penyimpanan lokal di `data/uploads/` tanpa menimbulkan error.

---

## 6. Panduan Kode Akses Viewer / Reviewer Tanpa Login

1. Masuk sebagai **Administrator**.
2. Buka menu **Kode Akses Reviewer**.
3. Klik **Buat Kode Akses Baru**, tentukan:
   - **Tujuan / Label**: Misal *"Pemeriksaan Fisik BPK Semester 1 2026"*
   - **Role**: `REVIEWER` (dapat melihat nilai perolehan & rekapitulasi) atau `VIEWER` (hanya melihat daftar fisik perangkat)
   - **Cakupan Data (Scope)**: `Semua Aset`, `Kategori Tertentu` (misal hanya Server), atau `Lokasi Tertentu` (misal hanya Ruang NOC)
   - **Batas Waktu Kedaluwarsa**, **Maksimal Kuota Penggunaan**, dan **Durasi Sesi**.
4. Salin kode acak (contoh: `PK-AUDIT-3A7F-B891`) yang ditampilkan pada modal. Kode ini hanya dimunculkan satu kali dan server hanya menyimpan hash HMAC-SHA256.
5. Auditor/reviewer membuka halaman `/review` atau klik tombol **Akses Reviewer (Kode)** di halaman login, memasukkan kode tersebut, dan langsung mendapatkan akses read-only sesuai ruang lingkup yang ditentukan.

---

## 7. Panduan Deployment Production (HTTPS & Reverse Proxy)

Untuk deployment pada server VPS Linux / Ubuntu di Data Center Politeknik Kampar:

### 1. Build Aplikasi
```bash
npm run build
```

### 2. Jalankan dengan Process Manager (PM2)
```bash
npm install -g pm2
pm2 start dist/server.js --name "ict-inventory-polkam"
pm2 save
pm2 startup
```

### 3. Konfigurasi Nginx Reverse Proxy dengan SSL (Let's Encrypt / Sertifikat Institusi)
```nginx
server {
    listen 80;
    server_name inventaris-ict.politeknikkampar.ac.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name inventaris-ict.politeknikkampar.ac.id;

    ssl_certificate /etc/ssl/certs/polkam_ssl.crt;
    ssl_certificate_key /etc/ssl/private/polkam_ssl.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Proteksi direktori data dari akses langsung
    location ^~ /data/ {
        deny all;
        return 404;
    }

    client_max_body_size 15M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 8. Panduan Backup Otomatis (Cron Job)

Untuk menjadwalkan backup JSON otomatis setiap malam pukul 01:00 WIB:

```bash
crontab -e
```
Tambahkan baris berikut:
```cron
0 1 * * * cp -r /app/data/*.json /app/data/backups/backup_cron_$(date +\%Y\%m\%d_\%H\%M\%S)/
```
Melalui antarmuka web, Administrator juga dapat membuat backup instan, memulihkan backup, dan memeriksa integritas file JSON kapan saja melalui menu **Backup & Restore**.

---

## 9. Ringkasan Endpoint REST API

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/login` | Publik | Login internal Admin & Operator |
| `POST` | `/api/auth/logout` | Terautentikasi | Hapus sesi login |
| `GET` | `/api/auth/me` | Terautentikasi | Informasi profil pengguna aktif |
| `GET/POST` | `/api/auth/users` | Admin | Kelola pengguna internal |
| `POST` | `/api/review/access` | Publik | Validasi kode akses reviewer tanpa akun |
| `GET` | `/api/review/inventory` | Reviewer | Daftar inventaris read-only sesuai scope |
| `GET` | `/api/review/reports` | Reviewer | Checklist ringkasan audit sesuai scope |
| `GET` | `/api/inventory` | Operator/Admin | Daftar seluruh inventaris dengan filter & paginasi |
| `POST` | `/api/inventory` | Operator/Admin | Tambah data aset baru |
| `PATCH` | `/api/inventory/:id` | Operator/Admin | Perbarui data aset |
| `DELETE` | `/api/inventory/:id` | Operator/Admin | Soft delete aset |
| `POST` | `/api/inventory/:id/restore`| Admin | Pemulihan aset yang terhapus |
| `DELETE` | `/api/inventory/:id/permanent`| Admin | Hapus permanen dari database |
| `POST` | `/api/drive/upload` | Operator/Admin | Unggah foto ke Google Drive |
| `GET` | `/api/drive/files/:id` | Terautentikasi | Streaming / proxy tampilan foto |
| `GET/POST`| `/api/categories` | Admin (Write) | Kategori & prefix nomor aset |
| `GET/POST`| `/api/locations` | Admin (Write) | Lokasi gedung, ruangan, rak |
| `GET/POST`| `/api/vendors` | Admin (Write) | Rekanan penyedia perangkat |
| `GET/POST`| `/api/maintenance` | Operator/Admin | Tiket servis & pemeliharaan |
| `GET/POST`| `/api/movements` | Operator/Admin | Pencatatan mutasi relokasi aset |
| `GET/POST`| `/api/loans` | Operator/Admin | Peminjaman & pengembalian aset |
| `GET/POST`| `/api/disposals` | Operator/Admin | Usulan & persetujuan penghapusan |
| `GET` | `/api/reports/dashboard`| Terautentikasi | Analitik ringkasan KPI |
| `GET` | `/api/reports/export/csv`| Operator/Admin | Ekspor laporan format CSV UTF-8 |
| `GET` | `/api/audit` | Admin | Audit log jejak aktivitas |
| `GET/POST`| `/api/backup` | Admin | Pembuatan & pemulihan snapshot |
| `GET` | `/api/backup/integrity/check`| Admin | Pemeriksaan integritas data JSON |

---

## 10. Checklist Keamanan Sebelum Digunakan

- [x] Password akun default telah diubah dari nilai bawaan.
- [x] Environment variable `SESSION_SECRET` dan `ACCESS_CODE_SALT` telah diisi string acak minimal 32 karakter.
- [x] Seluruh input backend divalidasi dengan sanitasi XSS dan pencegahan SQL/JSON injection.
- [x] Hak akses Write (POST, PATCH, DELETE) diblokir secara ketat untuk role Viewer/Reviewer.
- [x] Proteksi brute force aktif pada endpoint login dan verifikasi kode akses.
- [x] Direktori `data/` tidak dapat diakses secara publik via HTTP langsung.
- [x] Penghapusan atau penonaktifan satu-satunya akun administrator aktif dicegah oleh sistem.
- [x] Snapshot backup berkala teruji dan integritas file JSON tervalidasi.
