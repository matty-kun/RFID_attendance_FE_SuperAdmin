import React, { useState } from 'react';
import { UploadCloud, Download, Sparkles } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { toast } from '../../../context';
import type { BulkImportStudentRow, InventoryCard } from '../models';

export interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCards: InventoryCard[];
  onImport: (students: BulkImportStudentRow[], autoPair: boolean) => Promise<void>;
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
  availableCards,
  onImport,
}) => {
  const [parsedRows, setParsedRows] = useState<BulkImportStudentRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [autoPairWithInventory, setAutoPairWithInventory] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseCsvText = (text: string) => {
    try {
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (lines.length <= 1) {
        toast.error('CSV file is empty or has only headers.');
        return;
      }

      const rows: BulkImportStudentRow[] = [];
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts[0] && parts[1]) {
          rows.push({
            student_id: parts[0],
            name: parts[1],
            email: parts[2] || `${parts[0]}@university.edu`,
            course: parts[3] || 'BS Information Technology',
            year_level: Number(parts[4]) || 1,
            rfid_uid: parts[5] || undefined,
          });
        }
      }

      setParsedRows(rows);
      toast.success(`Successfully parsed ${rows.length} students from roster.`);
    } catch {
      toast.error('Failed to parse CSV format. Please check the columns.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('cite_festival_student_batch.csv');
    parseCsvText(SAMPLE_CSV);
  };

  const handleDownloadRoster = () => {
    if (parsedRows.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Card Number,Student ID,Full Name,Course,Year Level,Card UID,Student Signature\n';

    parsedRows.forEach((row, idx) => {
      const cardNum = autoPairWithInventory && availableCards[idx] ? availableCards[idx].cardNumber : 'N/A';
      const uid = row.rfid_uid || (autoPairWithInventory && availableCards[idx] ? availableCards[idx].uid : 'Unassigned');
      csvContent += `"${cardNum}","${row.student_id}","${row.name}","${row.course}","${row.year_level}","${uid}",""\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RFID_Distribution_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Physical distribution checklist roster downloaded!');
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    try {
      await onImport(parsedRows, autoPairWithInventory);
      toast.success(`Imported ${parsedRows.length} students successfully!`);
      onClose();
    } catch {
      toast.error('Failed to import students.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Students"
      description="Upload your student roster file (CSV / Excel). You can auto-assign available RFID cards in order."
      maxWidth="lg"
    >
      <div className="space-y-4 pt-1">
        {/* Dropzone */}
        <div className="rounded-2xl border-2 border-dashed border-[#E5E0EB] bg-[#FAF8FB] p-6 text-center hover:border-[#7026B7] transition-all">
          <UploadCloud className="h-9 w-9 text-[#7026B7] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#24133F]">
            {fileName ? fileName : 'Upload your Student CSV / Excel Roster'}
          </p>
          <p className="text-[11px] text-[#756883] mt-1">
            Columns: student_id, name, email, course, year_level
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <label className="cursor-pointer rounded-xl bg-white border border-[#E5E0EB] px-3.5 py-1.5 text-xs font-bold text-[#7026B7] hover:bg-slate-50 transition-colors shadow-2xs">
              Browse CSV File
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleLoadSample}
              className="rounded-xl bg-[#F4EFFB] px-3.5 py-1.5 text-xs font-bold text-[#7026B7] hover:bg-[#EAE0F7] transition-colors"
            >
              Load Sample Roster
            </button>
          </div>
        </div>

        {/* Auto-Pairing Option with Inventory Pool */}
        {parsedRows.length > 0 && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPairWithInventory}
                onChange={(e) => setAutoPairWithInventory(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[#7026B7]"
              />
              <div className="text-xs">
                <span className="font-bold text-[#24133F]">
                  Auto-Assign Available RFID Cards ({availableCards.length} in inventory)
                </span>
                <p className="text-[#756883] mt-0.5">
                  Binds physical cards sequentially: Row 1 ➔ Card #{availableCards[0]?.cardNumber || 1}, Row 2 ➔ Card #{availableCards[1]?.cardNumber || 2}, etc.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Parsed Preview Table */}
        {parsedRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#24133F]">
                Roster Preview ({parsedRows.length} students detected)
              </span>
              <button
                type="button"
                onClick={handleDownloadRoster}
                className="flex items-center gap-1.5 text-xs font-bold text-[#7026B7] hover:underline"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Card Distribution Roster</span>
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-[#E5E0EB] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#F1EEF4] bg-[#FAF8FB] text-[10px] uppercase font-bold text-[#756883]">
                  <tr>
                    <th className="px-3 py-2">Assigned Card #</th>
                    <th className="px-3 py-2">Student ID</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Program</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1EEF4]">
                  {parsedRows.map((row, idx) => {
                    const card = autoPairWithInventory ? availableCards[idx] : null;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-[#7026B7]">
                          {card ? `Card #${card.cardNumber} (${card.uid.slice(0, 10)}...)` : 'No Card'}
                        </td>
                        <td className="px-3 py-2 font-semibold text-[#24133F]">{row.student_id}</td>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2 text-[#756883]">{row.course}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-[#F1EEF4] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E5E0EB] px-4 py-2 text-xs font-bold text-[#756883] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className="flex items-center gap-1.5 rounded-xl bg-[#7026B7] px-5 py-2 text-xs font-bold text-white hover:bg-[#631FA4] shadow-[0_4px_0_0_#451475] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isProcessing ? 'Importing...' : `Import ${parsedRows.length} Students`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
