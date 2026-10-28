import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Eye, EyeOff, FileUp, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { toast } from '../../../context';
import type { BulkImportStudentRow } from '../models';
import { formatYearLevel } from '../../../utils/formatters';

export interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    students: BulkImportStudentRow[],
    autoPair: boolean,
    onProgress?: (current: number, total: number) => void
  ) => Promise<void>;
}

const COURSE_ALIAS_MAP: Record<string, string> = {
  BSIT: 'BS Information Technology',
  BSIS: 'BS Information Systems',
  BSCPE: 'BS Computer Engineering',
  BSCS: 'BS Computer Science',
  BSECE: 'BS Electronics Engineering',
  IT: 'BS Information Technology',
  IS: 'BS Information Systems',
  CS: 'BS Computer Science',
  CPE: 'BS Computer Engineering',
  ECE: 'BS Electronics Engineering',
};

function parseYearLevel(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return Math.min(Math.max(1, Math.round(val)), 6);
  if (typeof val === 'string') {
    const match = val.match(/\d+/);
    if (match) return Math.min(Math.max(1, parseInt(match[0], 10)), 6);
  }
  return 1;
}

function resolveCourseName(raw: string): string {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (COURSE_ALIAS_MAP[upper]) return COURSE_ALIAS_MAP[upper];
  return trimmed || 'BS Information Technology';
}

