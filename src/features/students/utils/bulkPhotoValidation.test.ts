import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import {
  extractStudentIdFromFilename,
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

    it('handles filenames inside folders', () => {
      expect(extractStudentIdFromFilename('photos/students/2026-00101.jpg')).toBe('2026-00101');
      expect(extractStudentIdFromFilename('C:\\Users\\Photos\\2026-00102.png')).toBe('2026-00102');
    });

    it('trims extra whitespace around filename', () => {
      expect(extractStudentIdFromFilename('  2026-00103.jpg  ')).toBe('2026-00103');
    });
  });

  describe('getMimeTypeFromFilename', () => {
    it('returns correct mime type for supported extensions', () => {
      expect(getMimeTypeFromFilename('photo.png')).toBe('image/png');
      expect(getMimeTypeFromFilename('photo.webp')).toBe('image/webp');
      expect(getMimeTypeFromFilename('photo.jpg')).toBe('image/jpeg');
      expect(getMimeTypeFromFilename('photo.jpeg')).toBe('image/jpeg');
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
    ];

    it('identifies matched, overwrite, and unmatched photos correctly', async () => {
      const dummyBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
      const files = [
        { name: '2026-00101.jpg', blob: dummyBlob },
        { name: '2026-00102.png', blob: dummyBlob },
        { name: '04A2B3C4D5.jpg', blob: dummyBlob }, // Matches by RFID UID!
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
  });

  describe('parseZipArchive', () => {
    it('unpacks images from a zip file and matches them', async () => {
      const zip = new JSZip();
      zip.file('2026-00101.jpg', 'fake-image-bytes-1');
      zip.file('photos/2026-00102.png', 'fake-image-bytes-2');
      zip.file('__MACOSX/._2026-00101.jpg', 'mac-junk'); // should be ignored
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
  });
});
