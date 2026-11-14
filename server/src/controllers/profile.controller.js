import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { cvDir } from '../middleware/upload.js';
import { validateProfilePayload, validateFileSignature } from '../utils/validation.js';

/**
 * Constructs sanitized profile response strictly via explicit allowlist.
 * Ensures internal paths, filenames, passwordHash, and staff fields (department) are never returned.
 * Provides both `_id` and `id` for total compatibility with auth service and API contracts.
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const src = user.toObject ? user.toObject() : user;
  const idStr = (src._id ? src._id.toString() : src.id) || '';

  const sanitized = {
    _id: idStr,
    id: idStr,
    name: src.name,
    email: src.email,
    role: src.role,
    active: src.active,
    program: src.program || '',
    year: src.year !== undefined && src.year !== null ? src.year : null,
    department: src.department || '',
    skills: Array.isArray(src.skills) ? [...src.skills] : [],
    preferences: {
      theme: src.preferences?.theme || 'dark',
    },
    cv: null,
  };

  if (src.cv && src.cv.name) {
    sanitized.cv = {
      name: src.cv.name,
      path: '/api/v1/profile/cv', // Explicit API download URL, never physical path or stored filename
      size: src.cv.size,
      mimeType: src.cv.mimeType,
      uploadedAt: src.cv.uploadedAt,
    };
  }

  return sanitized;
}

/**
 * @route   GET /api/v1/profile
 * @desc    Retrieve authenticated student profile
 * @access  Protected (student)
 */
export const getProfile = async (req, res, next) => {
  try {
    // Explicitly exclude passwordHash at database query level
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    const data = sanitizeUser(user);

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data,
      pagination: null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/profile
 * @desc    Update permitted profile fields (name, program, year, skills, preferences.theme)
 * @access  Protected (student)
 */
export const updateProfile = async (req, res, next) => {
  try {
    // 1. Strict allowlist validation
    const { valid, errors } = validateProfilePayload(req.body);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile update request.',
        errors,
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    // 2. Assign strictly allowlisted fields
    if (req.body.name !== undefined) {
      user.name = req.body.name.trim();
    }
    if (req.body.program !== undefined) {
      user.program = req.body.program.trim();
    }
    if (req.body.year !== undefined) {
      user.year = req.body.year;
    }
    if (req.body.skills !== undefined) {
      user.skills = req.body.skills.map((s) => s.trim());
    }
    if (req.body.preferences?.theme !== undefined) {
      if (!user.preferences) {
        user.preferences = {};
      }
      // Preserves any other existing preference keys
      user.preferences.theme = req.body.preferences.theme;
    }

    // FR-03: allow instructors and coordinators to update their department
    if (req.body.department !== undefined) {
      user.department = req.body.department.trim();
    }

    // 3. Save with full Mongoose validation
    await user.save();

    const data = sanitizeUser(user);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data,
      pagination: null,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors,
      });
    }
    next(error);
  }
};

/**
 * @route   POST /api/v1/profile/cv
 * @desc    Upload or replace student CV document (max 2 MB, PDF/Word)
 * @access  Protected (student)
 */
