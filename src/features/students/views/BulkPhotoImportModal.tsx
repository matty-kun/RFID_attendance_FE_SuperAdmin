import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  Check,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { toast } from '../../../context';
import { studentService } from '../services/studentService';
import {
  parsePhotoFiles,
  parseZipArchive,
  type ParsedStudentPhoto,
  type MinimalStudentForMatching,
} from '../utils/bulkPhotoValidation';

export interface BulkPhotoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingStudents?: MinimalStudentForMatching[];
}

type FilterTab = 'all' | 'ready' | 'overwrite' | 'unmatched';

export const BulkPhotoImportModal: React.FC<BulkPhotoImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingStudents = [],
}) => {
  const [photos, setPhotos] = useState<ParsedStudentPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [allowOverwrite, setAllowOverwrite] = useState(true);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{ success: number; failed: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    // Revoke blob preview URLs to avoid memory leaks
    photos.forEach((p) => {
      try {
        URL.revokeObjectURL(p.previewUrl);
      } catch {
        // ignore
      }
    });
    setPhotos([]);
    setActiveTab('all');
    setAllowOverwrite(true);
    setIsProcessingFiles(false);
    setIsUploading(false);
    setUploadProgress(null);
    setIsDragging(false);
    setUploadSummary(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const handleProcessFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    setIsProcessingFiles(true);
    setUploadSummary(null);

    try {
      const isZip = fileArray.length === 1 && fileArray[0].name.toLowerCase().endsWith('.zip');

      if (isZip) {
        const result = await parseZipArchive(fileArray[0], existingStudents);
        setPhotos(result.photos);
        if (result.photos.length === 0) {
          toast.error('No supported photos found inside the ZIP file (.jpg, .png, .webp).');
        } else {
          toast.success(`Found ${result.photos.length} photo(s) in ZIP archive.`);
        }
      } else {
        const imageFiles = fileArray
          .filter((f) => /\.(jpe?g|png|webp)$/i.test(f.name))
          .map((f) => ({ name: f.name, blob: f }));

        if (!imageFiles.length) {
          toast.error('No supported image files selected (.jpg, .png, .webp).');
          setIsProcessingFiles(false);
          return;
        }

        const result = await parsePhotoFiles(imageFiles, existingStudents);
        setPhotos(result.photos);
        toast.success(`Loaded ${result.photos.length} photo(s).`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process files. Please try again.');
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const matchedPhotos = useMemo(
    () => photos.filter((p) => p.status === 'matched'),
    [photos]
  );
  const overwritePhotos = useMemo(
    () => photos.filter((p) => p.status === 'overwrite'),
    [photos]
  );
  const unmatchedPhotos = useMemo(
    () => photos.filter((p) => p.status === 'unmatched'),
    [photos]
  );

  const importablePhotos = useMemo(() => {
    return photos.filter((p) => {
      if (p.status === 'matched') return true;
      if (p.status === 'overwrite' && allowOverwrite) return true;
      return false;
    });
  }, [photos, allowOverwrite]);

  const filteredPhotos = useMemo(() => {
    switch (activeTab) {
      case 'ready':
        return matchedPhotos;
      case 'overwrite':
        return overwritePhotos;
      case 'unmatched':
        return unmatchedPhotos;
      case 'all':
      default:
        return photos;
    }
  }, [activeTab, photos, matchedPhotos, overwritePhotos, unmatchedPhotos]);

  const handleStartUpload = async () => {
    if (!importablePhotos.length) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: importablePhotos.length });

    let successCount = 0;
    let failCount = 0;

    // Process in batches of 3
    const BATCH_SIZE = 3;
    for (let i = 0; i < importablePhotos.length; i += BATCH_SIZE) {
      const batch = importablePhotos.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (photo) => {
          if (!photo.matchedStudent?.id) {
            failCount++;
            return;
          }
          try {
            await studentService.uploadAvatar(photo.matchedStudent.id, photo.base64Data);
            successCount++;
          } catch (uploadErr) {
            failCount++;
          } finally {
            setUploadProgress((prev) => ({
              current: Math.min(importablePhotos.length, (prev?.current ?? 0) + 1),
              total: importablePhotos.length,
            }));
          }
        })
      );
    }

    setIsUploading(false);
    setUploadSummary({ success: successCount, failed: failCount });

    if (successCount > 0) {
      toast.success(`Successfully updated ${successCount} student photo(s)!`);
      onSuccess();
    } else {
      toast.error('Failed to upload student photos. Check network connection.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isUploading) onClose();
      }}
      title="Bulk Import Student Photos"
      description="Upload student profile photos in bulk by student ID matching."
      maxWidth="3xl"
    >
      <div className="space-y-5 text-[#24133F]">
        {/* Upload summary banner when upload finishes */}
        {uploadSummary && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>
                Upload completed: <strong>{uploadSummary.success}</strong> photo(s) updated
                {uploadSummary.failed > 0 && `, ${uploadSummary.failed} failed`}.
              </span>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        )}

        {/* Upload Zone */}
        {photos.length === 0 && !uploadSummary && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                void handleProcessFiles(e.dataTransfer.files);
              }
            }}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? 'border-[#7026B7] bg-purple-50/60'
                : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EBF9] text-[#7026B7] shadow-xs mb-3">
              <UploadCloud className="h-7 w-7" />
            </div>

            <h3 className="text-sm font-bold text-[#24133F]">
              Drop your photo files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[#7026B7] underline hover:text-[#5B1E96] font-extrabold cursor-pointer"
              >
                browse
              </button>
            </h3>

            <p className="mt-1 text-xs text-[#756883] max-w-md">
              Upload a <strong>.zip</strong> archive of images or select multiple photos at once.
              Files must be named with the <strong>Student ID</strong> (e.g. <code>2026-00101.jpg</code>).
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#A59AAB]">
              <span className="rounded-lg bg-white border border-[#E5E0EB] px-2.5 py-1 font-semibold text-[#756883]">
                .ZIP Archive
              </span>
              <span className="rounded-lg bg-white border border-[#E5E0EB] px-2.5 py-1 font-semibold text-[#756883]">
                .JPG / .JPEG
              </span>
              <span className="rounded-lg bg-white border border-[#E5E0EB] px-2.5 py-1 font-semibold text-[#756883]">
                .PNG
              </span>
              <span className="rounded-lg bg-white border border-[#E5E0EB] px-2.5 py-1 font-semibold text-[#756883]">
                .WEBP
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  void handleProcessFiles(e.target.files);
                }
              }}
            />
          </div>
        )}

        {/* Processing Spinner */}
        {isProcessingFiles && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#7026B7] mb-2" />
            <p className="text-xs font-semibold text-[#756883]">Extracting and matching student photos…</p>
          </div>
        )}

        {/* Preview & Match List */}
        {photos.length > 0 && !uploadSummary && (
          <div className="space-y-4">
            {/* Top Bar with counts & file change button */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7026B7]">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#24133F]">
                    {photos.length} Photo{photos.length === 1 ? '' : 's'} Processed
                  </h4>
                  <p className="text-[11px] text-[#756883]">
                    {importablePhotos.length} ready to import · {unmatchedPhotos.length} skipped
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetState();
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                >
                  Choose Different Files
                </Button>
              </div>
            </div>

            {/* Filter Tabs & Overwrite Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0EBF5] pb-2 text-xs">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-[#7026B7] text-white shadow-2xs'
                      : 'text-[#756883] hover:bg-purple-50'
                  }`}
                >
                  All ({photos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ready')}
                  className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
                    activeTab === 'ready'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  New ({matchedPhotos.length})
                </button>
                {overwritePhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('overwrite')}
                    className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
                      activeTab === 'overwrite'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    Overwrite ({overwritePhotos.length})
                  </button>
                )}
                {unmatchedPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('unmatched')}
                    className={`rounded-xl px-3 py-1.5 font-bold transition-all cursor-pointer ${
                      activeTab === 'unmatched'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    Unmatched ({unmatchedPhotos.length})
                  </button>
                )}
              </div>

              {overwritePhotos.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#756883] select-none">
                  <input
                    type="checkbox"
                    checked={allowOverwrite}
                    onChange={(e) => setAllowOverwrite(e.target.checked)}
                    disabled={isUploading}
                    className="h-4 w-4 rounded text-[#7026B7] focus:ring-purple-400"
                  />
                  <span>Allow replacing existing photos ({overwritePhotos.length})</span>
                </label>
              )}
            </div>

            {/* Photos Scrollable Grid */}
            <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
              {filteredPhotos.map((photo) => {
                const isMatched = photo.status === 'matched';
                const isOverwrite = photo.status === 'overwrite';
                const isUnmatched = photo.status === 'unmatched';

                return (
                  <div
                    key={photo.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-2.5 transition-all ${
                      isMatched
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : isOverwrite
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-rose-200 bg-rose-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Photo Thumbnail */}
                      <img
                        src={photo.previewUrl}
                        alt={photo.fileName}
                        className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs bg-white"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-[#24133F]">
                            {photo.candidateStudentId}
                          </span>
                          <span className="text-[11px] text-[#A59AAB] truncate">
                            ({photo.fileName})
                          </span>
                        </div>

                        {photo.matchedStudent ? (
                          <p className="text-xs font-semibold text-[#5B1E96] truncate">
                            {photo.matchedStudent.name}
                            <span className="text-[11px] font-normal text-[#756883] ml-1.5">
                              · {photo.matchedStudent.course}
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-rose-600">
                            {photo.errorReason || 'Student ID not found in database'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isMatched && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800">
                          <Check className="h-3 w-3" /> Ready
                        </span>
                      )}
                      {isOverwrite && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                          <AlertTriangle className="h-3 w-3" /> Overwrite
                        </span>
                      )}
                      {isUnmatched && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-800">
                          <AlertCircle className="h-3 w-3" /> Skipped
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredPhotos.length === 0 && (
                <div className="py-8 text-center text-xs text-[#A59AAB]">
                  No photos in this category.
                </div>
              )}
            </div>

            {/* Live Upload Progress */}
            {isUploading && uploadProgress && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#7026B7]">
                  <span>Uploading photos to student records…</span>
                  <span>
                    {uploadProgress.current} / {uploadProgress.total}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-purple-100">
                  <div
                    className="h-full bg-[#7026B7] transition-all duration-200"
                    style={{
                      width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#F0EBF5]">
              <span className="text-xs text-[#756883]">
                {importablePhotos.length} photo{importablePhotos.length === 1 ? '' : 's'} will be uploaded.
              </span>

              <div className="flex gap-2">
                <Button variant="secondary" size="md" onClick={onClose} disabled={isUploading}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleStartUpload()}
                  disabled={isUploading || importablePhotos.length === 0}
                  isLoading={isUploading}
                >
                  Upload {importablePhotos.length} Photo{importablePhotos.length === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
