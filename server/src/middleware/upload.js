import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { 
  ALLOWED_CV_EXTENSIONS, 
  ALLOWED_CV_MIME_TYPES,
  ALLOWED_RESOURCE_EXTENSIONS,
  ALLOWED_RESOURCE_MIME_TYPES,
  ALLOWED_RESOURCE_MIME_BY_EXT,
  ALLOWED_SUBMISSION_EXTENSIONS,
  ALLOWED_SUBMISSION_MIME_BY_EXT
} from '../utils/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary staging directory for incoming uploads (restrictive 0700 permissions)
export const tmpDir = path.resolve(__dirname, '../../tmp');

// Private permanent directory for stored CV files (never served statically, mode 0700)
export const cvDir = path.resolve(__dirname, '../../uploads/cv');

// Private permanent directory for stored course resources (mode 0700)
export const resourcesDir = path.resolve(__dirname, '../../uploads/resources');

// Private permanent directory for stored assignment submissions (mode 0700, max 5 MB per FR-07)
export const submissionsDir = path.resolve(__dirname, '../../uploads/submissions');

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
  ensureSecureDirectory(resourcesDir);
  ensureSecureDirectory(submissionsDir);
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
  ensureSecureDirectory(resourcesDir);
  ensureSecureDirectory(submissionsDir);
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

const resourceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      checkUploadSecurity();
      cb(null, tmpDir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (_req, file, cb) => {
    const randomId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `tmp-res-${randomId}${ext}`);
  },
});

function resourceFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_RESOURCE_EXTENSIONS.includes(ext)) {
    const error = new Error(`Unsupported file extension '${ext}'. Permitted: ${ALLOWED_RESOURCE_EXTENSIONS.join(', ')}.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  const validMimes = ALLOWED_RESOURCE_MIME_BY_EXT[ext];
  if (!validMimes || !validMimes.includes(file.mimetype)) {
    const error = new Error(`MIME type '${file.mimetype}' is not permitted for file extension '${ext}'.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  cb(null, true);
}

const resourceUpload = multer({
  storage: resourceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB (10,485,760 bytes) per FR-04 and file-upload-contracts.md
    files: 1,
  },
  fileFilter: resourceFileFilter,
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'resource', maxCount: 1 },
]);

/**
 * Middleware handling optional or required resource multipart upload.
 * If request is application/json or non-multipart, gracefully proceeds to next().
 */
export const handleResourceUpload = (req, res, next) => {
  // If not multipart form-data, pass through to JSON body handler in controller
  if (!req.is('multipart/form-data')) {
    return next();
  }

  try {
    checkUploadSecurity();
  } catch (secErr) {
    return res.status(500).json({
      success: false,
      message: 'Upload service unavailable: Secure storage permissions could not be established.',
    });
  }

  resourceUpload(req, res, (err) => {
    // If multer created temporary file and encountered an error, clean it up
    const uploadedFile = req.files?.file?.[0] || req.files?.resource?.[0];
    if (uploadedFile) {
      req.file = uploadedFile;
    }

    if (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupErr) {
          console.warn(
            `[Resource Cleanup Warning] Failed to delete temporary file ${req.file.path}: ${cleanupErr.message}`
          );
        }
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File size exceeds maximum permitted limit of 10 MB.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: "Unexpected upload field. Form field name must be 'file' or 'resource'.",
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

    next();
  });
};

const submissionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      checkUploadSecurity();
      cb(null, tmpDir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (_req, file, cb) => {
    const randomId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `tmp-sub-${randomId}${ext}`);
  },
});

function submissionFileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_SUBMISSION_EXTENSIONS.includes(ext)) {
    const error = new Error(`Unsupported file extension '${ext}'. Permitted: ${ALLOWED_SUBMISSION_EXTENSIONS.join(', ')}.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  const validMimes = ALLOWED_SUBMISSION_MIME_BY_EXT[ext];
  if (!validMimes || !validMimes.includes(file.mimetype)) {
    const error = new Error(`MIME type '${file.mimetype}' is not permitted for file extension '${ext}'.`);
    error.statusCode = 415;
    return cb(error, false);
  }

  cb(null, true);
}

const submissionUpload = multer({
  storage: submissionStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB (5,242,880 bytes) per FR-07 and SEC-07
    files: 1,
  },
  fileFilter: submissionFileFilter,
}).fields([
  { name: 'file', maxCount: 1 },
  { name: 'submission', maxCount: 1 },
]);

/**
 * Middleware handling optional or required submission multipart upload.
 * If request is application/json or non-multipart, gracefully proceeds to next().
 */
export const handleSubmissionUpload = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next();
  }

  try {
    checkUploadSecurity();
  } catch (secErr) {
    return res.status(500).json({
      success: false,
      message: 'Upload service unavailable: Secure storage permissions could not be established.',
    });
  }

  submissionUpload(req, res, (err) => {
    const uploadedFile = req.files?.file?.[0] || req.files?.submission?.[0];
    if (uploadedFile) {
      req.file = uploadedFile;
    }

    if (err) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupErr) {
          console.warn(
            `[Submission Cleanup Warning] Failed to delete temporary file ${req.file.path}: ${cleanupErr.message}`
          );
        }
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          message: 'File size exceeds maximum permitted limit of 5 MB.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          success: false,
          message: "Unexpected upload field. Form field name must be 'file' or 'submission'.",
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

    next();
  });
};
