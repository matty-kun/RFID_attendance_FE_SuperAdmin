import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

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
  icon?: React.ReactNode;
  illustration?: string;
  confirmIcon?: React.ReactNode;
  variant?: 'danger' | 'brand' | 'warning';
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
  icon,
  illustration,
  confirmIcon,
  variant = 'danger',
}) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      setIsMounted(true);
      const rAF = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(rAF);
    } else {
      setIsVisible(false);
      timer = setTimeout(() => {
        setIsMounted(false);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  return createPortal(
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-[#170D29]/40 p-4 backdrop-blur-md transition-opacity duration-180 ease-out',
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        className={cn(
          'w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl border border-[#E5E0EB] transition-all duration-180 cubic-bezier(0.16,1,0.3,1)',
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        )}
      >
        <div className="flex items-start justify-between">
          {illustration ? (
            <img
              src={illustration}
              alt="Mascot illustration"
              className="h-24 w-auto object-contain drop-shadow-sm select-none -mt-1"
            />
          ) : icon ? (
            icon
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#EF4444] border border-[#FEE2E2]">
              <Trash2 className="h-6 w-6" />
            </div>
          )}
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
          <h3 id="confirmation-modal-title" className="text-lg font-bold text-[#24133F]">
            {title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-[#756883]">
            {description ? (
              description
            ) : itemName ? (
              <>
                Are you sure you want to delete <span className="font-bold text-[#24133F]">{itemName}</span>? This action cannot be undone.
              </>
            ) : (
              'Are you sure you want to proceed? This action cannot be undone.'
            )}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isDeleting}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'brand' ? 'primary' : variant === 'warning' ? 'secondary' : 'danger'}
            size="md"
            onClick={onConfirm}
            disabled={isDeleting}
            isLoading={isDeleting}
            leftIcon={confirmIcon}
            className={cn(
              variant === 'brand' && 'bg-[#7128A0] hover:bg-[#5E1E85] shadow-[0_5px_0_0_#461367] active:shadow-[0_1px_0_0_#461367]'
            )}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
