import { Router, Response } from 'express';
import multer from 'multer';
import { DriveService } from '../services/drive-service';
import { AuthenticatedRequest, requireOperatorOrAdmin, blockReadOnly, authenticateAny } from '../middleware/auth-middleware';

export const driveRouter = Router();

// Configure multer memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload endpoint (Staff only - Operator & Admin)
driveRouter.post(
  '/upload',
  requireOperatorOrAdmin,
  blockReadOnly,
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
      }

      const attachment = await DriveService.uploadFile({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedBy: req.user!.username,
        categoryFolder: req.body.category || 'Assets',
      });

      return res.status(201).json({
        success: true,
        message: 'File berhasil diunggah.',
        data: attachment,
      });
    } catch (err: unknown) {
      return res.status(400).json({ success: false, message: (err as Error).message });
    }
  }
);

// Stream file to client (available to authenticated staff and active reviewers)
driveRouter.get('/files/:id', authenticateAny, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const fileId = req.params.id;
    const { stream, mimeType, fileName, size } = await DriveService.getFileStream(fileId);

    res.setHeader('Content-Type', mimeType);
    if (size) res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    stream.pipe(res);
  } catch (err: unknown) {
    return res.status(404).json({ success: false, message: (err as Error).message });
  }
});
