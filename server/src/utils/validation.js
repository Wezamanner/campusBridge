import fs from 'fs';
import path from 'path';

export const ALLOWED_PROFILE_FIELDS = ['name', 'program', 'year', 'skills', 'preferences'];

export const ALLOWED_CV_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_CV_EXTENSIONS = ['.pdf', '.doc', '.docx'];

export const ALLOWED_RESOURCE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.txt'];

export const ALLOWED_RESOURCE_MIME_BY_EXT = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.txt': ['text/plain'],
};

export const ALLOWED_RESOURCE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
];

export const ALLOWED_SUBMISSION_EXTENSIONS = ['.pdf', '.doc', '.docx', '.zip', '.txt'];

export const ALLOWED_SUBMISSION_MIME_BY_EXT = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
  '.txt': ['text/plain'],
};

export const ALLOWED_SUBMISSION_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
];

export const RESOURCE_TYPE_ENUM = ['pdf', 'document', 'slides', 'link', 'video', 'other'];

/**
 * Strictly validate PUT /api/v1/profile payload
 * Rejects unsupported, protected, or malformed fields with detailed error messages.
 */
export function validateProfilePayload(body) {
  const errors = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  const keys = Object.keys(body);

  if (keys.length === 0) {
    return {
      valid: false,
      errors: { body: 'At least one field must be provided for update.' },
    };
  }

  // Check for any unapproved or protected fields at the root level
  for (const key of keys) {
    if (!ALLOWED_PROFILE_FIELDS.includes(key)) {
      errors[key] = `Field '${key}' is protected or unsupported for profile updates.`;
    }
  }

  // Validate 'name'
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      errors.name = 'Name must be a string.';
    } else {
      const trimmed = body.name.trim();
      if (trimmed.length < 2 || trimmed.length > 100) {
        errors.name = 'Name must be between 2 and 100 characters.';
      }
    }
  }

  // Validate 'program'
  if (body.program !== undefined) {
    if (typeof body.program !== 'string') {
      errors.program = 'Program must be a string.';
    } else {
      const trimmed = body.program.trim();
      if (trimmed.length > 100) {
        errors.program = 'Program cannot exceed 100 characters.';
      }
    }
  }

  // Validate 'year'
  if (body.year !== undefined) {
    if (typeof body.year !== 'number' || !Number.isInteger(body.year) || body.year < 1 || body.year > 7) {
      errors.year = 'Year must be an integer between 1 and 7.';
    }
  }

  // Validate 'skills'
  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills)) {
      errors.skills = 'Skills must be an array of strings.';
    } else if (body.skills.length > 15) {
      errors.skills = 'Skills list cannot exceed 15 items.';
    } else {
      const seen = new Set();
      body.skills.forEach((skill, index) => {
        if (typeof skill !== 'string') {
          errors[`skills[${index}]`] = 'Each skill must be a string.';
        } else {
          const trimmed = skill.trim();
          if (trimmed.length < 2 || trimmed.length > 30) {
            errors[`skills[${index}]`] = 'Each skill must be between 2 and 30 characters.';
          }
          const lower = trimmed.toLowerCase();
          if (seen.has(lower)) {
            errors[`skills[${index}]`] = `Duplicate skill detected: '${trimmed}'.`;
          }
          seen.add(lower);
        }
      });
    }
  }

  // Validate 'preferences'
  if (body.preferences !== undefined) {
    if (!body.preferences || typeof body.preferences !== 'object' || Array.isArray(body.preferences)) {
      errors.preferences = 'Preferences must be an object.';
    } else {
      const prefKeys = Object.keys(body.preferences);
      for (const prefKey of prefKeys) {
        if (prefKey !== 'theme') {
          errors[`preferences.${prefKey}`] = `Preference '${prefKey}' is unsupported. Only 'theme' can be updated.`;
        }
      }
      if (body.preferences.theme !== undefined) {
        if (body.preferences.theme !== 'dark' && body.preferences.theme !== 'light') {
          errors['preferences.theme'] = "Theme must be either 'dark' or 'light'.";
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Structural validation of DOCX ZIP container:
 * - Scans for End of Central Directory (EOCD) record (PK\x05\x06).
 * - Verifies EOCD comment length and correct termination at the exact file boundary.
 * - Verifies single-disk consistency (disk numbers must be 0, entries match).
 * - Verifies Central Directory offset and size boundaries.
 * - Parses and verifies all Central Directory headers (PK\x01\x02) without boundary overflow.
 * - Confirms consistency between declared entries count and actual parsed headers.
 * - Confirms presence of the required 'word/document.xml' entry.
 * Note: Structural container validation; does not claim schema-level XML semantics.
 */
/**
 * Structural validation of ZIP container and optional required internal archive entry:
 * - Scans for End of Central Directory (EOCD) record (PK\x05\x06).
 * - Verifies EOCD comment length and correct termination at the exact file boundary.
 * - Verifies single-disk consistency (disk numbers must be 0, entries match).
 * - Verifies Central Directory offset and size boundaries.
 * - Parses and verifies all Central Directory headers (PK\x01\x02) without boundary overflow.
 * - Confirms consistency between declared entries count and actual parsed headers.
 * - If requiredEntryName provided, confirms presence of that exact internal entry.
 */
export function validateZipStructureWithEntry(filePath, requiredEntryName = null) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 22) {
      return false;
    }

    // Must start with Local File Header PK\x03\x04 (0x04034b50)
    if (buffer.readUInt32LE(0) !== 0x04034b50) {
      return false;
    }

    // Locate End of Central Directory (EOCD) signature PK\x05\x06 (0x06054b50)
    let eocdOffset = -1;
    const maxSearch = Math.min(buffer.length, 65557);
    const startSearch = buffer.length - maxSearch;
    for (let i = buffer.length - 22; i >= startSearch; i--) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        const commentLen = buffer.readUInt16LE(i + 20);
        // Verify exact termination at the file boundary
        if (i + 22 + commentLen === buffer.length) {
          eocdOffset = i;
          break;
        }
      }
    }

    if (eocdOffset === -1) {
      return false; // No valid, properly terminated EOCD record found
    }

    const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
    const cdStartDisk = buffer.readUInt16LE(eocdOffset + 6);
    const entriesOnThisDisk = buffer.readUInt16LE(eocdOffset + 8);
    const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
    const cdSize = buffer.readUInt32LE(eocdOffset + 12);
    const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

    // Reject ZIP64 archive markers (unsupported and exceeds 10 MB scope)
    if (
      diskNumber === 0xFFFF ||
      cdStartDisk === 0xFFFF ||
      entriesOnThisDisk === 0xFFFF ||
      totalEntries === 0xFFFF ||
      cdSize === 0xFFFFFFFF ||
      cdOffset === 0xFFFFFFFF
    ) {
      return false;
    }

    // Single-disk ZIP archives only
    if (diskNumber !== 0 || cdStartDisk !== 0) {
      return false;
    }
    // Strict entry count bounds (1 to 5000 entries) to prevent DoS resource exhaustion
    if (entriesOnThisDisk !== totalEntries || totalEntries === 0 || totalEntries > 5000) {
      return false;
    }
    if (cdSize === 0 || cdOffset >= buffer.length) {
      return false;
    }

    const cdEnd = cdOffset + cdSize;
    // Central Directory boundaries must not exceed EOCD start or file buffer length
    if (cdEnd > eocdOffset || cdEnd > buffer.length) {
      return false;
    }

    let currentOffset = cdOffset;
    let parsedCount = 0;
    let foundRequiredEntry = requiredEntryName === null;
    const seenEntries = new Set();

    while (currentOffset < cdEnd) {
      if (currentOffset + 46 > cdEnd) {
        return false;
      }

      // Must match Central Directory Header signature PK\x01\x02 (0x02014b50)
      if (buffer.readUInt32LE(currentOffset) !== 0x02014b50) {
        return false;
      }

      const fnLen = buffer.readUInt16LE(currentOffset + 28);
      const extraLen = buffer.readUInt16LE(currentOffset + 30);
      const entryCommentLen = buffer.readUInt16LE(currentOffset + 32);
      const fnStart = currentOffset + 46;
      const entryEnd = fnStart + fnLen + extraLen + entryCommentLen;

      // Strict boundary check: Entry headers cannot extend past cdEnd
      if (entryEnd > cdEnd || fnStart + fnLen > cdEnd || entryEnd <= currentOffset) {
        return false;
      }

      const fileName = buffer.toString('utf8', fnStart, fnStart + fnLen);

      // Duplicate entry detection: reject archives with duplicate internal filenames
      if (seenEntries.has(fileName)) {
        return false;
      }
      seenEntries.add(fileName);

      if (requiredEntryName && fileName === requiredEntryName) {
        foundRequiredEntry = true;
      }

      parsedCount++;
      currentOffset = entryEnd;
    }

    // Exact alignment with declared boundaries and entries count
    if (currentOffset !== cdEnd || parsedCount !== totalEntries) {
      return false;
    }

    return foundRequiredEntry;
  } catch (err) {
    return false;
  }
}