function normalizeKey(str: string): string {
  return str.trim().toLowerCase().replace(/[\s_.-]+/g, '');
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
}) => {
  const [parsedRows, setParsedRows] = useState<BulkImportStudentRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [defaultTemporaryPassword, setDefaultTemporaryPassword] = useState('TempPass2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: 'array', raw: true, codepage: 65001 });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          toast.error('The selected file has no readable sheets.');
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawGrid = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });

        if (rawGrid.length === 0) {
          toast.error('File has no student rows.');
          return;
        }

        // 1. Scan for header row within first 35 rows
        let headerIdx = -1;
        let idCol = -1;
        let nameCol = -1;
        let yearCol = -1;
        let courseCol = -1;
        let emailCol = -1;
        let rfidCol = -1;
        let pwdCol = -1;

        const ID_ALIASES = ['id', 'idno', 'studentid', 'studentno', 'studentnumber', 'schoolid'];
        const NAME_ALIASES = ['students', 'student', 'name', 'fullname', 'studentname'];
        const YEAR_ALIASES = ['yearlevel', 'year', 'gradelevel', 'lvl', 'yr'];
        const COURSE_ALIASES = ['course', 'program', 'degree', 'department'];
        const EMAIL_ALIASES = ['email', 'emailaddress', 'studentemail', 'mail'];
        const RFID_ALIASES = ['rfid', 'rfiduid', 'carduid', 'uid', 'card'];
        const PWD_ALIASES = ['temporarypassword', 'password', 'temppassword'];

        for (let i = 0; i < Math.min(rawGrid.length, 35); i++) {
          const row = rawGrid[i];
          if (!Array.isArray(row)) continue;
          const lower = row.map((cell) => normalizeKey(String(cell || '')));
          const foundId = lower.findIndex((c) => ID_ALIASES.includes(c));
          const foundName = lower.findIndex((c) => NAME_ALIASES.includes(c));

          if (foundId !== -1 && foundName !== -1) {
            headerIdx = i;
            idCol = foundId;
            nameCol = foundName;
            yearCol = lower.findIndex((c) => YEAR_ALIASES.includes(c));
            courseCol = lower.findIndex((c) => COURSE_ALIASES.includes(c));
            emailCol = lower.findIndex((c) => EMAIL_ALIASES.includes(c));
            rfidCol = lower.findIndex((c) => RFID_ALIASES.includes(c));
            pwdCol = lower.findIndex((c) => PWD_ALIASES.includes(c));
            break;
          }
        }

        const rows: BulkImportStudentRow[] = [];

        if (headerIdx !== -1) {
          // Multi-row header detected (e.g. Dean's NDMC export)
          for (let i = headerIdx + 1; i < rawGrid.length; i++) {
            const row = rawGrid[i];
            if (!Array.isArray(row)) continue;

            const rawId = String(row[idCol] || '').trim();
            const rawName = String(row[nameCol] || '').trim();

            if (!rawId || !rawName) continue;
            // Skip repeated header rows
            if (/^(id|id\s*no|no|students?)$/i.test(rawId)) continue;
            // Skip section title rows (e.g. "Bachelor of Science in ...")
            if (/bachelor of science|college|school year|list of students/i.test(rawName) || /bachelor of science/i.test(rawId)) {
              continue;
            }

            const rawYear = yearCol !== -1 ? row[yearCol] : '';
            const rawCourse = courseCol !== -1 ? String(row[courseCol] || '').trim() : '';
            const course = resolveCourseName(rawCourse);
            const year_level = parseYearLevel(rawYear);

            const cleanId = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
            const email = emailCol !== -1 && row[emailCol] ? String(row[emailCol]).trim() : `${cleanId}@ndmc.edu.ph`;
            const rfid_uid = rfidCol !== -1 && row[rfidCol] ? String(row[rfidCol]).trim() : undefined;
            const temporary_password = pwdCol !== -1 && row[pwdCol] ? String(row[pwdCol]).trim() : undefined;

            rows.push({
              student_id: rawId,
              name: rawName,
              email,
              course,
              year_level,
              rfid_uid,
              temporary_password,
            });
          }
        } else {
          // Standard single-header object fallback
          const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: true, defval: '' });
          for (const item of rawJson) {
            const getField = (aliases: string[]) => {
              for (const key of Object.keys(item)) {
                const normKey = normalizeKey(key);
                if (aliases.some((a) => normalizeKey(a) === normKey)) {
                  const val = item[key];
                  return val != null ? String(val).trim() : '';
                }
              }
              return '';
            };

            const student_id = getField(ID_ALIASES);
            const name = getField(NAME_ALIASES);
            if (!student_id || !name) continue;

            const cleanId = student_id.toLowerCase().replace(/[^a-z0-9]/g, '');
            const email = getField(EMAIL_ALIASES) || `${cleanId}@ndmc.edu.ph`;
            const course = resolveCourseName(getField(COURSE_ALIASES));
            const year_level = parseYearLevel(getField(YEAR_ALIASES));
            const rfid_uid = getField(RFID_ALIASES) || undefined;
            const temporary_password = getField(PWD_ALIASES) || undefined;

            rows.push({
              student_id,
              name,
              email,
              course,
              year_level,
              rfid_uid,
              temporary_password,
            });
          }
        }

        if (rows.length === 0) {
          toast.error('Could not find student ID and Name columns in file. Please check file format.');
          return;
        }

        setParsedRows(rows);
        toast.success(`Successfully parsed ${rows.length} students from ${file.name}!`);
      } catch (err: any) {
        console.error('File parsing error:', err);
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
    setFileName('student_roster_sample.csv');
    const workbook = XLSX.read(SAMPLE_CSV, { type: 'string', raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: true, defval: '' });
    const rows: BulkImportStudentRow[] = rawJson.map((r: any) => ({
      student_id: String(r.student_id || ''),
      name: String(r.name || ''),
      email: String(r.email || ''),
      course: String(r.course || 'BS Information Technology'),
      year_level: parseYearLevel(r.year_level),
    }));
    setParsedRows(rows);
    toast.success(`Loaded sample roster with ${rows.length} students.`);
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
    if (parsedRows.length === 0) return;
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

      await onImport(rowsWithPasswords, false, (current, total) => {
        setImportProgress({ current, total });
      });

      onClose();
    } catch {
      // Errors handled in onImport
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title="Bulk import students"
      description="Upload your student roster file (Excel or CSV). Review student details below before importing."
      maxWidth="4xl"
    >
      <div className="space-y-4 pt-1">
        {/* Upload Dropzone / Loaded State */}
        {parsedRows.length === 0 ? (
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
              Accepts <span className="font-semibold text-[#24133F]">.xlsx, .xls, .csv, .txt</span> · Auto-detects official NDMC rosters and standard spreadsheets
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7026B7]">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#24133F] truncate">{fileName}</p>
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

        {/* Default Temporary Password Configuration */}
        {parsedRows.length > 0 && (
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
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#24133F]">Students Preview</span>
                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-[#7026B7] border border-purple-200">
                  {parsedRows.length} students
                </span>
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
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF8FC]/80 transition-colors">
                      <td className="w-10 px-3 py-2 text-center font-mono text-[11px] text-[#9B89B0]">
                        {idx + 1}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#24133F]">{row.student_id}</span>
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
                  ))}
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
                Registering students into backend...
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
            disabled={parsedRows.length === 0 || isProcessing}
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
      </div>
    </Modal>
  );
};

export default BulkStudentImportModal;
