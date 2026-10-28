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
      {admin && <div className="flex min-h-full select-none flex-col bg-white text-[#24133F]">
        <div className="relative flex flex-col justify-between bg-gradient-to-b from-[#9333EA] via-[#A855F7] via-[#C084FC]/80 via-[#F3E8FF] to-white px-6 pb-10 pt-5">
          <div className="z-20 flex items-center justify-between gap-3">
            <h2 className="max-w-[340px] truncate text-2xl font-black tracking-tight text-white drop-shadow-sm">{admin.name}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => onEdit(admin)} title="Edit administrator" aria-label="Edit administrator" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/20 text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => onDelete(admin)} title="Delete administrator" aria-label="Delete administrator" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/20 text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/30 hover:text-rose-200 active:scale-95"><Trash2 className="h-4 w-4" /></button>
              <button type="button" onClick={onClose} title="Close profile" aria-label="Close profile" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/20 text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="relative z-20 mt-3 mb-2 flex flex-col items-center justify-center">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} className="hidden" aria-label="Choose administrator profile picture" />
            <div className="relative">
              {admin.avatar_url ? <img src={admin.avatar_url} alt={admin.name} className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-[0_12px_28px_rgba(147,51,234,0.3)]" /> : <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-[#DFE8F8] text-3xl font-black text-[#294B85] shadow-[0_12px_28px_rgba(147,51,234,0.3)]">{initials}</div>}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} aria-label="Change profile picture" title="Change profile picture" className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border border-purple-200 bg-white text-[#7C27BD] shadow-md hover:bg-purple-50 disabled:opacity-50">{isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</button>
            </div>
          </div>
        </div>

        <div className="relative z-20 flex-1 space-y-4 bg-white p-5 pt-1 pb-8">
          {photoError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{photoError}</p>}
          <p className="text-sm font-bold text-[#756883]">Administrator account</p>

          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold shadow-[0_4px_0_#D0C9D5]"><Mail className="h-4 w-4 shrink-0 text-[#A59AAB]" /><span className="truncate">{admin.email}</span></div>
            <button type="button" onClick={() => onEdit(admin)} title="Reset password" className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#7026B7] px-4 py-3 text-xs font-bold text-white shadow-[0_4px_0_#451475] transition-colors hover:bg-[#621FA3]"><KeyRound className="h-4 w-4" />Password</button>
          </div>

          <section aria-label="Administrator overview" className="pt-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#A59AAB]">Overview</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs"><p className="text-[10px] font-bold uppercase text-slate-500">Role</p><p className="mt-0.5 flex items-center gap-1 font-bold text-slate-900"><Shield className="h-3.5 w-3.5 text-[#7026B7]" />{admin.role === 'super_admin' ? 'Super Admin' : 'Scanner Admin'}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs"><p className="text-[10px] font-bold uppercase text-slate-500">Registered</p><p className="mt-0.5 flex items-center gap-1 font-bold text-slate-900"><CalendarDays className="h-3.5 w-3.5 text-[#7026B7]" />{new Date(admin.created_at).toLocaleDateString()}</p></div>
            </div>
          </section>

          <section aria-label="Account access" className="pt-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#A59AAB]">Account access</p>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs">
              <p className="font-bold text-[#24133F]">{admin.role === 'super_admin' ? 'Full system management' : 'RFID scanning and attendance'}</p>
              <p className="mt-1 text-[#756883]">Use the edit button above to update this administrator’s details or role.</p>
            </div>
          </section>
        </div>
      </div>}
    </Drawer>
    <ImageCropModal isOpen={isCropOpen} onClose={() => { setIsCropOpen(false); setRawImage(null); }} imageSrc={rawImage} onConfirmCrop={handleConfirmCrop} isSaving={isUploading} />
  </>;
};

export default AdminProfileDrawer;
