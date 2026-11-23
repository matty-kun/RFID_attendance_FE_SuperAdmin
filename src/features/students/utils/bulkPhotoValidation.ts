import JSZip from 'jszip';

export type PhotoMatchStatus = 'matched' | 'overwrite' | 'unmatched';

export interface MinimalStudentForMatching {
  id: string;
  student_id?: string | null;
  name?: string | null;
  course?: string | null;
  avatar_url?: string | null;
  rfid_uid?: string | null;
}

export interface ParsedStudentPhoto {
  id: string; // unique key for list rendering
  fileName: string;
  candidateStudentId: string;
  mimeType: string;
  previewUrl: string;
  base64Data: string;
  status: PhotoMatchStatus;
  matchedStudent?: MinimalStudentForMatching;
  errorReason?: string;
}

export interface BulkPhotoParseResult {
  photos: ParsedStudentPhoto[];
  matchedCount: number;
  overwriteCount: number;
  unmatchedCount: number;
  totalImages: number;
}

const SUPPORTED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

export function extractStudentIdFromFilename(rawName: string): string {
  // Strip any directory paths (from zip archives or folder drops)
  const baseName = rawName.split(/[/\\]/).pop() || rawName;
  // Strip file extension
  const withoutExt = baseName.replace(/\.[^/.]+$/, '');
  return withoutExt.trim();
}

export function getMimeTypeFromFilename(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to base64.'));
        }
      };
      reader.onerror = () => reject(new Error('Failed reading image file.'));
      reader.readAsDataURL(blob);
    });
  }

  // Node.js / test environment fallback
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = blob.type || 'image/jpeg';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Process a list of File objects or extracted Zip entries and match with student records.
 */
export async function parsePhotoFiles(
  files: Array<{ name: string; blob: Blob }>,
  existingStudents: MinimalStudentForMatching[]
): Promise<BulkPhotoParseResult> {
  // Build lookup maps by lowercase student_id and rfid_uid
  const studentIdMap = new Map<string, MinimalStudentForMatching>();
  const rfidMap = new Map<string, MinimalStudentForMatching>();
  for (const s of existingStudents) {
    if (s.student_id) {
      studentIdMap.set(s.student_id.trim().toLowerCase(), s);
    }
    if (s.rfid_uid) {
      rfidMap.set(s.rfid_uid.trim().toLowerCase(), s);
    }
  }

  const photos: ParsedStudentPhoto[] = [];

  for (let i = 0; i < files.length; i++) {
    const { name, blob } = files[i];
    if (!SUPPORTED_EXTENSIONS.test(name)) continue;

    const candidateId = extractStudentIdFromFilename(name);
    const candidateLower = candidateId.toLowerCase();
    const matched = candidateId
      ? studentIdMap.get(candidateLower) || rfidMap.get(candidateLower)
      : undefined;
    const base64Data = await blobToBase64(blob);
    const previewUrl = URL.createObjectURL(blob);
    const mimeType = blob.type || getMimeTypeFromFilename(name);

    let status: PhotoMatchStatus = 'unmatched';
    let errorReason: string | undefined = undefined;

    if (matched) {
      if (matched.avatar_url) {
        status = 'overwrite';
      } else {
        status = 'matched';
      }
    } else {
      status = 'unmatched';
      errorReason = `No student found with ID "${candidateId}"`;
    }

    photos.push({
      id: `${candidateId || 'img'}-${i}-${Date.now()}`,
      fileName: name.split(/[/\\]/).pop() || name,
      candidateStudentId: candidateId,
      mimeType,
      previewUrl,
      base64Data,
      status,
      matchedStudent: matched,
      errorReason,
    });
  }

  const matchedCount = photos.filter((p) => p.status === 'matched').length;
  const overwriteCount = photos.filter((p) => p.status === 'overwrite').length;
  const unmatchedCount = photos.filter((p) => p.status === 'unmatched').length;

  return {
    photos,
    matchedCount,
    overwriteCount,
    unmatchedCount,
    totalImages: photos.length,
  };
}

/**
 * Unpacks a .zip archive and parses student photos.
 */
export async function parseZipArchive(
  zipFile: File,
  existingStudents: MinimalStudentForMatching[]
): Promise<BulkPhotoParseResult> {
  const zip = await JSZip.loadAsync(zipFile);
  const files: Array<{ name: string; blob: Blob }> = [];

  const entries: Array<{ name: string; file: JSZip.JSZipObject }> = [];
  zip.forEach((relativePath, zipEntry) => {
    // Ignore folders and macOS metadata files
    if (
      !zipEntry.dir &&
      !relativePath.startsWith('__MACOSX') &&
      !relativePath.includes('/.') &&
      SUPPORTED_EXTENSIONS.test(relativePath)
    ) {
      entries.push({ name: relativePath, file: zipEntry });
    }
  });

  for (const entry of entries) {
    const mimeType = getMimeTypeFromFilename(entry.name);
    const blob = await entry.file.async('blob');
    const typedBlob = new Blob([blob], { type: mimeType });
    files.push({ name: entry.name, blob: typedBlob });
  }

  return parsePhotoFiles(files, existingStudents);
}
