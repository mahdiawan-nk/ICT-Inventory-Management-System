import express from 'express';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { storage } from './server/storage/json-storage';
import { authRouter } from './server/routes/auth-routes';
import { inventoryRouter } from './server/routes/inventory-routes';
import { categoryRouter } from './server/routes/category-routes';
import { locationRouter } from './server/routes/location-routes';
import { vendorRouter } from './server/routes/vendor-routes';
import { maintenanceRouter } from './server/routes/maintenance-routes';
import { movementRouter } from './server/routes/movement-routes';
import { loanRouter } from './server/routes/loan-routes';
import { disposalRouter } from './server/routes/disposal-routes';
import { accessCodeRouter } from './server/routes/access-code-routes';
import { reviewRouter } from './server/routes/review-routes';
import { reportRouter } from './server/routes/report-routes';
import { auditRouter } from './server/routes/audit-routes';
import { backupRouter } from './server/routes/backup-routes';
import { settingsRouter } from './server/routes/settings-routes';
import { driveRouter } from './server/routes/drive-routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/locations', locationRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/movements', movementRouter);
app.use('/api/loans', loanRouter);
app.use('/api/disposals', disposalRouter);
app.use('/api/admin/access-codes', accessCodeRouter);
app.use('/api/review', reviewRouter);
app.use('/api/reports', reportRouter);
app.use('/api/audit', auditRouter);
app.use('/api/backup', backupRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/drive', driveRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'ICT Inventory Management System - Politeknik Kampar',
    unit: 'UPT ICT',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  // Initialize storage and seed data
  await storage.init();
  console.log('✅ Storage JSON database initialized successfully.');

  if (!isProduction) {
    // Development mode: Mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ICT Inventory Management System running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
