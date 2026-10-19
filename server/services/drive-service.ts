import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { google } from 'googleapis';
import { DriveAttachment } from '../types';
import { storage } from '../storage/json-storage';

export class DriveService {
  private static localUploadsDir = path.resolve(process.cwd(), 'data', 'uploads');

  private static getDriveClient() {
    const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (clientEmail && privateKey) {
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      return google.drive({ version: 'v3', auth });
    }
    return null;
  }

  public static async getStatus(): Promise<{
    configured: boolean;
    storageType: 'GOOGLE_DRIVE' | 'LOCAL_PERSISTENT';
    folderId?: string;
    clientEmail?: string;
    details: string;
  }> {
    const client = this.getDriveClient();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;

    if (client && folderId) {
      try {
        const res = await client.files.get({
          fileId: folderId,
          fields: 'id, name',
        });
        return {
          configured: true,
          storageType: 'GOOGLE_DRIVE',
          folderId,
          clientEmail,
          details: `Google Drive aktif & terhubung ke folder: "${res.data.name}" (${res.data.id})`,
        };
      } catch (err: unknown) {
        return {
          configured: false,
          storageType: 'LOCAL_PERSISTENT',
          clientEmail,
          details: `Kredensial terpasang namun gagal mengakses folder: ${(err as Error).message}. Menggunakan penyimpanan lokal sementara yang aman.`,
        };
      }
    }

    return {
      configured: false,
      storageType: 'LOCAL_PERSISTENT',
      details: 'Google Drive belum dikonfigurasi di file environment. Menggunakan penyimpanan lokal server (data/uploads) dengan proxy URL aman.',
    };
  }

  public static async uploadFile(params: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    uploadedBy: string;
    categoryFolder?: string;
  }): Promise<DriveAttachment> {
    const client = this.getDriveClient();
    const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Check file size (max 10MB)
    if (params.buffer.length > 10 * 1024 * 1024) {
      throw new Error('Ukuran file melebihi batas maksimum 10 MB');
    }

    // Check allowed MIME types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimes.includes(params.mimeType)) {
      throw new Error(`Format file '${params.mimeType}' tidak diizinkan. Gunakan JPG, PNG, WEBP, PDF, DOCX, atau XLSX.`);
    }

    // Try Google Drive if configured
    if (client && driveFolderId) {
      try {
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(params.buffer);

        const safeName = `${Date.now()}_${params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const driveResponse = await client.files.create({
          requestBody: {
            name: safeName,
            parents: [driveFolderId],
          },
          media: {
            mimeType: params.mimeType,
            body: bufferStream,
          },
          fields: 'id, name, mimeType, size, webViewLink, webContentLink',
        });

        const driveFileId = driveResponse.data.id!;
        return {
          drive_file_id: driveFileId,
          file_name: params.fileName,
          mime_type: params.mimeType,
          size: params.buffer.length,
          uploaded_at: new Date().toISOString(),
          uploaded_by: params.uploadedBy,
          url: `/api/drive/files/${driveFileId}`,
        };
      } catch (driveErr) {
        console.warn('Google Drive upload failed, falling back to local persistent storage:', driveErr);
      }
    }

    // Local persistent storage fallback
    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }

    const fileId = `loc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(params.fileName) || '.bin';
    const diskFileName = `${fileId}${ext}`;
    const targetPath = path.join(this.localUploadsDir, diskFileName);

    await fs.promises.writeFile(targetPath, params.buffer);

    // Save metadata mapping in local upload registry
    const metadataRecord: DriveAttachment = {
      drive_file_id: fileId,
      file_name: params.fileName,
      mime_type: params.mimeType,
      size: params.buffer.length,
      uploaded_at: new Date().toISOString(),
      uploaded_by: params.uploadedBy,
      url: `/api/drive/files/${fileId}`,
    };

    return metadataRecord;
  }

  public static async getFileStream(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    mimeType: string;
    fileName: string;
    size?: number;
  }> {
    // 1. Check local uploads first
    if (fs.existsSync(this.localUploadsDir)) {
      const files = await fs.promises.readdir(this.localUploadsDir);
      const matched = files.find((f) => f.startsWith(fileId));
      if (matched) {
        const fullPath = path.join(this.localUploadsDir, matched);
        const stat = await fs.promises.stat(fullPath);
        const ext = path.extname(matched).toLowerCase();
        let mime = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.png') mime = 'image/png';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.pdf') mime = 'application/pdf';

        return {
          stream: fs.createReadStream(fullPath),
          mimeType: mime,
          fileName: matched,
          size: stat.size,
        };
      }
    }

    // 2. Fetch from Google Drive API
    const client = this.getDriveClient();
    if (client) {
      const meta = await client.files.get({
        fileId,
        fields: 'id, name, mimeType, size',
      });

      const response = await client.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return {
        stream: response.data,
        mimeType: meta.data.mimeType || 'application/octet-stream',
        fileName: meta.data.name || 'download',
        size: meta.data.size ? parseInt(meta.data.size, 10) : undefined,
      };
    }

    throw new Error('File tidak ditemukan atau akses Drive belum tersedia');
  }
}
