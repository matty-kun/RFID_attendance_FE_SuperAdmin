import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import {
  extractStudentIdFromFilename,
  findStudentMatch,
  getMimeTypeFromFilename,
  parsePhotoFiles,
  parseZipArchive,
  type MinimalStudentForMatching,
} from './bulkPhotoValidation';

describe('bulkPhotoValidation utility', () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL for jsdom environment
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
  });

  describe('extractStudentIdFromFilename', () => {
    it('strips extension and extracts student number', () => {
      expect(extractStudentIdFromFilename('2021-00123.jpg')).toBe('2021-00123');
      expect(extractStudentIdFromFilename('2022-00456.PNG')).toBe('2022-00456');
      expect(extractStudentIdFromFilename('2023-00789.webp')).toBe('2023-00789');
      expect(extractStudentIdFromFilename('2024-00999.jpeg')).toBe('2024-00999');
    });

    it('handles filenames inside folders with both forward and backslashes', () => {
      expect(extractStudentIdFromFilename('photos/students/2026-00101.jpg')).toBe('2026-00101');
      expect(extractStudentIdFromFilename('C:\\Users\\Photos\\2026-00102.png')).toBe('2026-00102');
      expect(extractStudentIdFromFilename('deeply/nested/folder/tree/2026-00103.webp')).toBe('2026-00103');
    });

    it('trims extra whitespace around filename', () => {
      expect(extractStudentIdFromFilename('  2026-00103.jpg  ')).toBe('2026-00103');
      expect(extractStudentIdFromFilename(' \t 2026-00104.png \n ')).toBe('2026-00104');
    });

    it('preserves dots inside student ID numbers', () => {
      expect(extractStudentIdFromFilename('2026.001.099.jpg')).toBe('2026.001.099');
      expect(extractStudentIdFromFilename('STU.2026-100.png')).toBe('STU.2026-100');
    });

    it('handles alphanumeric, underscore, and hyphenated IDs', () => {
      expect(extractStudentIdFromFilename('CS_2026_001.jpg')).toBe('CS_2026_001');
      expect(extractStudentIdFromFilename('BSIT-2026-999.webp')).toBe('BSIT-2026-999');
    });

    it('handles filenames with missing base name (dotfiles)', () => {
      expect(extractStudentIdFromFilename('.jpg')).toBe('');
      expect(extractStudentIdFromFilename('.png')).toBe('');
    });
  });

  describe('getMimeTypeFromFilename', () => {
    it('returns correct mime type for supported extensions regardless of casing', () => {
      expect(getMimeTypeFromFilename('photo.png')).toBe('image/png');
      expect(getMimeTypeFromFilename('photo.PNG')).toBe('image/png');
      expect(getMimeTypeFromFilename('photo.webp')).toBe('image/webp');
      expect(getMimeTypeFromFilename('photo.WEBP')).toBe('image/webp');
      expect(getMimeTypeFromFilename('photo.jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromFilename('photo.JPG')).toBe('image/jpeg');
      expect(getMimeTypeFromFilename('photo.jpeg')).toBe('image/jpeg');
      expect(getMimeTypeFromFilename('photo.JpEg')).toBe('image/jpeg');
    });
  });

  describe('findStudentMatch', () => {
    const student1: MinimalStudentForMatching = {
      id: 's1',
      student_id: '2026-00001',
      name: 'Alice',
      avatar_url: null,
      rfid_uid: 'E280110001',
    };
    const student2: MinimalStudentForMatching = {
      id: 's2',
      student_id: '2026-00002',
      name: 'Bob',
      avatar_url: 'https://example.com/bob.jpg',
      rfid_uid: 'E280110002',
    };
    const studentWithAlphanumeric: MinimalStudentForMatching = {
      id: 's3',
      student_id: 'BSIT-2026-99',
      name: 'Charlie',
      avatar_url: null,
      rfid_uid: '04A2B3C4D5',
    };

    const studentIdMap = new Map<string, MinimalStudentForMatching>([
      ['2026-00001', student1],
      ['2026-00002', student2],
      ['bsit-2026-99', studentWithAlphanumeric],
    ]);

    const rfidMap = new Map<string, MinimalStudentForMatching>([
      ['e280110001', student1],
      ['e280110002', student2],
      ['04a2b3c4d5', studentWithAlphanumeric],
    ]);

    it('matches directly by exact student ID', () => {
      expect(findStudentMatch('2026-00001', studentIdMap, rfidMap)).toBe(student1);
    });

    it('matches student ID case-insensitively', () => {
      expect(findStudentMatch('bsit-2026-99', studentIdMap, rfidMap)).toBe(studentWithAlphanumeric);
      expect(findStudentMatch('BSIT-2026-99', studentIdMap, rfidMap)).toBe(studentWithAlphanumeric);
    });

    it('matches by RFID UID when candidate ID matches a registered card', () => {
      expect(findStudentMatch('E280110001', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('e280110001', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('04A2B3C4D5', studentIdMap, rfidMap)).toBe(studentWithAlphanumeric);
    });

    it('handles OS copy suffixes like " (1)", " (2)", "_copy"', () => {
      expect(findStudentMatch('2026-00001 (1)', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('2026-00001 (2)', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('2026-00001_copy', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('2026-00002-copy', studentIdMap, rfidMap)).toBe(student2);
    });

    it('handles common "ID-" or "ID_" or "student-" prefixes in filenames', () => {
      expect(findStudentMatch('ID-2026-00001', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('ID_2026-00001', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('id#2026-00001', studentIdMap, rfidMap)).toBe(student1);
      expect(findStudentMatch('student-2026-00002', studentIdMap, rfidMap)).toBe(student2);
    });

    it('returns undefined for non-existent IDs', () => {
      expect(findStudentMatch('9999-99999', studentIdMap, rfidMap)).toBeUndefined();
      expect(findStudentMatch('', studentIdMap, rfidMap)).toBeUndefined();
    });

    it('prioritizes student_id match over rfid_uid when values collide', () => {
      const studentA: MinimalStudentForMatching = {
        id: 'sA',
        student_id: '12345678',
        name: 'Student A',
      };
      const studentB: MinimalStudentForMatching = {
        id: 'sB',
        student_id: '99999999',
        rfid_uid: '12345678',
        name: 'Student B',
      };
      const testStudentMap = new Map([['12345678', studentA]]);
      const testRfidMap = new Map([['12345678', studentB]]);

      expect(findStudentMatch('12345678', testStudentMap, testRfidMap)).toBe(studentA);
    });
  });

  describe('parsePhotoFiles', () => {
    const mockStudents: MinimalStudentForMatching[] = [
      {
        id: 'std-1',
        student_id: '2026-00101',
        name: 'Juan Dela Cruz',
        course: 'BS Information Technology',
        avatar_url: null,
      },
      {
        id: 'std-2',
        student_id: '2026-00102',
        name: 'Maria Clara',
        course: 'BS Computer Science',
        avatar_url: 'https://example.com/maria.jpg',
        rfid_uid: 'E280116060',
      },
      {
        id: 'std-3',
        student_id: '2026-00103',
        name: 'Crisostomo Ibarra',
        course: 'BS Information Systems',
        avatar_url: null,
        rfid_uid: '04A2B3C4D5',
      },
      {
        id: 'std-4',
        student_id: '   ', // whitespace only student ID in DB
        name: 'Ghost Student',
        avatar_url: null,
      },
      {
        id: 'std-5',
        student_id: null, // null student ID in DB
        name: 'No ID Student',
        avatar_url: null,
      },
    ];

    it('identifies matched, overwrite, and unmatched photos correctly', async () => {
      const dummyBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
      const files = [
        { name: '2026-00101.jpg', blob: dummyBlob },
        { name: '2026-00102.png', blob: dummyBlob },
        { name: '04A2B3C4D5.jpg', blob: dummyBlob }, // Matches by RFID UID
        { name: '2099-99999.webp', blob: dummyBlob },
        { name: 'notes.txt', blob: new Blob(['text'], { type: 'text/plain' }) }, // should be ignored
      ];

      const result = await parsePhotoFiles(files, mockStudents);

      expect(result.totalImages).toBe(4);
      expect(result.matchedCount).toBe(2);
      expect(result.overwriteCount).toBe(1);
      expect(result.unmatchedCount).toBe(1);

      // Matches by RFID UID
      const photoRfid = result.photos.find((p) => p.candidateStudentId === '04A2B3C4D5');
      expect(photoRfid?.status).toBe('matched');
      expect(photoRfid?.matchedStudent?.name).toBe('Crisostomo Ibarra');

      // 1. Matched new photo
      const photo1 = result.photos.find((p) => p.candidateStudentId === '2026-00101');
      expect(photo1?.status).toBe('matched');
      expect(photo1?.matchedStudent?.name).toBe('Juan Dela Cruz');

      // 2. Overwrite existing avatar
      const photo2 = result.photos.find((p) => p.candidateStudentId === '2026-00102');
      expect(photo2?.status).toBe('overwrite');
      expect(photo2?.matchedStudent?.name).toBe('Maria Clara');

      // 3. Unmatched student ID
      const photo3 = result.photos.find((p) => p.candidateStudentId === '2099-99999');
      expect(photo3?.status).toBe('unmatched');
      expect(photo3?.errorReason).toContain('No student found with ID "2099-99999"');
    });

    it('handles edge case: dotfile or empty candidate student ID without matching null/empty students', async () => {
      const dummyBlob = new Blob(['image bytes'], { type: 'image/png' });
      const files = [{ name: '.png', blob: dummyBlob }];

      const result = await parsePhotoFiles(files, mockStudents);
      expect(result.totalImages).toBe(1);
      expect(result.matchedCount).toBe(0);
      expect(result.unmatchedCount).toBe(1);
      expect(result.photos[0].status).toBe('unmatched');
      expect(result.photos[0].errorReason).toBe('Filename does not contain a valid student ID');
    });

    it('handles edge case: photos with OS copy suffixes and prefixes in batch', async () => {
      const dummyBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
      const files = [
        { name: '2026-00101 (1).jpg', blob: dummyBlob },
        { name: 'ID-2026-00102.png', blob: dummyBlob },
      ];

      const result = await parsePhotoFiles(files, mockStudents);
      expect(result.totalImages).toBe(2);
      expect(result.matchedCount).toBe(1); // 2026-00101 (new avatar)
      expect(result.overwriteCount).toBe(1); // 2026-00102 (overwrite existing avatar)
    });

    it('handles edge case: duplicate photos for same student in same batch', async () => {
      const dummyBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
      const files = [
        { name: '2026-00101.jpg', blob: dummyBlob },
        { name: '2026-00101.png', blob: dummyBlob },
      ];

      const result = await parsePhotoFiles(files, mockStudents);
      expect(result.totalImages).toBe(2);
      expect(result.photos[0].matchedStudent?.student_id).toBe('2026-00101');
      expect(result.photos[1].matchedStudent?.student_id).toBe('2026-00101');
    });

    it('handles edge case: empty student list in database', async () => {
      const dummyBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
      const files = [{ name: '2026-00101.jpg', blob: dummyBlob }];

      const result = await parsePhotoFiles(files, []);
      expect(result.totalImages).toBe(1);
      expect(result.matchedCount).toBe(0);
      expect(result.unmatchedCount).toBe(1);
      expect(result.photos[0].status).toBe('unmatched');
      expect(result.photos[0].errorReason).toContain('No student found with ID "2026-00101"');
    });

    it('handles edge case: only non-image files provided', async () => {
      const files = [
        { name: 'students.xlsx', blob: new Blob(['data']) },
        { name: 'readme.txt', blob: new Blob(['text']) },
        { name: 'student_id.pdf', blob: new Blob(['pdf']) },
      ];

      const result = await parsePhotoFiles(files, mockStudents);
      expect(result.totalImages).toBe(0);
      expect(result.photos.length).toBe(0);
    });
  });

  describe('parseZipArchive', () => {
    it('unpacks images from a zip file and matches them', async () => {
      const zip = new JSZip();
      zip.file('2026-00101.jpg', 'fake-image-bytes-1');
      zip.file('photos/2026-00102.png', 'fake-image-bytes-2');
      zip.file('__MACOSX/._2026-00101.jpg', 'mac-junk'); // should be ignored
      zip.file('photos/.DS_Store', 'ds-store-junk'); // should be ignored
      zip.file('readme.txt', 'do not upload this'); // should be ignored

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new File([zipBlob], 'students.zip', { type: 'application/zip' });

      const mockStudents: MinimalStudentForMatching[] = [
        {
          id: 'std-1',
          student_id: '2026-00101',
          name: 'Juan Dela Cruz',
          course: 'BS Information Technology',
          avatar_url: null,
        },
        {
          id: 'std-2',
          student_id: '2026-00102',
          name: 'Maria Clara',
          course: 'BS Computer Science',
          avatar_url: 'https://example.com/maria.jpg',
        },
      ];

      const result = await parseZipArchive(zipFile, mockStudents);
      expect(result.totalImages).toBe(2);
      expect(result.matchedCount).toBe(1);
      expect(result.overwriteCount).toBe(1);
    });

    it('handles edge case: zip with nested folders and Windows backslashes in paths', async () => {
      const zip = new JSZip();
      zip.file('Dept_IT/2026-00101.WEBP', 'fake-image-bytes');
      zip.file('EmptyFolder/', ''); // Directory entry

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new File([zipBlob], 'nested.zip', { type: 'application/zip' });

      const mockStudents: MinimalStudentForMatching[] = [
        {
          id: 'std-1',
          student_id: '2026-00101',
          name: 'Juan Dela Cruz',
        },
      ];

      const result = await parseZipArchive(zipFile, mockStudents);
      expect(result.totalImages).toBe(1);
      expect(result.matchedCount).toBe(1);
      expect(result.photos[0].candidateStudentId).toBe('2026-00101');
      expect(result.photos[0].mimeType).toBe('image/webp');
    });

    it('handles edge case: empty zip archive', async () => {
      const zip = new JSZip();
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipFile = new File([zipBlob], 'empty.zip', { type: 'application/zip' });

      const result = await parseZipArchive(zipFile, []);
      expect(result.totalImages).toBe(0);
      expect(result.matchedCount).toBe(0);
      expect(result.overwriteCount).toBe(0);
      expect(result.unmatchedCount).toBe(0);
    });
  });
});
