import { mkdirSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const directory = join(process.cwd(), 'uploads');
mkdirSync(directory, { recursive: true });
const fileFilter = (request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
export const lotImages = multer({ storage: multer.memoryStorage(), fileFilter, limits: { files: 5, fileSize: 5 * 1024 * 1024 } }).array('images', 5);

function imageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mimeType: 'image/jpeg', extension: '.jpg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: 'image/png', extension: '.png' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mimeType: 'image/webp', extension: '.webp' };
  return null;
}

export async function persistLotImages(request, response, next) {
  const savedFiles = [];
  try {
    for (const file of request.files || []) {
      const detected = imageType(file.buffer);
      if (!detected || detected.mimeType !== file.mimetype) throw new AppError('Each upload must contain a valid JPEG, PNG, or WebP image.', 400);
      const filename = `${randomUUID()}${detected.extension}`;
      await writeFile(join(directory, filename), file.buffer, { flag: 'wx', mode: 0o640 });
      savedFiles.push(filename);
      file.filename = filename;
      file.mimetype = detected.mimeType;
      delete file.buffer;
    }
    next();
  } catch (error) {
    await Promise.all(savedFiles.map((filename) => unlink(join(directory, filename)).catch(() => undefined)));
    next(error);
  }
}

export function handleUploadError(error, request, response, next) { if (error instanceof multer.MulterError) return next(new AppError(error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or less.' : 'Invalid image upload.', 400)); next(error); }
