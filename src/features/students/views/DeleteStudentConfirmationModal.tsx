import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  Loader2,
  Radio,
  UserX,
  CreditCard,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
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

  const initials = student.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

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
      title="Delete student account"
      description="Permanent removal of student record, auth account, and RFID pairing."
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {/* Student Summary Card */}
        <div className="rounded-2xl border border-[#E5E0EB] bg-[#FAF8FC] p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {student.avatar_url ? (
              <img
                src={student.avatar_url}
                alt={student.name}
                className="h-10 w-10 shrink-0 rounded-2xl object-cover border border-purple-200 shadow-2xs"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-[#7026B7] font-black text-xs border border-purple-200/80 shadow-2xs">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#24133F] truncate">{student.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="text-xs text-[#756883] font-medium truncate max-w-[190px]">
                  {student.course || 'Unassigned'}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-purple-50 text-[#7026B7] border border-purple-200">
                  {formatYearLevel(student.year_level)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="font-mono text-xs font-black text-[#24133F] bg-white border border-[#E5E0EB] px-2.5 py-1 rounded-xl shadow-2xs block">
              {student.student_id}
            </span>
            {student.rfid_uid ? (
              <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#7026B7] bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                <Radio className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[85px]">{student.rfid_uid}</span>
              </div>
            ) : (
              <span className="text-[10px] text-[#9B89B0] italic mt-1 block">No card linked</span>
            )}
          </div>
        </div>

        {/* Consequences Card */}
        <div className="rounded-2xl border border-rose-200/90 bg-[#FFF5F5] p-3.5 space-y-2.5 text-xs text-rose-950">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-[#EF3340] shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <p className="text-xs font-extrabold text-[#B91C2A] uppercase tracking-wider">
              Permanent Deletion Notice
            </p>
          </div>

          <div className="space-y-2 pt-0.5">
            <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#7A1C25]">
              <UserX className="h-4 w-4 shrink-0 text-[#EF3340] mt-0.5" />
              <span>
                Student profile and Supabase login account (<code className="font-mono font-bold text-[#24133F]">{student.email || student.student_id}</code>) will be permanently erased.
              </span>
            </div>

            {student.rfid_uid && (
              <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#7A1C25]">
                <CreditCard className="h-4 w-4 shrink-0 text-[#EF3340] mt-0.5" />
                <span>
                  Linked RFID card <strong className="font-mono text-[#24133F]">{student.rfid_uid}</strong> will be immediately unassigned and returned to inventory pool.
                </span>
              </div>
            )}

            <div className="flex items-start gap-2.5 text-[11px] leading-relaxed text-[#7A1C25]">
              <ShieldAlert className="h-4 w-4 shrink-0 text-[#EF3340] mt-0.5" />
              <span>
                <strong>Audit trail protection:</strong> If this student has existing attendance logs, deletion is blocked by database integrity. Use <em>Archive</em> instead to preserve logs.
              </span>
            </div>
          </div>
        </div>

        {/* Intentional Confirmation Input */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-[#24133F]">
              To confirm, type student ID <strong className="font-mono font-extrabold text-[#EF3340] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 select-all">{student.student_id}</strong> below:
            </label>
            {isMatch && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Matched
              </span>
            )}
          </div>
          <Input
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={`Type ${student.student_id} to confirm`}
            autoFocus
            disabled={isDeleting}
            className={`font-mono text-sm transition-all ${
              isMatch
                ? 'border-emerald-500 bg-emerald-50/20 text-slate-900 focus:border-emerald-600'
                : 'border-slate-200'
            }`}
            rightElement={
              isMatch ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : undefined
            }
          />
        </div>

        {/* Action Buttons with 3D tactile feedback */}
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
