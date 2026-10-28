import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Download } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Input } from '../../../components/common/Input';
import { toast } from '../../../context';
import type { BulkImportStudentRow } from '../models';
import { formatYearLevel } from '../../../utils/formatters';

export interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: BulkImportStudentRow[], autoPair: boolean) => Promise<void>;
}

function parseYearLevel(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return Math.min(Math.max(1, Math.round(val)), 6);
  if (typeof val === 'string') {
    const match = val.match(/\d+/);
    if (match) return Math.min(Math.max(1, parseInt(match[0], 10)), 6);
  }
  return 1;
}

function normalizeRow(row: Record<string, any>): BulkImportStudentRow | null {
  const getField = (aliases: string[]) => {
    for (const key of Object.keys(row)) {
      const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
      for (const alias of aliases) {
        if (normalizedKey === alias.replace(/[\s_-]+/g, '').toLowerCase()) {
          const val = row[key];
          return val != null ? String(val).trim() : '';
        }
      }
    }
    return '';
  };

  const student_id = getField(['student_id', 'studentid', 'id', 'studentno', 'studentnumber']);
  const name = getField(['name', 'fullname', 'studentname', 'student']);
  if (!student_id || !name) return null;

  const email = getField(['email', 'emailaddress', 'studentemail']) || `${student_id.toLowerCase().replace(/[^a-z0-9]/g, '')}@university.edu`;
  const course = getField(['course', 'program', 'degree', 'department']) || 'BS Information Technology';
  const year_level = parseYearLevel(getField(['year_level', 'yearlevel', 'year', 'gradelevel']));
  const rfid_uid = getField(['rfid_uid', 'carduid', 'rfiduid', 'rfid', 'uid']) || undefined;
  const temporary_password = getField(['temporary_password', 'temporarypassword', 'temppassword', 'password']) || undefined;

  return {
    student_id,
    name,
    email,
    course,
    year_level,
    rfid_uid,
    temporary_password,
  };
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: 'array', raw: true });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          toast.error('The selected file has no readable sheets.');
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: true, defval: '' });

        if (rawJson.length === 0) {
          toast.error('File has no student rows. Please check file content.');
          return;
        }

        const rows: BulkImportStudentRow[] = [];
        for (const item of rawJson) {
          const norm = normalizeRow(item);
          if (norm) rows.push(norm);
        }

        if (rows.length === 0) {
          toast.error('Could not find student_id and name columns in file.');
          return;
        }

        setParsedRows(rows);
        toast.success(`Successfully parsed ${rows.length} students from ${file.name}.`);
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
    const rows = rawJson.map(normalizeRow).filter((r): r is BulkImportStudentRow => r !== null);
    setParsedRows(rows);
    toast.success(`Loaded sample roster with ${rows.length} students.`);
  };

  const handleDownloadRoster = () => {
    if (parsedRows.length === 0) return;

    const wsData = parsedRows.map((r) => ({
      'Student ID': r.student_id,
      'Full Name': r.name,
      'Email': r.email,
      'Course': r.course,
      'Year Level': r.year_level,
      'Card UID': r.rfid_uid || 'Unassigned',
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, `Student_Import_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Roster exported to Excel.');
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    const tempPass = (defaultTemporaryPassword || 'TempPass2026!').trim();
    if (tempPass.length < 12) {
      toast.error('Default temporary password must be at least 12 characters.');
      return;
    }

    setIsProcessing(true);
    try {
      const rowsWithPasswords = parsedRows.map((row) => ({
        ...row,
        temporary_password:
          row.temporary_password && row.temporary_password.length >= 12
            ? row.temporary_password
            : tempPass,
      }));
      await onImport(rowsWithPasswords, false);
      onClose();
    } catch {
      // Errors handled in onImport
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk import students"
      description="Upload your student roster file (Excel or CSV). Each row will be registered in the backend with a temporary password."
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Dropzone */}
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
            {fileName ? fileName : 'Upload student Excel or CSV roster'}
          </p>
          <p className="text-xs text-[#756883] mt-1">
            Accepts <span className="font-semibold text-[#24133F]">.xlsx, .xls, .csv</span> · Columns: <code className="font-mono text-[#24133F]">student_id, name, email, course, year_level</code>
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
          </div>
        </div>

        {/* Default Temporary Password for Backend Registration */}
        {parsedRows.length > 0 && (
          <div className="rounded-xl border border-[#E5E0EB] bg-white p-3.5 space-y-2">
            <Input
              label="Default Temporary Password (min 12 chars)"
              type="password"
              placeholder="e.g. TempPass2026!"
              value={defaultTemporaryPassword}
              onChange={(e) => setDefaultTemporaryPassword(e.target.value)}
              minLength={12}
              required
            />
            <p className="text-[11px] text-[#756883]">
              Students must change this temporary password after their first login.
            </p>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#756883]">
                Roster preview ({parsedRows.length} students detected)
              </span>
              <button
                type="button"
                onClick={handleDownloadRoster}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7026B7] hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export roster (.xlsx)</span>
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E5E0EB] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#F1EEF4] bg-[#FAF8FC] text-xs font-medium text-[#756883] sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Student ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Year</th>
                    <th className="px-3 py-2">RFID card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEF4]">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF8FC]">
                      <td className="px-3 py-2 font-mono text-[#24133F] font-bold">{row.student_id}</td>
                      <td className="px-3 py-2 font-medium text-[#24133F]">{row.name}</td>
                      <td className="px-3 py-2 text-[#756883]">{row.email}</td>
                      <td className="px-3 py-2 text-[#756883]">{row.course}</td>
                      <td className="px-3 py-2 text-[#756883]">{formatYearLevel(row.year_level)}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-[#7026B7]">
                        {row.rfid_uid ? row.rfid_uid : 'Unassigned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#F1EEF4] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E5E0EB] px-4 py-2.5 text-xs font-bold text-[#756883] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className="rounded-xl bg-[#7026B7] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#621FA3] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? 'Importing students...' : `Import ${parsedRows.length} Students`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkStudentImportModal;
