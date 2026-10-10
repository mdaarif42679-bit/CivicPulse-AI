import multer from 'multer';
import path from 'path';
import { config } from '../config.js';
import { uid } from '../services/store.js';
import { httpError } from './errors.js';

const IMAGE = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const AUDIO = { 'audio/webm': '.webm', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3', 'audio/wav': '.wav', 'audio/x-wav': '.wav', 'audio/mp4': '.m4a', 'audio/x-m4a': '.m4a' };

export const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    // The extension comes from the validated MIME type, never from the client's file name.
    filename: (req, file, cb) => cb(null, uid('up') + (IMAGE[file.mimetype] || AUDIO[file.mimetype.split(';')[0]] || '')),
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const mime = file.mimetype.split(';')[0];
    if (file.fieldname === 'image' && IMAGE[mime]) return cb(null, true);
    if (file.fieldname === 'audio' && AUDIO[mime]) return cb(null, true);
    cb(httpError(400, file.fieldname === 'image' ? 'Images must be JPG, PNG, WebP or GIF.' : 'Audio must be WebM, OGG, MP3, WAV or M4A.'));
  },
}).fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]);
export { path };
