import fs from 'fs';

export const ALLOWED_PROFILE_FIELDS = ['name', 'program', 'year', 'skills', 'preferences'];

export const ALLOWED_CV_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const ALLOWED_CV_EXTENSIONS = ['.pdf', '.doc', '.docx'];

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
export function validateDocxZipStructure(filePath) {
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

    // DOCX documents are single-disk ZIP archives
    if (diskNumber !== 0 || cdStartDisk !== 0) {
      return false;
    }
    if (entriesOnThisDisk !== totalEntries || totalEntries === 0) {
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
    let foundDocumentXml = false;

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
      if (entryEnd > cdEnd || fnStart + fnLen > cdEnd) {
        return false;
      }

      const fileName = buffer.toString('utf8', fnStart, fnStart + fnLen);
      if (fileName === 'word/document.xml') {
        foundDocumentXml = true;
      }

      parsedCount++;
      currentOffset = entryEnd;
    }

    // Exact alignment with declared boundaries and entries count
    if (currentOffset !== cdEnd || parsedCount !== totalEntries) {
      return false;
    }

    return foundDocumentXml;
  } catch (err) {
    return false;
  }
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
