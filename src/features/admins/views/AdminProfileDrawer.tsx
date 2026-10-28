import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Camera, KeyRound, Loader2, Mail, Pencil, Shield, Trash2, X } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { ImageCropModal } from '../../../components/common/ImageCropModal';
import type { AdminRecord } from '../models';

interface AdminProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminRecord | null;
  onEdit: (admin: AdminRecord) => void;
  onDelete: (admin: AdminRecord) => void;
  onUploadAvatar: (adminId: string, image: string) => Promise<string>;
}

export const AdminProfileDrawer: React.FC<AdminProfileDrawerProps> = ({
  isOpen, onClose, admin, onEdit, onDelete, onUploadAvatar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setRawImage(null);
      setIsCropOpen(false);
      setPhotoError(null);
    }
  }, [isOpen]);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Choose an image smaller than 10 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const image = new Image();
      image.onload = () => { setPhotoError(null); setRawImage(reader.result as string); setIsCropOpen(true); };
      image.onerror = () => setPhotoError('The selected file is not a valid image.');
      image.src = reader.result;
    };
    reader.onerror = () => setPhotoError('Could not read the selected image.');
    reader.readAsDataURL(file);
  };

  const handleConfirmCrop = async (image: string) => {
    if (!admin) return;
    setIsUploading(true);
    try {
      await onUploadAvatar(admin.id, image);
      setPhotoError(null);
      setIsCropOpen(false);
      setRawImage(null);
    } catch {
      setPhotoError('Could not upload the profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const initials = admin?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') ?? '';

  return <>
    <Drawer
      isOpen={isOpen}
      onClose={() => { if (!isCropOpen && !isUploading) onClose(); }}
      title={admin ? `${admin.name} profile` : 'Admin profile'}
      maxWidth="2xl"
      hideHeader
      noPadding
    >
      {admin && <div className="min-h-full bg-white text-[#24133F]">
        <div className="relative bg-gradient-to-b from-[#9333EA] via-[#C084FC] via-[#F3E8FF] to-white px-6 pb-9 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black text-white drop-shadow-sm">{admin.name}</h2>
              <p className="mt-1 text-xs font-semibold text-white/90">Administrator profile</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close profile" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/20 text-white hover:bg-white/30"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" aria-label="Choose administrator profile picture" />
            <div className="relative">
              {admin.avatar_url ? <img src={admin.avatar_url} alt={admin.name} className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-[0_12px_28px_rgba(147,51,234,0.3)]" /> : <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-[#DFE8F8] text-3xl font-black text-[#294B85] shadow-[0_12px_28px_rgba(147,51,234,0.3)]">{initials}</div>}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} aria-label="Change profile picture" title="Change profile picture" className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-purple-200 bg-white text-[#7C27BD] shadow-md hover:bg-purple-50 disabled:opacity-50">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</button>
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="mt-3 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#7C27BD] shadow-sm hover:bg-purple-50 disabled:opacity-50">{admin.avatar_url ? 'Change photo' : 'Upload photo'}</button>
          </div>
        </div>

        <div className="space-y-5 px-6 pb-8">
          {photoError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{photoError}</p>}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4EFFB] px-3 py-1.5 text-xs font-bold text-[#7026B7]"><Shield className="h-4 w-4" />{admin.role === 'super_admin' ? 'Super Admin' : 'Scanner Admin'}</span>

          <section aria-label="Account details" className="divide-y divide-[#F1EEF4] rounded-2xl border border-[#E5E0EB] bg-white px-4">
            <div className="flex items-center gap-3 py-4"><Mail className="h-4 w-4 shrink-0 text-[#756883]" /><div className="min-w-0"><p className="text-[11px] text-[#756883]">Login email</p><p className="truncate text-sm font-semibold">{admin.email}</p></div></div>
            <div className="flex items-center gap-3 py-4"><Shield className="h-4 w-4 shrink-0 text-[#756883]" /><div><p className="text-[11px] text-[#756883]">Access</p><p className="text-sm font-semibold">{admin.role === 'super_admin' ? 'Full system management' : 'RFID scanning and attendance'}</p></div></div>
            <div className="flex items-center gap-3 py-4"><CalendarDays className="h-4 w-4 shrink-0 text-[#756883]" /><div><p className="text-[11px] text-[#756883]">Registered</p><p className="text-sm font-semibold">{new Date(admin.created_at).toLocaleDateString()}</p></div></div>
          </section>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onEdit(admin)} className="inline-flex items-center gap-2 rounded-xl bg-[#7026B7] px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_0_#451475] hover:bg-[#621FA3]"><Pencil className="h-4 w-4" />Edit details and role</button>
            <button type="button" onClick={() => onEdit(admin)} className="inline-flex items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-4 py-2.5 text-xs font-bold text-[#24133F] hover:bg-[#FAF8FC]"><KeyRound className="h-4 w-4" />Reset password</button>
            <button type="button" onClick={() => onDelete(admin)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete account</button>
          </div>
        </div>
      </div>}
    </Drawer>
    <ImageCropModal isOpen={isCropOpen} onClose={() => { setIsCropOpen(false); setRawImage(null); }} imageSrc={rawImage} onConfirmCrop={handleConfirmCrop} isSaving={isUploading} />
  </>;
};

export default AdminProfileDrawer;
