import React, { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, CalendarDays, Camera, ChevronDown, KeyRound, Loader2, Mail, Pencil, Shield, Trash2, X } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { ImageCropModal } from '../../../components/common/ImageCropModal';
import type { AdminRecord, UpdateAdminPayload } from '../models';

interface AdminProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminRecord | null;
  onUpdate: (adminId: string, payload: UpdateAdminPayload) => Promise<boolean>;
  onArchive: (adminId: string) => Promise<boolean>;
  onRestore: (adminId: string) => Promise<boolean>;
  isSelf: boolean;
  onDelete: (admin: AdminRecord) => void;
  onUploadAvatar: (adminId: string, image: string) => Promise<string>;
  onRemoveAvatar: (adminId: string) => Promise<void>;
}

export const AdminProfileDrawer: React.FC<AdminProfileDrawerProps> = ({
  isOpen, onClose, admin, onUpdate, onArchive, onRestore, isSelf, onDelete, onUploadAvatar, onRemoveAvatar,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRawImage(null);
      setIsCropOpen(false);
      setPhotoError(null);
      setIsEditingName(false);
      setIsRoleOpen(false);
      setIsPasswordOpen(false);
      setPasswordDraft('');
      setInlineError(null);
      setIsArchiveConfirmOpen(false);
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

  const handleRemovePhoto = async () => {
    if (!admin || isUploading) return;
    setIsUploading(true);
    try { await onRemoveAvatar(admin.id); setPhotoError(null); }
    catch { /* The viewmodel shows the error toast. */ }
    finally { setIsUploading(false); }
  };

  const initials = admin?.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') ?? '';

  const saveName = async () => {
    if (!admin || !isEditingName || isSaving) return;
    const nextName = nameDraft.trim();
    if (!nextName || nextName.length > 150) { setInlineError('Name must contain 1 to 150 characters.'); return; }
    if (nextName === admin.name) { setIsEditingName(false); return; }
    setIsSaving(true);
    setInlineError(null);
    const saved = await onUpdate(admin.id, { name: nextName });
    setIsSaving(false);
    if (saved) setIsEditingName(false);
    else setInlineError('Could not update name.');
  };

  const saveRole = async (role: AdminRecord['role']) => {
    if (!admin || isSaving || role === admin.role) { setIsRoleOpen(false); return; }
    setIsSaving(true);
    setInlineError(null);
    const saved = await onUpdate(admin.id, { role });
    setIsSaving(false);
    if (saved) setIsRoleOpen(false);
    else setInlineError('Could not update role.');
  };

  const savePassword = async () => {
    if (!admin || isSaving) return;
    if (passwordDraft.length < 12 || passwordDraft.length > 128) { setInlineError('Password must contain 12 to 128 characters.'); return; }
    setIsSaving(true);
    setInlineError(null);
    const saved = await onUpdate(admin.id, { password: passwordDraft });
    setIsSaving(false);
    if (saved) { setPasswordDraft(''); setIsPasswordOpen(false); }
    else setInlineError('Could not reset password.');
  };

  return <>
    <Drawer
      isOpen={isOpen}
      onClose={() => { if (!isCropOpen && !isUploading && !isArchiveConfirmOpen) onClose(); }}
      title={admin ? `${admin.name} profile` : 'Admin profile'}
      maxWidth="2xl"
      hideHeader
      noPadding
    >
      {admin && <div className="flex min-h-full select-none flex-col bg-white text-[#24133F]">
        <div className="relative flex flex-col justify-between bg-gradient-to-b from-[#9333EA] via-[#A855F7] via-[#C084FC]/80 via-[#F3E8FF] to-white px-6 pb-10 pt-5">
          <div className="z-20 flex items-center justify-between gap-3">
            {isEditingName ? <input autoFocus aria-label="Administrator name" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} onBlur={() => void saveName()} onKeyDown={(event) => { if (event.key === 'Enter') void saveName(); if (event.key === 'Escape') setIsEditingName(false); }} disabled={isSaving} className="min-w-0 max-w-[340px] flex-1 border-b-2 border-white bg-transparent text-2xl font-black tracking-tight text-white outline-none" /> : <button type="button" onClick={() => { if (!admin.archived_at) { setNameDraft(admin.name); setIsEditingName(true); } }} title="Click to edit name" disabled={Boolean(admin.archived_at)} className="group flex min-w-0 items-center gap-2 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-white/20 disabled:cursor-default"><h2 className="max-w-[340px] truncate text-2xl font-black tracking-tight text-white drop-shadow-sm">{admin.name}</h2>{!admin.archived_at && <Pencil className="h-4 w-4 shrink-0 text-white/70 opacity-0 transition-opacity group-hover:opacity-100" />}</button>}
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => admin.archived_at ? void onRestore(admin.id) : setIsArchiveConfirmOpen(true)} disabled={isSelf || isSaving} title={admin.archived_at ? 'Restore administrator' : 'Archive administrator'} aria-label={admin.archived_at ? 'Restore administrator' : 'Archive administrator'} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/20 text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/30 active:scale-95 disabled:opacity-50">{admin.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
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
            {admin.avatar_url && <button type="button" onClick={() => void handleRemovePhoto()} disabled={isUploading} className="mt-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-50 disabled:opacity-50">Remove photo</button>}
          </div>
        </div>

        <div className="relative z-20 flex-1 space-y-4 bg-white p-5 pt-1 pb-8">
          {photoError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{photoError}</p>}
          {inlineError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{inlineError}</p>}
          <p className="text-sm font-bold text-[#756883]">Administrator account</p>

          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold shadow-[0_4px_0_#D0C9D5]"><Mail className="h-4 w-4 shrink-0 text-[#A59AAB]" /><span className="truncate">{admin.email}</span></div>
            <button type="button" onClick={() => setIsPasswordOpen((open) => !open)} disabled={Boolean(admin.archived_at)} title="Reset password" className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#7026B7] px-4 py-3 text-xs font-bold text-white shadow-[0_4px_0_#451475] transition-colors hover:bg-[#621FA3] disabled:opacity-50"><KeyRound className="h-4 w-4" />Password</button>
          </div>
          {isPasswordOpen && <form onSubmit={(event) => { event.preventDefault(); void savePassword(); }} className="flex items-center gap-2 rounded-2xl border border-slate-200 p-3"><input type="password" autoComplete="new-password" aria-label="New temporary password" placeholder="New password (12+ characters)" value={passwordDraft} onChange={(event) => setPasswordDraft(event.target.value)} className="min-w-0 flex-1 text-xs outline-none" /><button type="submit" disabled={isSaving} className="rounded-xl bg-[#7026B7] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Save</button></form>}

          <section aria-label="Administrator overview" className="pt-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#A59AAB]">Overview</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs"><p className="text-[10px] font-bold uppercase text-slate-500">Role</p><button type="button" onClick={() => setIsRoleOpen((open) => !open)} disabled={Boolean(admin.archived_at) || isSelf} className="mt-0.5 flex w-full items-center gap-1 text-left font-bold text-slate-900 disabled:cursor-default"><Shield className="h-3.5 w-3.5 text-[#7026B7]" />{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}{!admin.archived_at && !isSelf && <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />}</button>{isRoleOpen && <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{(['admin', 'super_admin'] as const).map((role) => <button key={role} type="button" onClick={() => void saveRole(role)} className="block w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-purple-50">{role === 'super_admin' ? 'Super Admin' : 'Admin'}</button>)}</div>}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs"><p className="text-[10px] font-bold uppercase text-slate-500">Registered</p><p className="mt-0.5 flex items-center gap-1 font-bold text-slate-900"><CalendarDays className="h-3.5 w-3.5 text-[#7026B7]" />{new Date(admin.created_at).toLocaleDateString()}</p></div>
            </div>
          </section>

          <section aria-label="Account access" className="pt-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#A59AAB]">Account access</p>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-xs">
              <p className="font-bold text-[#24133F]">{admin.role === 'super_admin' ? 'Full system management' : 'RFID scanning and attendance'}</p>
              <p className="mt-1 text-[#756883]">Click the name or role above to update this account.</p>
            </div>
          </section>
        </div>
      </div>}
    </Drawer>
    {isArchiveConfirmOpen && admin && <div className="fixed inset-0 z-[600] flex items-center justify-center bg-[#24133F]/50 p-4 backdrop-blur-sm" role="presentation"><div role="dialog" aria-modal="true" aria-label="Archive administrator" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"><h3 className="text-lg font-bold text-[#24133F]">Archive {admin.name}?</h3><p className="mt-2 text-sm text-[#756883]">This removes the account from active admins and blocks sign in. You can restore it later.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setIsArchiveConfirmOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Cancel</button><button type="button" disabled={isSaving} onClick={async () => { setIsSaving(true); const archived = await onArchive(admin.id); setIsSaving(false); if (archived) { setIsArchiveConfirmOpen(false); onClose(); } }} className="rounded-xl bg-[#7026B7] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Archive</button></div></div></div>}
    <ImageCropModal isOpen={isCropOpen} onClose={() => { setIsCropOpen(false); setRawImage(null); }} imageSrc={rawImage} onConfirmCrop={handleConfirmCrop} isSaving={isUploading} />
  </>;
};

export default AdminProfileDrawer;
