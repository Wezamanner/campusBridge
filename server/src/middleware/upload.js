import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ALLOWED_CV_EXTENSIONS, ALLOWED_CV_MIME_TYPES } from '../utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary staging directory for incoming uploads (restrictive 0700 permissions)
export const tmpDir = path.resolve(__dirname, '../../tmp');

// Private permanent directory for stored CV files (never served statically, mode 0700)
export const cvDir = path.resolve(__dirname, '../../uploads/cv');

/**
 * Ensures restrictive 0700 permissions on directory (both existing and newly created).
 * Fails closed if permissions cannot be established.
 */
export function ensureSecureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  }
  // Enforce 0700 permissions on existing directory as well
  fs.chmodSync(dirPath, 0o700);
}

// Track directory security status; fail closed on startup if permissions cannot be secured
let directorySecurityError = null;
try {
  ensureSecureDirectory(tmpDir);
  ensureSecureDirectory(cvDir);
} catch (err) {
  directorySecurityError = err;
  console.error(`[Upload Security Fatal] Failed to secure upload directories: ${err.message}`);
}

/**
 * Verifies upload directory security status.
 * Fails closed if directory security could not be established.
 */
export function checkUploadSecurity() {
  if (directorySecurityError) {
    throw new Error(`Upload directory security could not be established: ${directorySecurityError.message}`);
  }
  // Re-verify at runtime to ensure permissions remain intact
  ensureSecureDirectory(tmpDir);
  ensureSecureDirectory(cvDir);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      checkUploadSecurity();
      cb(null, tmpDir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (_req, file, cb) => {
    // Cryptographically random unique filename for staging
    const randomId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `tmp-cv-${randomId}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_CV_EXTENSIONS.includes(ext)) {
    const error = new Error(`Unsupported file extension '${ext}'. Permitted: ${ALLOWED_CV_EXTENSIONS.join(', ')}.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  if (!ALLOWED_CV_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error(`Unsupported MIME type '${file.mimetype}'. Permitted: PDF or Word documents.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB (2,097,152 bytes) per FR-23 and SEC-07
    files: 1,
  },
  fileFilter,
}).single('cv');

/**
 * Express middleware wrapper around multer
 * Fails closed if directory security is compromised.
 * Ensures temporary files are cleaned up on failures with error logging.
 * Formats errors (413 for too large, 415 for unsupported format, 400 for bad input, 500 for storage security failures).
 */
export const handleCvUpload = (req, res, next) => {
  // Fail closed if directory permissions could not be secured
  try {
    checkUploadSecurity();
  } catch (secErr) {
    return res.status(500).json({
      success: false,
      message: 'Upload service unavailable: Secure storage permissions could not be established.',
    });
  }

  upload(req, res, (err) => {
    // If multer created a temporary file and encountered an error, clean it up immediately
    if (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupErr) {
          console.warn(
            `[Upload Cleanup Warning] Failed to delete temporary file ${req.file.path}: ${cleanupErr.message}`
          );
        }
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File size exceeds maximum permitted limit of 2 MB.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: "Unexpected upload field. Form field name must be 'cv'.",
        });
      }
      if (err.statusCode === 415) {
        return res.status(415).json({
          success: false,
          message: err.message,
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please attach a file under the 'cv' field.",
      });
    }

    next();
  });
};