/**
 * Structural validation of DOCX ZIP container:
 * Confirms single-disk ZIP archive structure and presence of 'word/document.xml'.
 */
export function validateDocxZipStructure(filePath) {
  return validateZipStructureWithEntry(filePath, 'word/document.xml');
}

/**
 * Structural validation of PPTX ZIP container:
 * Confirms single-disk ZIP archive structure and presence of 'ppt/presentation.xml'.
 */
export function validatePptxZipStructure(filePath) {
  return validateZipStructureWithEntry(filePath, 'ppt/presentation.xml');
}

/**
 * Structural validation of generic ZIP container:
 * Confirms single-disk ZIP archive structure without requiring Office XML files.
 */
export function validateGenericZipStructure(filePath) {
  return validateZipStructureWithEntry(filePath, null);
}

/**
 * Validate actual file magic numbers (signature) matching the file extension and MIME type.
 * - PDF: Complete 4-byte %PDF signature (25 50 44 46)
 * - DOC: Complete 8-byte OLE Compound File signature (D0 CF 11 E0 A1 B1 1A E1)
 * - DOCX: Complete ZIP container validation with EOCD, boundary verification, and Central Directory entry for 'word/document.xml'
 */
export function validateFileSignature(filePath, mimeType, extension) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const ext = extension.toLowerCase();
  const buffer = Buffer.alloc(8);
  let fd;

  try {
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);
    if (bytesRead < 4) {
      return false;
    }

    const hex = buffer.toString('hex').toLowerCase();

    // PDF validation: 4-byte magic number %PDF (25 50 44 46)
    if (ext === '.pdf' && mimeType === 'application/pdf') {
      return hex.startsWith('25504446');
    }

    // DOC validation: Full 8-byte OLE Compound File signature (D0 CF 11 E0 A1 B1 1A E1)
    if (ext === '.doc' && mimeType === 'application/msword') {
      if (bytesRead < 8) {
        return false;
      }
      return hex.startsWith('d0cf11e0a1b11ae1');
    }

    // DOCX validation: Must start with PK\x03\x04 AND contain valid EOCD and Central Directory entry for word/document.xml
    if (
      ext === '.docx' &&
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      if (!hex.startsWith('504b0304')) {
        return false;
      }
      return validateDocxZipStructure(filePath);
    }

    return false;
  } catch (err) {
    return false;
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

/**
 * Bounded streaming validation of entire text file:
 * - Scans entire file in 64 KB chunks.
 * - Rejects empty files.
 * - Rejects binary null bytes (0x00) and non-printable control characters anywhere in the file.
 * - Enforces strict UTF-8 multi-byte decoding across the entire file.
 */
export function validateFullTextFile(filePath) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const stats = fs.fstatSync(fd);
    if (stats.size === 0) {
      return false; // Reject empty files
    }

    const chunkSize = 64 * 1024;
    const chunkBuffer = Buffer.alloc(chunkSize);
    let bytesRead = 0;
    const decoder = new TextDecoder('utf-8', { fatal: true });

    while ((bytesRead = fs.readSync(fd, chunkBuffer, 0, chunkSize, null)) > 0) {
      const slice = chunkBuffer.subarray(0, bytesRead);
      for (let i = 0; i < slice.length; i++) {
        const byte = slice[i];
        if (byte === 0x00 || (byte < 0x09) || (byte === 0x0b) || (byte === 0x0c) || (byte >= 0x0e && byte <= 0x1f)) {
          return false;
        }
      }
      decoder.decode(slice, { stream: true });
    }
    // Flush decoder to ensure clean termination without dangling partial multi-byte sequences
    decoder.decode();
    return true;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
}

