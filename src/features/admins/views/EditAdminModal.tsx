import React, { useState, useEffect, useRef } from 'react';
import { Camera, Eye, EyeOff, KeyRound, Loader2, Save, Shield, User } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Dropdown } from '../../../components/common/Dropdown';
import { ImageCropModal } from '../../../components/common/ImageCropModal';
import type { AdminRecord, UpdateAdminPayload } from '../models';

export interface EditAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminRecord | null;
  onSave: (adminId: string, payload: UpdateAdminPayload) => Promise<boolean>;
  onUploadAvatar: (adminId: string, image: string) => Promise<string>;
}

export const EditAdminModal: React.FC<EditAdminModalProps> = ({
  isOpen,
  onClose,
  admin,
  onSave,
  onUploadAvatar,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin'>('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (admin && isOpen) {
      setName(admin.name);
      setRole(admin.role);
      setPassword('');
      setShowPassword(false);
      setError(null);
      setIsSubmitting(false);
      setRawImage(null);
      setIsCropOpen(false);
    }
  }, [admin, isOpen]);

  if (!admin) return null;

  const initials = admin.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Administrator name cannot be empty.');
      return;
    }
    if (password && password.length < 12) {
      setError('If updating password, it must be at least 12 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const payload: UpdateAdminPayload = {};
      if (name.trim() !== admin.name) payload.name = name.trim();
      if (role !== admin.role) payload.role = role;
      if (password.trim()) payload.password = password.trim();

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const success = await onSave(admin.id, payload);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Choose an image smaller than 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const source = reader.result;
      if (typeof source !== 'string') return;
      const image = new Image();
      image.onload = () => { setError(null); setRawImage(source); setIsCropOpen(true); };
      image.onerror = () => setError('The selected file is not a valid image.');
      image.src = source;
    };
    reader.onerror = () => setError('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = async (image: string) => {
    setIsUploadingPhoto(true);
    try {
      await onUploadAvatar(admin.id, image);
      setIsCropOpen(false);
      setRawImage(null);
    } catch {
      setError('Could not upload the profile picture. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return <>
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting || isUploadingPhoto || isCropOpen ? () => {} : onClose}
      title="Edit Administrator"
      description="Update account profile details, system permissions, or reset login password."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 text-[#24133F]">
        {/* Error Alert */}
        {error && (
          <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700 animate-in fade-in">
            {error}
          </div>
        )}

        {/* Identity Header Card */}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" aria-label="Choose administrator profile picture" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto || isSubmitting} title="Upload profile picture" className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#DFE8F8] text-xs font-black text-[#294B85] disabled:opacity-50">
            {admin.avatar_url ? <img src={admin.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
            <span className="absolute inset-0 flex items-center justify-center bg-[#24133F]/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{isUploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#24133F] truncate">{admin.name}</p>
            <p className="text-[11px] text-[#756883] truncate">{admin.email}</p>
          </div>
          <span className="shrink-0 rounded-md bg-[#F4EFFB] px-2 py-0.5 text-[10px] font-bold text-[#7026B7] border border-[#E9D5FF]">
            {admin.role === 'super_admin' ? 'Super Admin' : 'Scanner Admin'}
          </span>
        </div>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPhoto || isSubmitting} className="text-xs font-semibold text-[#7026B7] hover:underline disabled:opacity-50">{admin.avatar_url ? 'Change profile picture' : 'Upload profile picture'}</button>

        {/* Full Name */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#24133F] flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span>Full Name</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jason Mendoza"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Email (Read-Only) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#24133F]">Login Email</label>
            <span className="text-[10px] text-[#756883] italic">Primary identity (cannot be changed)</span>
          </div>
          <Input
            value={admin.email}
            disabled
            className="bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200"
          />
        </div>

        {/* Role Selection */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-[#24133F] flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <span>Assigned Role</span>
          </label>
          <Dropdown
            value={role}
            onChange={(val) => setRole(val as 'admin' | 'super_admin')}
            className="w-full"
            options={[
              { value: 'admin', label: 'Scanner Admin (Event RFID Check-in only)' },
              { value: 'super_admin', label: 'Super Admin (Full system control & staff management)' },
            ]}
          />
        </div>

        {/* Reset Password */}
        <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#24133F] flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset Password</span>
            </label>
            <span className="text-[10px] text-[#756883]">Optional</span>
          </div>
          <p className="text-[11px] text-[#756883] leading-relaxed">
            Leave blank to retain current password. If providing a new password, it must be at least 12 characters.
          </p>
          <div className="pt-1">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new 12+ char password"
              disabled={isSubmitting}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            leftIcon={
              isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )
            }
          >
            {isSubmitting ? 'Saving changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
    <ImageCropModal isOpen={isCropOpen} onClose={() => { setIsCropOpen(false); setRawImage(null); }} imageSrc={rawImage} onConfirmCrop={handleConfirmCrop} isSaving={isUploadingPhoto} />
  </>;
};

export default EditAdminModal;
