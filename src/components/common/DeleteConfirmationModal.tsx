import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: React.ReactNode;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Confirmation',
  description,
  itemName,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDeleting = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#170D29]/40 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl border border-[#E5E0EB] animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#EF4444] border border-[#FEE2E2]">
            <Trash2 className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-xl text-[#756883] hover:text-[#24133F] hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 id="delete-modal-title" className="text-lg font-bold text-[#24133F]">
            {title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#756883]">
            {description || (
              <>
                Are you sure you want to delete{' '}
                {itemName ? <strong className="text-[#24133F] font-semibold">{itemName}</strong> : 'this record'}?
                This action is permanent and cannot be undone.
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-[#F1EEF4]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-[#24133F] border border-[#E5E0EB] bg-white hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#EF4444] shadow-[0_4px_0_0_#B91C1C] hover:bg-[#DC2626] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