/**
 * Validate course resource file signature against approved MIME types and extensions.
 * - PDF: 4-byte %PDF signature (25 50 44 46)
 * - DOC / PPT: 8-byte OLE Compound File signature (D0 CF 11 E0 A1 B1 1A E1)
 * - DOCX / PPTX / ZIP: Starts with PK\x03\x04 (50 4B 03 04)
 * - TXT: Bounded streaming validation of entire file for valid UTF-8 and non-binary characters
 */
export function validateResourceFileSignature(filePath, mimeType, extension) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const ext = extension.toLowerCase();

  // TXT validation: examines entire file via bounded stream
  if (ext === '.txt') {
    return validateFullTextFile(filePath);
  }

  const buffer = Buffer.alloc(512);
  let fd;

  try {
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    if (bytesRead < 4) {
      return false;
    }

    const hex = buffer.subarray(0, 8).toString('hex').toLowerCase();

    // PDF validation
    if (ext === '.pdf') {
      return hex.startsWith('25504446');
    }

    // DOC / PPT validation (OLE compound file)
    if (ext === '.doc' || ext === '.ppt') {
      if (bytesRead < 8) return false;
      return hex.startsWith('d0cf11e0a1b11ae1');
    }

    // DOCX validation: Must start with PK\x03\x04 and contain word/document.xml
    if (ext === '.docx') {
      if (!hex.startsWith('504b0304')) return false;
      return validateDocxZipStructure(filePath);
    }

    // PPTX validation: Must start with PK\x03\x04 and contain ppt/presentation.xml (distinguished from generic ZIP)
    if (ext === '.pptx') {
      if (!hex.startsWith('504b0304')) return false;
      return validatePptxZipStructure(filePath);
    }

    // Generic ZIP validation: Valid single-disk ZIP archive structure
    if (ext === '.zip') {
      if (!hex.startsWith('504b0304')) return false;
      return validateGenericZipStructure(filePath);
    }

    return false;
  } catch (err) {
    return false;
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

/**
 * Validates request payload for POST /api/v1/courses/:id/resources
 */
export function validateResourceInput(body, file) {
  const errors = {};

  if (!body && !file) {
    return {
      valid: false,
      errors: { body: 'Request body or file attachment is required.' },
    };
  }

  const title = body?.title;
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.title = 'Resource title is required.';
  } else if (title.trim().length > 150) {
    errors.title = 'Resource title cannot exceed 150 characters.';
  }

  const type = body?.type;
  if (type !== undefined && type !== null && type !== '') {
    if (!RESOURCE_TYPE_ENUM.includes(type)) {
      errors.type = `Resource type must be one of: ${RESOURCE_TYPE_ENUM.join(', ')}.`;
    }
  }

  // Must have either an uploaded file or an external link URL
  if (!file) {
    const url = body?.url;
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      errors.url = 'Either an uploaded file or a resource URL must be provided.';
    } else {
      const trimmedUrl = url.trim();
      // Reject URLs containing control characters or whitespace
      if (/[\x00-\x1F\x7F\s]/.test(trimmedUrl)) {
        errors.url = 'Resource URL contains invalid characters or whitespace.';
      } else {
        try {
          const parsed = new URL(trimmedUrl);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            errors.url = 'Only HTTP and HTTPS URL schemes are permitted for external links.';
          } else if (parsed.username || parsed.password) {
            errors.url = 'Resource URL cannot contain embedded credentials (username/password).';
          } else if (!parsed.hostname || parsed.hostname.includes('\\') || parsed.hostname.startsWith('.') || parsed.hostname.endsWith('.')) {
            errors.url = 'Invalid hostname in resource URL.';
          }
        } catch {
          if (!trimmedUrl.startsWith('/uploads/resources/')) {
            errors.url = 'Resource URL must be a valid HTTP/HTTPS link or internal resource path.';
          }
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate assignment authoring input (FR-06)
 * Rules:
 * - title: string, 3 to 200 characters (required)
 * - description: non-empty string instructions (required)
 * - deadline: valid date in the future (required)
 * - maxScore: number, 1 to 100 (default 100)
 * - allowLate: boolean (default false)
 */
export function validateAssignmentInput(body) {
  const errors = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      valid: false,
      errors: { body: 'Request body must be a valid JSON object.' },
    };
  }

  // title: String, 3 to 200 characters (required)
  const title = body.title;
  if (title === undefined || title === null || typeof title !== 'string') {
    errors.title = 'Assignment title is required and must be a string.';
  } else {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
      errors.title = 'Assignment title must be between 3 and 200 characters.';
    }
  }

  // description: Required string instructions
  const description = body.description;
  if (description === undefined || description === null || typeof description !== 'string') {
    errors.description = 'Assignment instructions/description are required and must be a string.';
  } else {
    const trimmedDesc = description.trim();
    if (trimmedDesc.length === 0) {
      errors.description = 'Assignment instructions/description cannot be empty.';
    }
  }

  // deadline: Future Date (required)
  const deadline = body.deadline;
  if (!deadline) {
    errors.deadline = 'Assignment submission deadline is required.';
  } else {
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      errors.deadline = 'Deadline must be a valid ISO date-time string.';
    } else if (deadlineDate.getTime() <= Date.now()) {
      errors.deadline = 'Assignment deadline must be a future date and time.';
    }
  }

  // maxScore: Number, 1 to 100 (default: 100)
  const maxScore = body.maxScore;
  if (maxScore !== undefined && maxScore !== null && maxScore !== '') {
    const numScore = Number(maxScore);
    if (!Number.isFinite(numScore) || numScore < 1 || numScore > 100) {
      errors.maxScore = 'Maximum score must be a number between 1 and 100.';
    }
  }

  // allowLate: Boolean (optional, default: false)
  const allowLate = body.allowLate;
  if (allowLate !== undefined && allowLate !== null) {
    if (typeof allowLate !== 'boolean' && allowLate !== 'true' && allowLate !== 'false') {
      errors.allowLate = 'allowLate must be a boolean value.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate assignment submission file signature (FR-07)
 * Permitted extensions: .pdf, .doc, .docx, .zip, .txt
 */
export function validateSubmissionFileSignature(filePath, mimeType, originalnameOrExt) {
  let ext = (originalnameOrExt || '').toLowerCase();
  if (!ext.startsWith('.')) {
    ext = path.extname(ext).toLowerCase();
  }
  if (!ALLOWED_SUBMISSION_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension '${ext}' is not permitted. Permitted formats: ${ALLOWED_SUBMISSION_EXTENSIONS.join(', ')}`,
    };
  }

  const validMimes = ALLOWED_SUBMISSION_MIME_BY_EXT[ext];
  if (!validMimes || !validMimes.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type '${mimeType}' is not permitted for extension '${ext}'.`,
    };
  }

  const isValid = validateResourceFileSignature(filePath, mimeType, ext);
  if (!isValid) {
    return {
      valid: false,
      error: `Uploaded file signature does not match declared format '${ext}'.`,
    };
  }

  return { valid: true };
}