export const uploadCv = async (req, res, next) => {
  // Validate req.file presence before accessing properties
  if (!req.file || !req.file.path || !req.file.originalname) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Please attach a file under the 'cv' field.",
    });
  }

  const tempPath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    // 1. Validate actual file content signature against claimed extension/MIME
    const isValidSignature = validateFileSignature(tempPath, req.file.mimetype, ext);
    if (!isValidSignature) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          console.warn(`[Cleanup Warning] Failed to delete temporary file ${tempPath}: ${cleanupErr.message}`);
        }
      }
      return res.status(415).json({
        success: false,
        message: 'File content signature does not match declared document format.',
      });
    }

    // 2. Retrieve student from database before moving file
    const user = await User.findById(req.user._id);
    if (!user) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          console.warn(`[Cleanup Warning] Failed to delete temporary file ${tempPath}: ${cleanupErr.message}`);
        }
      }
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.',
      });
    }

    // 3. Generate a secure, cryptographically random permanent storage filename
    const randomId = crypto.randomUUID();
    const safeFileName = `cv-${req.user._id}-${randomId}${ext}`;
    const permanentPath = path.join(cvDir, safeFileName);

    // 4. Move file from temp to private permanent storage
    try {
      fs.renameSync(tempPath, permanentPath);
    } catch (moveErr) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          console.warn(`[Cleanup Warning] Failed to delete temporary file ${tempPath}: ${cleanupErr.message}`);
        }
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to store uploaded CV file on server.',
      });
    }

    // Apply restrictive file permissions (mode 0600 - owner read/write only)
    try {
      fs.chmodSync(permanentPath, 0o600);
    } catch (chmodErr) {
      if (fs.existsSync(permanentPath)) {
        try {
          fs.unlinkSync(permanentPath);
        } catch (cleanupErr) {
          console.warn(`[Cleanup Warning] Failed to delete file after chmod failure ${permanentPath}: ${cleanupErr.message}`);
        }
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to secure uploaded CV file with required permissions.',
      });
    }

    // Capture previous CV filename for atomic replacement cleanup
    const previousFileName = user.cv?.path;

    user.cv = {
      name: req.file.originalname,
      path: safeFileName, // Store private relative filename key
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    };

    // 5. Persist to MongoDB; on failure, revert the newly stored file
    try {
      await user.save();
    } catch (saveError) {
      if (fs.existsSync(permanentPath)) {
        try {
          fs.unlinkSync(permanentPath);
        } catch (cleanupErr) {
          console.warn(`[CV Replacement] Cleanup of failed new permanent file failed: ${cleanupErr.message}`);
        }
      }
      // Propagate the original save error without masking it
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: saveError.message,
          errors: saveError.errors,
        });
      }
      return next(saveError);
    }

    // 6. Delete previous CV file defensively only after database update has succeeded
    if (previousFileName && typeof previousFileName === 'string') {
      const isSuspicious =
        previousFileName.includes('..') ||
        previousFileName.includes('/') ||
        previousFileName.includes('\\') ||
        previousFileName.includes('\0');

      if (!isSuspicious) {
        try {
          const oldFilePath = path.resolve(cvDir, previousFileName);
          const rel = path.relative(cvDir, oldFilePath);
          if (
            !rel.startsWith('..') &&
            !path.isAbsolute(rel) &&
            !rel.includes('/') &&
            !rel.includes('\\') &&
            rel === previousFileName &&
            fs.existsSync(oldFilePath)
          ) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (cleanupErr) {
          console.warn(
            `[CV Replacement] Non-fatal previous CV cleanup failure: ${cleanupErr.message}`
          );
        }
      }
    }

    // 7. Return sanitized CV metadata with safe download URL
    return res.status(200).json({
      success: true,
      message: 'CV uploaded and attached to profile successfully.',
      data: {
        name: user.cv.name,
        path: '/api/v1/profile/cv',
        size: user.cv.size,
        mimeType: user.cv.mimeType,
        uploadedAt: user.cv.uploadedAt,
      },
      pagination: null,
    });
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupErr) {
        console.warn(`[Cleanup Warning] Failed to delete temporary file ${tempPath}: ${cleanupErr.message}`);
      }
    }
    next(error);
  }
};

/**
 * @route   GET /api/v1/profile/cv
 * @desc    Download authenticated student's own CV securely
 * @access  Protected (student)
 */
export const downloadCv = async (req, res, next) => {
  try {
    // Resolve strictly using authenticated student identity
    const user = await User.findById(req.user._id);
    if (!user || !user.cv || !user.cv.path) {
      return res.status(404).json({
        success: false,
        message: 'No CV document found on this student profile.',
      });
    }

    const storedPath = user.cv.path;

    // Reject suspicious stored filenames rather than normalizing
    if (
      typeof storedPath !== 'string' ||
      storedPath.includes('..') ||
      storedPath.includes('/') ||
      storedPath.includes('\\') ||
      storedPath.includes('\0')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or suspicious CV storage path.',
      });
    }

    const resolvedPath = path.resolve(cvDir, storedPath);

    // Robust path containment validation via path.relative()
    const rel = path.relative(cvDir, resolvedPath);
    if (
      rel.startsWith('..') ||
      path.isAbsolute(rel) ||
      rel.includes('/') ||
      rel.includes('\\') ||
      rel !== storedPath ||
      !fs.existsSync(resolvedPath)
    ) {
      return res.status(404).json({
        success: false,
        message: 'CV file not found on disk.',
      });
    }

    // Reject symbolic links and non-regular files
    const stats = fs.lstatSync(resolvedPath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      return res.status(404).json({
        success: false,
        message: 'CV file not found on disk.',
      });
    }

    // Sanitize attachment filename per RFC 6266 / RFC 5987
    const safeBaseName = path.basename(user.cv.name).replace(/["\r\n\\]/g, '_').trim() || 'cv-document';
    const encodedName = encodeURIComponent(safeBaseName);

    res.setHeader('Content-Type', user.cv.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeBaseName}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const fileStream = fs.createReadStream(resolvedPath);

    fileStream.on('error', (streamErr) => {
      console.error(`[CV Download] Stream error for file ${resolvedPath}:`, streamErr.message);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error reading CV document stream.',
        });
      } else {
        res.destroy();
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};
