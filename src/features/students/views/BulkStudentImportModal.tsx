import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Eye,
  EyeOff,
  FileUp,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { toast } from '../../../context';
import type { BulkImportStudentRow, BulkImportResult } from '../models';
import { formatYearLevel } from '../../../utils/formatters';
import {
  validateBulkStudentGrid,
  type BulkCsvValidationError,
  type BulkCsvDuplicateWarning,
} from '../utils/bulkCsvValidation';

export interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    students: BulkImportStudentRow[],
    autoPair: boolean,
    onProgress?: (current: number, total: number) => void
  ) => Promise<BulkImportResult>;
  existingStudents?: Array<{ student_id?: string | null; email?: string | null }>;
}

const SAMPLE_CSV = `student_id,name,email,course,year_level
2026-00101,John Christian Doe,john.doe@cite.edu,BS Information Technology,1
2026-00102,Alyssa Nicole Ramos,alyssa.ramos@cite.edu,BS Computer Science,1
2026-00103,Joshua Miguel Tan,joshua.tan@cite.edu,BS Information Technology,2
2026-00104,Bea Patricia Cruz,bea.cruz@cite.edu,BS Business Administration,1
2026-00105,Gabriel Vince Santos,gabriel.santos@cite.edu,BS Information Systems,2`;

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingStudents = [],
}) => {
  const [parsedRows, setParsedRows] = useState<BulkImportStudentRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<BulkCsvValidationError[]>([]);
  const [existingDuplicates, setExistingDuplicates] = useState<BulkCsvDuplicateWarning[]>([]);
  const [importSummary, setImportSummary] = useState<BulkImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [defaultTemporaryPassword, setDefaultTemporaryPassword] = useState('TempPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetModalState = () => {
    setParsedRows([]);
    setValidationErrors([]);
    setExistingDuplicates([]);
    setImportSummary(null);
    setFileName('');
    setDefaultTemporaryPassword('TempPass2026!');
    setShowPassword(false);
    setIsProcessing(false);
    setImportProgress(null);
    setIsDragging(false);
  };

  // Reset all state when modal opens fresh
  useEffect(() => {
    if (isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  const existingDuplicateIdSet = useMemo(
    () => new Set(existingDuplicates.map((d) => d.student_id.toLowerCase())),
    [existingDuplicates]
  );

  const applyValidationGrid = (rawGrid: unknown[][], uploadedFileName: string) => {
    setFileName(uploadedFileName);
    setImportSummary(null);

    const validation = validateBulkStudentGrid(rawGrid, existingStudents);
    if (!validation.isValid) {
      setParsedRows([]);
      setExistingDuplicates([]);
      setValidationErrors(validation.errors);
      toast.error(
        `Upload rejected: found ${validation.errors.length} issue${validation.errors.length === 1 ? '' : 's'} in ${uploadedFileName}. Fix the file and re-upload.`
      );
      return;
    }

    setValidationErrors([]);
    setParsedRows(validation.rows);
    setExistingDuplicates(validation.existingDuplicates);

    if (validation.existingDuplicates.length > 0) {
      toast.info(
        `Parsed ${validation.rows.length} students (${validation.existingDuplicates.length} duplicate ID${validation.existingDuplicates.length === 1 ? '' : 's'} flagged).`
      );
    } else {
      toast.success(`Successfully parsed ${validation.rows.length} students from ${uploadedFileName}!`);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: 'array', raw: true, codepage: 65001 });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setFileName(file.name);
          setParsedRows([]);
          setExistingDuplicates([]);
          setValidationErrors([
            { rowNumber: 1, field: 'header', message: 'The selected file has no readable sheets.' },
          ]);
          toast.error('The selected file has no readable sheets.');
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawGrid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
        applyValidationGrid(rawGrid, file.name);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setFileName(file.name);
        setParsedRows([]);
        setExistingDuplicates([]);
        setValidationErrors([
          {
            rowNumber: 1,
            field: 'header',
            message: 'Failed to parse file. Please upload a valid .xlsx, .xls, or .csv roster.',
          },
        ]);
        toast.error('Failed to parse file. Please upload a valid .xlsx, .xls, or .csv roster.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleLoadSample = () => {
    const workbook = XLSX.read(SAMPLE_CSV, { type: 'string', raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawGrid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
    applyValidationGrid(rawGrid, 'student_roster_sample.csv');
  };

  const handleDownloadTemplate = () => {
    const wsData = [
      {
        'ID No.': '2026-0001',
        Students: 'Dela Cruz, Juan Protacio',
        Course: 'BSIT',
        'Year Level': 1,
        Email: 'juan.delacruz@university.edu',
        'Card UID': '',
      },
      {
        'ID No.': '2026-0002',
        Students: 'Santos, Maria Clara',
        Course: 'BSCS',
        'Year Level': 2,
        Email: 'maria.santos@university.edu',
        'Card UID': '',
      },
      {
        'ID No.': '2026-0003',
        Students: 'Reyes, Jose Protacio',
        Course: 'BSCPE',
        'Year Level': 3,
        Email: 'jose.reyes@university.edu',
        'Card UID': '',
      },
      {
        'ID No.': '2026-0004',
        Students: 'Silang, Gabriela Cariño',
        Course: 'BSIS',
        'Year Level': 4,
        Email: 'gabriela.silang@university.edu',
        'Card UID': '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, 'student_roster_template.xlsx');
    toast.success('Downloaded roster template (.xlsx).');
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0 || validationErrors.length > 0) return;
    const tempPass = (defaultTemporaryPassword || 'TempPass2026!').trim();
    if (tempPass.length < 12) {
      toast.error('Default temporary password must be at least 12 characters.');
      return;
    }

    setIsProcessing(true);
    setImportProgress({ current: 0, total: parsedRows.length });

    try {
      const rowsWithPasswords = parsedRows.map((row) => ({
        ...row,
        temporary_password:
          row.temporary_password && row.temporary_password.length >= 12
            ? row.temporary_password
            : tempPass,
      }));

      const summary = await onImport(rowsWithPasswords, false, (current, total) => {
        setImportProgress({ current, total });
      });

      setImportSummary(summary);
    } catch {
      // Errors handled in onImport
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  const hasLoadedFile = parsedRows.length > 0 || validationErrors.length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title="Bulk import students"
      description="Upload your student roster file (Excel or CSV). Review student details below before importing."
      maxWidth="4xl"
    >
      <div className="space-y-4 pt-1">
        {/* Post-Import Upload Summary Screen */}
        {importSummary ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      importSummary.failed.length === 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {importSummary.failed.length === 0 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#24133F]">Upload Summary</p>
                    <p className="text-xs text-[#756883]">{fileName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    {importSummary.createdCount} Added
                  </span>
                  {importSummary.failed.length > 0 && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                      {importSummary.failed.length} Flagged
                    </span>
                  )}
                </div>
              </div>

              {importSummary.failed.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    The following entries were flagged and skipped during registration:
                  </p>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-amber-200 bg-white divide-y divide-amber-100">
                    {importSummary.failed.map((item, idx) => (
                      <div
                        key={`${item.student_id}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-[#24133F]">
                            {item.student_id}
                          </span>
                          <span className="text-[#5D526A] truncate">{item.name}</span>
                        </div>
                        <span className="font-semibold text-rose-600">{item.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-medium">
                  All {importSummary.createdCount} student{importSummary.createdCount === 1 ? '' : 's'} were registered with no duplicate or validation issues.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-[#F1EEF4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetModalState}
                className="rounded-xl border border-[#E5E0EB] px-4 py-2.5 text-xs font-bold text-[#756883] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Import another file
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#621FA3] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Upload Dropzone / Loaded State */}
            {!hasLoadedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? 'border-[#7026B7] bg-[#F4EFFB]'
                    : 'border-[#D5CEDD] bg-[#FAF8FC] hover:border-[#7026B7]'
                }`}
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-[#7026B7] mb-2.5">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-[#24133F]">
                  Upload student Excel or CSV roster
                </p>
                <p className="text-xs text-[#756883] mt-1">
                  Accepts <span className="font-semibold text-[#24133F]">.xlsx, .xls, .csv, .txt</span> · Requires Student ID, Name, Course, and Year Level columns
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <label className="cursor-pointer rounded-xl bg-white border border-[#E5E0EB] px-4 py-2 text-xs font-semibold text-[#24133F] hover:bg-slate-50 transition-colors shadow-2xs active:scale-95">
                    Browse Excel or CSV
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="rounded-xl bg-white border border-[#E5E0EB] px-4 py-2 text-xs font-semibold text-[#7026B7] hover:bg-purple-50/50 transition-colors shadow-2xs active:scale-95"
                  >
                    Load sample roster
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="rounded-xl bg-white border border-[#E5E0EB] px-4 py-2 text-xs font-semibold text-[#756883] hover:text-[#24133F] transition-colors shadow-2xs active:scale-95"
                  >
                    Download template
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      validationErrors.length > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-purple-100 text-[#7026B7]'
                    }`}
                  >
                    {validationErrors.length > 0 ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <FileSpreadsheet className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#24133F] truncate">{fileName}</p>
                    {validationErrors.length > 0 && (
                      <p className="text-[11px] font-semibold text-rose-600">
                        File rejected — {validationErrors.length} validation issue{validationErrors.length === 1 ? '' : 's'} found
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#E5E0EB] px-3 py-1.5 text-xs font-semibold text-[#24133F] hover:bg-slate-50 transition-colors shadow-2xs active:scale-95">
                    <FileUp className="h-3.5 w-3.5 text-[#7026B7]" />
                    Replace file
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="rounded-xl bg-white border border-[#E5E0EB] px-3 py-1.5 text-xs font-semibold text-[#756883] hover:text-[#24133F] transition-colors shadow-2xs active:scale-95"
                  >
                    Download template
                  </button>
                </div>
              </div>
            )}

            {/* Strict Whole-File Rejection Panel */}
            {validationErrors.length > 0 && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    File Rejected — Fix all {validationErrors.length} error{validationErrors.length === 1 ? '' : 's'} and re-upload (partial uploads are not allowed)
                  </span>
                </div>
                <ul className="max-h-52 overflow-y-auto space-y-1 pl-6 list-disc text-xs text-rose-700">
                  {validationErrors.map((err, idx) => (
                    <li key={`${err.rowNumber}-${err.field}-${idx}`}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicate IDs Warning Banner (Existing DB Records) */}
            {existingDuplicates.length > 0 && validationErrors.length === 0 && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {existingDuplicates.length} duplicate Student ID{existingDuplicates.length === 1 ? '' : 's'} already registered
                  </span>
                </div>
                <p className="text-xs text-amber-700 pl-6">
                  Highlighted rows below are already in the system and will be flagged in the upload summary while all new valid students are added.
                </p>
              </div>
            )}

            {/* Default Temporary Password Configuration */}
            {parsedRows.length > 0 && validationErrors.length === 0 && (
              <div className="rounded-xl border border-[#E5E0EB] bg-white p-3.5 space-y-1.5">
                <Input
                  label="Default Temporary Password (min 12 chars)"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="e.g. TempPass2026!"
                  value={defaultTemporaryPassword}
                  onChange={(e) => setDefaultTemporaryPassword(e.target.value)}
                  minLength={12}
                  required
                  helperText="Assigned to students without a password in the file. Students must change this on first login."
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="p-1.5 text-[#756883] hover:text-[#24133F] transition-colors focus:outline-none cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && validationErrors.length === 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#24133F]">Students Preview</span>
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-[#7026B7] border border-purple-200">
                      {parsedRows.length} students
                    </span>
                    {existingDuplicates.length > 0 && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                        {existingDuplicates.length} duplicate{existingDuplicates.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-xl border border-[#E5E0EB] bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-[#E5E0EB] bg-[#FAF8FC] text-[11px] font-bold uppercase tracking-wider text-[#756883]">
                      <tr>
                        <th className="w-10 px-3 py-2.5 text-center">#</th>
                        <th className="px-3.5 py-2.5 whitespace-nowrap">Student ID</th>
                        <th className="px-3.5 py-2.5 whitespace-nowrap">Full Name</th>
                        <th className="px-3.5 py-2.5 whitespace-nowrap">Email Address</th>
                        <th className="px-3.5 py-2.5 whitespace-nowrap">Course</th>
                        <th className="px-3.5 py-2.5 whitespace-nowrap text-center">Year</th>
                        <th className="px-3.5 py-2.5 whitespace-nowrap">RFID Card</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1EEF4]">
                      {parsedRows.map((row, idx) => {
                        const isDuplicate = existingDuplicateIdSet.has(row.student_id.toLowerCase());
                        return (
                          <tr
                            key={idx}
                            className={`transition-colors ${
                              isDuplicate ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-[#FAF8FC]/80'
                            }`}
                          >
                            <td className="w-10 px-3 py-2 text-center font-mono text-[11px] text-[#9B89B0]">
                              {idx + 1}
                            </td>
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-[#24133F]">{row.student_id}</span>
                                {isDuplicate && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                    Duplicate
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-2 whitespace-nowrap font-semibold text-[#24133F]">
                              {row.name}
                            </td>
                            <td className="px-3.5 py-2 whitespace-nowrap text-[#5D526A]">
                              {row.email}
                            </td>
                            <td className="px-3.5 py-2 whitespace-nowrap text-[#24133F]">
                              {row.course}
                            </td>
                            <td className="px-3.5 py-2 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-[#7026B7] border border-purple-100">
                                {formatYearLevel(row.year_level)}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              {row.rfid_uid ? (
                                <span className="font-mono font-bold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {row.rfid_uid}
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#9B89B0] italic">
                                  Unassigned
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Progress Bar */}
            {isProcessing && importProgress && (
              <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-semibold text-[#24133F]">
                  <span className="flex items-center gap-1.5 text-[#7026B7]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Registering students into system...
                  </span>
                  <span>
                    {importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-purple-200/60">
                  <div
                    className="h-full bg-[#7026B7] transition-all duration-150 ease-out"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-[#F1EEF4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-xl border border-[#E5E0EB] px-4 py-2.5 text-xs font-bold text-[#756883] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedRows.length === 0 || validationErrors.length > 0 || isProcessing}
                className="inline-flex items-center gap-2 rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#621FA3] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing ({importProgress ? `${importProgress.current}/${importProgress.total}` : 'Please wait...'})</span>
                  </>
                ) : (
                  <span>Import {parsedRows.length} Students</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default BulkStudentImportModal;
