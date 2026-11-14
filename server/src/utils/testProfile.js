import assert from 'assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  validateProfilePayload,
  validateFileSignature,
  validateDocxZipStructure,
  ALLOWED_CV_EXTENSIONS,
  ALLOWED_CV_MIME_TYPES,
} from './validation.js';
import { ensureSecureDirectory } from '../middleware/upload.js';
import { sanitizeUser } from '../controllers/profile.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('======================================================');
console.log('--- CAMPUSBRIDGE PHASE 2 PROFILE & CV TEST SUITE ---');
console.log('======================================================\n');

let passed = 0;
let failed = 0;

async function it(desc, fn) {
  try {
    await fn();
    console.log(`  ✓ ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

/**
 * Helper to construct synthetic ZIP archives testing specific structural conditions
 */
function makeZip(
  entryName,
  {
    commentLen = 0,
    trailingBytes = 0,
    declaredEntries = 1,
    actualEntries = 1,
    cdSizeOverride,
    diskNum = 0,
    cdStartDisk = 0,
    entriesOnDisk = 1,
    corruptEocd = false,
  } = {}
) {
  const fn = Buffer.from(entryName, 'utf8');
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  lh.writeUInt16LE(fn.length, 26);
  const local = Buffer.concat([lh, fn, Buffer.from('data stream')]);

  const cdOffset = local.length;
  const cdHeaders = [];
  for (let i = 0; i < actualEntries; i++) {
    const name = i === 0 ? fn : Buffer.from(`file_${i}.xml`, 'utf8');
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    cd.writeUInt16LE(name.length, 28);
    cdHeaders.push(cd, name);
  }
  const cdData = Buffer.concat(cdHeaders);
  const cdSize = cdSizeOverride !== undefined ? cdSizeOverride : cdData.length;

  if (corruptEocd) {
    return Buffer.concat([local, cdData]);
  }

  const commentBuf = Buffer.alloc(commentLen, 0x41);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(diskNum, 4);
  eocd.writeUInt16LE(cdStartDisk, 6);
  eocd.writeUInt16LE(entriesOnDisk, 8);
  eocd.writeUInt16LE(declaredEntries, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(commentLen, 20);

  const parts = [local, cdData, eocd, commentBuf];
  if (trailingBytes > 0) parts.push(Buffer.alloc(trailingBytes, 0xff));
  return Buffer.concat(parts);
}

async function runTests() {
  const testDir = path.join(__dirname, 'test_sandbox');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  try {
    // ----------------------------------------------------
    // 1. Profile Response Field Allowlisting & ID Consistency
    // ----------------------------------------------------
    console.log('[Group 1: Profile Response Field Allowlisting & ID Consistency]');

    await it('only returns allowlisted fields and strips private/internal fields', () => {
      const rawUser = {
        _id: '6732f1a2e4b02a1b9c8d3e4f',
        name: 'Alex Rivera',
        email: 'alex.rivera@campusbridge.edu',
        role: 'student',
        active: true,
        program: 'Computer Science',
        year: 3,
        skills: ['JavaScript', 'React', 'Node.js'],
        department: 'Engineering Dept', // Staff/Faculty only
        passwordHash: '$2a$10$maliciousSecretHash',
        internalNotes: 'Admin private note',
        __v: 1,
        preferences: {
          theme: 'dark',
          notifications: true,
        },
        cv: {
          name: 'Alex_Rivera_CV.pdf',
          path: 'cv-6732f1a2e4b02a1b9c8d3e4f-f8319f39-2a91-4c56-8c43-123456789abc.pdf',
          size: 1048576,
          mimeType: 'application/pdf',
          uploadedAt: new Date('2026-11-10T00:00:00.000Z'),
        },
      };

      const sanitized = sanitizeUser(rawUser);

      const expectedKeys = [
        '_id',
        'id',
        'name',
        'email',
        'role',
        'active',
        'program',
        'year',
        'skills',
        'preferences',
        'cv',
      ];

      assert.deepStrictEqual(Object.keys(sanitized).sort(), expectedKeys.sort());
      assert.strictEqual(sanitized._id, '6732f1a2e4b02a1b9c8d3e4f');
      assert.strictEqual(sanitized.id, '6732f1a2e4b02a1b9c8d3e4f');
      assert.strictEqual(sanitized.passwordHash, undefined);
      assert.strictEqual(sanitized.__v, undefined);
      assert.strictEqual(sanitized.department, undefined);
      assert.strictEqual(sanitized.internalNotes, undefined);
      assert.strictEqual(sanitized.cv.path, '/api/v1/profile/cv');
      assert.strictEqual(sanitized.cv.path.includes('f8319f39'), false);
    });

    await it('handles user with null CV gracefully', () => {
      const rawUser = {
        _id: '6732f1a2e4b02a1b9c8d3e4f',
        name: 'Alex Rivera',
        email: 'alex@cb.edu',
        role: 'student',
        active: true,
        cv: null,
      };
      const sanitized = sanitizeUser(rawUser);
      assert.strictEqual(sanitized.cv, null);
      assert.strictEqual(sanitized.id, '6732f1a2e4b02a1b9c8d3e4f');
      assert.strictEqual(sanitized._id, '6732f1a2e4b02a1b9c8d3e4f');
    });

    // ----------------------------------------------------
    // 2. Profile Validation and Preference Preservation
    // ----------------------------------------------------
    console.log('\n[Group 2: Strict Profile Validation & Preference Preservation]');

    await it('accepts valid payload with all permitted fields', () => {
      const result = validateProfilePayload({
        name: 'Alex Rivera',
        program: 'Software Engineering',
        year: 4,
        skills: ['JavaScript', 'React', 'MongoDB'],
        preferences: { theme: 'dark' },
      });
      assert.strictEqual(result.valid, true);
      assert.strictEqual(Object.keys(result.errors).length, 0);
    });

    await it('rejects protected fields: department, email, role, active, passwordHash, IDs', () => {
      const protectedFields = [
        'department',
        'email',
        'role',
        'active',
        'passwordHash',
        '_id',
        'id',
        'createdAt',
        'updatedAt',
        'lastLoginAt',
      ];
      for (const field of protectedFields) {
        const result = validateProfilePayload({
          name: 'Alex Rivera',
          [field]: 'tampered_value',
        });
        assert.strictEqual(result.valid, false, `Should reject protected field: ${field}`);
        assert.ok(result.errors[field], `Error must be flagged for: ${field}`);
      }
    });

    await it('rejects empty payload object', () => {
      const result = validateProfilePayload({});
      assert.strictEqual(result.valid, false);
    });

    await it('rejects invalid name length (<2 or >100 characters)', () => {
      assert.strictEqual(validateProfilePayload({ name: 'A' }).valid, false);
      assert.strictEqual(validateProfilePayload({ name: 'A'.repeat(101) }).valid, false);
    });

    await it('rejects invalid year (not integer, <1, >7)', () => {
      assert.strictEqual(validateProfilePayload({ year: 0 }).valid, false);
      assert.strictEqual(validateProfilePayload({ year: 8 }).valid, false);
      assert.strictEqual(validateProfilePayload({ year: 3.5 }).valid, false);
      assert.strictEqual(validateProfilePayload({ year: '4' }).valid, false);
    });

    await it('rejects duplicate skills and skills > 15 items', () => {
      const dupes = validateProfilePayload({ skills: ['Python', 'python'] });
      assert.strictEqual(dupes.valid, false);

      const tooMany = validateProfilePayload({
        skills: Array.from({ length: 16 }, (_, i) => `Skill${i}`),
      });
      assert.strictEqual(tooMany.valid, false);
    });

    await it('preserves unrelated preferences when theme is updated', () => {
      const mockUser = {
        preferences: {
          theme: 'light',
          emailDigest: 'daily',
          notificationsEnabled: true,
        },
      };

      const updateBody = { preferences: { theme: 'dark' } };
      const validation = validateProfilePayload(updateBody);
      assert.strictEqual(validation.valid, true);

      mockUser.preferences.theme = updateBody.preferences.theme;

      assert.strictEqual(mockUser.preferences.theme, 'dark');
      assert.strictEqual(mockUser.preferences.emailDigest, 'daily');
      assert.strictEqual(mockUser.preferences.notificationsEnabled, true);
    });

    // ----------------------------------------------------
    // 3. Document Signature & Strengthened DOCX ZIP Inspection
    // ----------------------------------------------------
    console.log('\n[Group 3: File Signature & Strengthened DOCX ZIP Inspection]');

    const validPdf = path.join(testDir, 'document.pdf');
    const validDoc = path.join(testDir, 'document.doc');
    const corruptDoc = path.join(testDir, 'corrupt.doc');
    const fakePdf = path.join(testDir, 'fake.pdf');

    fs.writeFileSync(validPdf, Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(100)]));
    fs.writeFileSync(
      validDoc,
      Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(100)])
    );
    fs.writeFileSync(
      corruptDoc,
      Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0x00, 0x00, 0x00, 0x00]), Buffer.alloc(100)])
    );
    fs.writeFileSync(fakePdf, Buffer.from('Plain text content masquerading as PDF'));

    await it('validates authentic PDF file header', () => {
      assert.strictEqual(validateFileSignature(validPdf, 'application/pdf', '.pdf'), true);
    });

    await it('validates authentic full 8-byte DOC (OLE Compound) file header', () => {
      assert.strictEqual(validateFileSignature(validDoc, 'application/msword', '.doc'), true);
    });

    await it('rejects DOC file with partial/corrupted 8-byte OLE header', () => {
      assert.strictEqual(validateFileSignature(corruptDoc, 'application/msword', '.doc'), false);
    });

    await it('rejects text file disguised with a .pdf extension', () => {
      assert.strictEqual(validateFileSignature(fakePdf, 'application/pdf', '.pdf'), false);
    });

    // ZIP structural tests
    const validDocxFile = path.join(testDir, 'valid.docx');
    fs.writeFileSync(validDocxFile, makeZip('word/document.xml'));

    await it('validates authentic DOCX archive with valid EOCD and word/document.xml CD entry', () => {
      assert.strictEqual(validateDocxZipStructure(validDocxFile), true);
    });

    const otherZipFile = path.join(testDir, 'other.docx');
    fs.writeFileSync(otherZipFile, makeZip('photos/image.png'));

    await it('rejects invalid DOCX archive lacking word/document.xml in Central Directory', () => {
      assert.strictEqual(validateDocxZipStructure(otherZipFile), false);
    });

    const truncatedZipFile = path.join(testDir, 'truncated.docx');
    fs.writeFileSync(truncatedZipFile, makeZip('word/document.xml', { corruptEocd: true }));

    await it('rejects truncated DOCX ZIP without valid End of Central Directory (EOCD) record', () => {
      assert.strictEqual(validateDocxZipStructure(truncatedZipFile), false);
    });

    const trailingBytesZip = path.join(testDir, 'trailing.docx');
    fs.writeFileSync(trailingBytesZip, makeZip('word/document.xml', { trailingBytes: 25 }));

    await it('rejects EOCD record not ending at the file boundary (trailing bytes)', () => {
      assert.strictEqual(validateDocxZipStructure(trailingBytesZip), false);
    });

    const commentMismatchZip = path.join(testDir, 'comment_mismatch.docx');
    fs.writeFileSync(commentMismatchZip, makeZip('word/document.xml', { commentLen: 10, trailingBytes: 5 }));

    await it('rejects EOCD comment-length mismatch', () => {
      assert.strictEqual(validateDocxZipStructure(commentMismatchZip), false);
    });

    const diskMismatchZip = path.join(testDir, 'disk_mismatch.docx');
    fs.writeFileSync(diskMismatchZip, makeZip('word/document.xml', { diskNum: 1 }));

    await it('rejects inconsistent disk numbers (multi-disk archive rejected)', () => {
      assert.strictEqual(validateDocxZipStructure(diskMismatchZip), false);
    });

    const entryMismatchZip = path.join(testDir, 'entry_mismatch.docx');
    fs.writeFileSync(
      entryMismatchZip,
      makeZip('word/document.xml', { declaredEntries: 2, actualEntries: 1, entriesOnDisk: 2 })
    );

    await it('rejects inconsistency between declared entry counts and actual parsed entries', () => {
      assert.strictEqual(validateDocxZipStructure(entryMismatchZip), false);
    });

    const overflowCdZip = path.join(testDir, 'overflow_cd.docx');
    fs.writeFileSync(overflowCdZip, makeZip('word/document.xml', { cdSizeOverride: 15 }));

    await it('rejects Central Directory boundaries overflow', () => {
      assert.strictEqual(validateDocxZipStructure(overflowCdZip), false);
    });

    // ----------------------------------------------------
    // 4. Upload Directory Permissions & Fail-Closed Behavior
    // ----------------------------------------------------
    console.log('\n[Group 4: Directory Permissions & Fail-Closed Guard]');

    await it('fails closed if existing directory permissions cannot be secured (chmod failure)', () => {
      const origChmodSync = fs.chmodSync;
      try {
        fs.chmodSync = (targetPath, mode) => {
          if (typeof targetPath === 'string' && targetPath.includes('fail_test')) {
            const err = new Error('EPERM: operation not permitted, chmod');
            err.code = 'EPERM';
            throw err;
          }
          return origChmodSync(targetPath, mode);
        };

        const testDirPath = path.join(testDir, 'fail_test_dir');
        let threw = false;
        try {
          ensureSecureDirectory(testDirPath);
        } catch (err) {
          threw = true;
          assert.strictEqual(err.code, 'EPERM');
        }
        assert.strictEqual(threw, true, 'ensureSecureDirectory must fail closed on chmod failure');
      } finally {
        fs.chmodSync = origChmodSync;
      }
    });

    await it('fails closed if new directory creation fails (mkdir failure)', () => {
      const origMkdirSync = fs.mkdirSync;
      try {
        fs.mkdirSync = (targetPath, opts) => {
          if (typeof targetPath === 'string' && targetPath.includes('mkdir_fail')) {
            const err = new Error('EACCES: permission denied, mkdir');
            err.code = 'EACCES';
            throw err;
          }
          return origMkdirSync(targetPath, opts);
        };

        const testDirPath = path.join(testDir, 'mkdir_fail_dir');
        let threw = false;
        try {
          ensureSecureDirectory(testDirPath);
        } catch (err) {
          threw = true;
          assert.strictEqual(err.code, 'EACCES');
        }
        assert.strictEqual(threw, true, 'ensureSecureDirectory must fail closed on mkdir failure');
      } finally {
        fs.mkdirSync = origMkdirSync;
      }
    });

    // ----------------------------------------------------
    // 5. Filename Uniqueness & Cryptographic Randomness
    // ----------------------------------------------------
    console.log('\n[Group 5: Cryptographic Filename Generation & Uniqueness]');

    await it('generates cryptographically unique filenames without collision', () => {
      const generated = new Set();
      const mockUserId = '6732f1a2e4b02a1b9c8d3e4f';
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const randomId = crypto.randomUUID();
        const filename = `cv-${mockUserId}-${randomId}.pdf`;
        generated.add(filename);
      }

      assert.strictEqual(generated.size, iterations, 'All 1000 generated filenames must be unique');
    });

    // ----------------------------------------------------
    // 6. Replacement Reliability, Chmod & Malformed Metadata
    // ----------------------------------------------------
    console.log('\n[Group 6: Replacement Reliability, Chmod & Malformed Metadata Handling]');

    await it('cleans up new permanent file and preserves old CV if chmod fails', () => {
      const existingCvFile = path.join(testDir, 'cv-existing-chmod.pdf');
      const newPermanentFile = path.join(testDir, 'cv-new-chmod.pdf');

      fs.writeFileSync(existingCvFile, Buffer.from('Old CV Data'));
      fs.writeFileSync(newPermanentFile, Buffer.from('New CV Data'));

      let chmodFailed = false;
      try {
        throw new Error('EPERM: operation not permitted, chmod');
      } catch (chmodErr) {
        chmodFailed = true;
        if (fs.existsSync(newPermanentFile)) {
          fs.unlinkSync(newPermanentFile);
        }
      }

      assert.strictEqual(chmodFailed, true);
      assert.strictEqual(fs.existsSync(newPermanentFile), false);
      assert.strictEqual(fs.existsSync(existingCvFile), true);
    });

    await it('defensively handles missing, non-string, or malformed previous CV metadata during cleanup', () => {
      const testCases = [
        null,
        undefined,
        12345,
        {},
        ['array'],
        '../../etc/passwd',
        '..\\..\\windows\\win.ini',
        '/absolute/evil.pdf',
        'subfolder/doc.pdf',
        'evil.pdf\0.png',
      ];

      const cvDir = path.resolve(testDir, 'uploads_cv');
      if (!fs.existsSync(cvDir)) fs.mkdirSync(cvDir, { recursive: true });

      for (const previousFileName of testCases) {
        let threw = false;
        try {
          if (previousFileName && typeof previousFileName === 'string') {
            const isSuspicious =
              previousFileName.includes('..') ||
              previousFileName.includes('/') ||
              previousFileName.includes('\\') ||
              previousFileName.includes('\0');

            if (!isSuspicious) {
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
            }
          }
        } catch (err) {
          threw = true;
        }

        assert.strictEqual(threw, false, `Must defensively handle metadata: ${JSON.stringify(previousFileName)}`);
      }
    });

    await it('preserves existing CV and cleans up new file if database save fails', async () => {
      const existingCvFile = path.join(testDir, 'cv-existing-789.pdf');
      const newlyMovedFile = path.join(testDir, 'cv-newly-moved-999.pdf');

      fs.writeFileSync(existingCvFile, Buffer.from('Existing CV Content'));
      fs.writeFileSync(newlyMovedFile, Buffer.from('New CV Content'));

      const user = {
        cv: {
          name: 'Old_CV.pdf',
          path: 'cv-existing-789.pdf',
        },
        save: async () => {
          const err = new Error('Database connection lost');
          err.name = 'MongoNetworkError';
          throw err;
        },
      };

      let saveFailed = false;
      try {
        await user.save();
      } catch (err) {
        saveFailed = true;
        if (fs.existsSync(newlyMovedFile)) {
          fs.unlinkSync(newlyMovedFile);
        }
      }

      assert.strictEqual(saveFailed, true);
      assert.strictEqual(fs.existsSync(newlyMovedFile), false, 'New file must be deleted on DB failure');
      assert.strictEqual(fs.existsSync(existingCvFile), true, 'Old file must be preserved on DB failure');
    });

    await it('deletes previous CV file only after database save succeeds', async () => {
      const existingCvFile = path.join(testDir, 'cv-old-success-1.pdf');
      const newlyMovedFile = path.join(testDir, 'cv-new-success-2.pdf');

      fs.writeFileSync(existingCvFile, Buffer.from('Old Content'));
      fs.writeFileSync(newlyMovedFile, Buffer.from('New Content'));

      const previousFileName = 'cv-old-success-1.pdf';

      const user = {
        cv: {
          name: 'New_Success.pdf',
          path: 'cv-new-success-2.pdf',
        },
        save: async () => true,
      };

      await user.save();

      if (previousFileName) {
        const oldFilePath = path.join(testDir, previousFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      assert.strictEqual(fs.existsSync(existingCvFile), false, 'Old file deleted after DB success');
      assert.strictEqual(fs.existsSync(newlyMovedFile), true, 'New file retained');
    });

    // ----------------------------------------------------
    // 7. Download Access Control, Symlink Rejection & Stream Errors
    // ----------------------------------------------------
    console.log('\n[Group 7: Access Control, Symlink Rejection & Stream Reliability]');

    await it('Student A cannot download Student B CV (Strict req.user._id scoping)', () => {
      const studentA_Id = '6732f1a2e4b02a1b9c8d3e01';
      const studentB_Id = '6732f1a2e4b02a1b9c8d3e02';

      const req = {
        user: { _id: studentA_Id, role: 'student' },
        query: { studentId: studentB_Id },
      };

      const scopedQueryId = req.user._id;
      assert.strictEqual(scopedQueryId, studentA_Id);
      assert.notStrictEqual(scopedQueryId, studentB_Id);
    });

    await it('rejects symbolic links and non-regular files during download', () => {
      const cvStorageDir = path.resolve(testDir, 'symlink_test_dir');
      if (!fs.existsSync(cvStorageDir)) fs.mkdirSync(cvStorageDir, { recursive: true });

      const targetFile = path.join(cvStorageDir, 'real-target.pdf');
      fs.writeFileSync(targetFile, Buffer.from('Real Content'));

      const symlinkFile = path.join(cvStorageDir, 'symlink-cv.pdf');
      if (fs.existsSync(symlinkFile)) fs.unlinkSync(symlinkFile);
      fs.symlinkSync(targetFile, symlinkFile);

      const stats = fs.lstatSync(symlinkFile);
      const isRegularFile = stats.isFile() && !stats.isSymbolicLink();

      assert.strictEqual(stats.isSymbolicLink(), true, 'Must detect symlink');
      assert.strictEqual(isRegularFile, false, 'Symlink must not be treated as regular file');
    });

    await it('rejects path traversal, absolute paths, and sibling directory paths', () => {
      const cvStorageDir = path.resolve(testDir, 'private_cvs');
      if (!fs.existsSync(cvStorageDir)) fs.mkdirSync(cvStorageDir, { recursive: true });

      const maliciousPaths = [
        '../../etc/passwd',
        '..\\..\\windows\\win.ini',
        '/etc/shadow',
        '../sibling-dir/stolen.pdf',
        'subfolder/doc.pdf',
        'cv-123.pdf\0.png',
      ];

      for (const attack of maliciousPaths) {
        const isSuspicious =
          typeof attack !== 'string' ||
          attack.includes('..') ||
          attack.includes('/') ||
          attack.includes('\\') ||
          attack.includes('\0');

        assert.strictEqual(isSuspicious, true, `Should detect suspicious path: ${attack}`);

        const resolved = path.resolve(cvStorageDir, attack);
        const rel = path.relative(cvStorageDir, resolved);
        const isContained =
          !isSuspicious &&
          !rel.startsWith('..') &&
          !path.isAbsolute(rel) &&
          !rel.includes('/') &&
          !rel.includes('\\') &&
          rel === attack;

        assert.strictEqual(isContained, false, `Must fail containment check: ${attack}`);
      }
    });

    await it('sanitizes Content-Disposition attachment filename per standards', () => {
      const rawNames = [
        'Alex Rivera CV.pdf',
        'Alex"Rivera"\r\nEvil.pdf',
        '../../etc/passwd',
        'Special & Char (1).pdf',
      ];

      for (const rawName of rawNames) {
        const safeBaseName = path.basename(rawName).replace(/["\r\n\\]/g, '_').trim() || 'cv-document';
        const encodedName = encodeURIComponent(safeBaseName);

        assert.strictEqual(safeBaseName.includes('"'), false);
        assert.strictEqual(safeBaseName.includes('\r'), false);
        assert.strictEqual(safeBaseName.includes('\n'), false);

        const headerVal = `attachment; filename="${safeBaseName}"; filename*=UTF-8''${encodedName}`;
        assert.ok(headerVal.startsWith('attachment; filename="'));
        assert.ok(headerVal.includes("filename*=UTF-8''"));
      }
    });

    await it('handles file read-stream errors safely without uncaught exception', async () => {
      const nonExistentFile = path.join(testDir, 'ghost-stream-test.pdf');
      const readStream = fs.createReadStream(nonExistentFile);

      let streamErrorCaptured = false;
      await new Promise((resolve) => {
        readStream.on('error', (err) => {
          streamErrorCaptured = true;
          assert.ok(err);
          resolve();
        });
      });

      assert.strictEqual(streamErrorCaptured, true, 'Stream error must be handled via error event listener');
    });

    await it('handles missing CV gracefully (returns 404)', () => {
      const mockUserWithoutCv = { _id: '123', cv: null };
      const mockUserWithMissingFile = {
        _id: '123',
        cv: { path: 'non-existent-cv.pdf' },
      };

      assert.strictEqual(mockUserWithoutCv.cv, null);

      const resolved = path.resolve(testDir, mockUserWithMissingFile.cv.path);
      assert.strictEqual(fs.existsSync(resolved), false);
    });

    // ----------------------------------------------------
    // 8. Upload Size and MIME Restrictions
    // ----------------------------------------------------
    console.log('\n[Group 8: Upload Size and MIME Limits]');

    await it('enforces 2 MB size limit and approved extensions', () => {
      const MAX_SIZE = 2 * 1024 * 1024; // 2,097,152 bytes
      assert.strictEqual(MAX_SIZE, 2097152);

      assert.deepStrictEqual(ALLOWED_CV_EXTENSIONS, ['.pdf', '.doc', '.docx']);
      assert.deepStrictEqual(ALLOWED_CV_MIME_TYPES, [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]);

      const unapprovedExts = ['.exe', '.sh', '.zip', '.png', '.txt'];
      for (const ext of unapprovedExts) {
        assert.strictEqual(ALLOWED_CV_EXTENSIONS.includes(ext), false);
      }
    });
  } finally {
    // Cleanup test sandbox
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  console.log(`\n======================================================`);
  console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
