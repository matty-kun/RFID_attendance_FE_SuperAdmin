import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, Loader2, Radio } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import type { StudentRecord } from '../models';
import { formatYearLevel } from '../../../utils/formatters';

export interface DeleteStudentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentRecord | null;
  onConfirmDelete: (studentId: string) => Promise<boolean>;
}

export const DeleteStudentConfirmationModal: React.FC<DeleteStudentConfirmationModalProps> = ({
  isOpen,
  onClose,
  student,
  onConfirmDelete,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  if (!student) return null;

  const isMatch = confirmInput.trim().toUpperCase() === student.student_id.trim().toUpperCase();

  const handleDelete = async () => {
    if (!isMatch || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await onConfirmDelete(student.id);
      if (success) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting ? () => {} : onClose}
      title="Delete Student Account"
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {/* Student Summary Card */}
        <div className="rounded-2xl border border-slate-200 bg-[#FAF8FC] p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#24133F] truncate">{student.name}</p>
            <p className="text-xs text-[#756883] mt-0.5">
              {student.course || 'Unassigned course'} · {formatYearLevel(student.year_level)}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-bold text-[#24133F] bg-white border border-[#E5E0EB] px-2.5 py-1 rounded-xl shadow-2xs">
              {student.student_id}
            </span>
            {student.rfid_uid && (
              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-mono text-[#7026B7]">
                <Radio className="h-3 w-3" />
                <span>{student.rfid_uid}</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Consequences Box */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2 text-xs text-rose-900">
          <div className="flex items-center gap-2 font-bold text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Permanent deletion consequences:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-rose-800 leading-relaxed text-[11px]">
            <li>
              Student profile and Supabase login account (<code className="font-mono">{student.email || student.student_id}</code>) will be permanently erased.
            </li>
            {student.rfid_uid && (
              <li>
                Assigned RFID card <strong className="font-mono">{student.rfid_uid}</strong> will be unassigned and returned to available inventory.
              </li>
            )}
            <li>
              <strong>Audit log safety:</strong> If this student has recorded attendance scans, deletion is automatically blocked by the database. Use <em>Archive</em> instead to preserve historical records.
            </li>
          </ul>
        </div>

        {/* Intentional Confirmation Input */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-semibold text-[#24133F]">
            To confirm, type student ID <span className="font-mono font-bold text-rose-600 select-all">{student.student_id}</span> below:
          </label>
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Type ${student.student_id} to confirm`}
            autoFocus
            disabled={isDeleting}
            className={isMatch ? 'border-emerald-500 focus:border-emerald-600' : ''}
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#F1EEF4] flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            disabled={!isMatch || isDeleting}
            leftIcon={
              isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )
            }
          >
            {isDeleting ? 'Deleting student...' : 'Delete Student'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteStudentConfirmationModal;
