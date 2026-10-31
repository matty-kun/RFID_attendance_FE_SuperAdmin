import React, { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, CalendarDays, Camera, ChevronDown, Clock3, KeyRound, Loader2, Mail, MapPin, Pencil, Shield, Trash2, X } from 'lucide-react';
import { Drawer } from '../../../components/common/Drawer';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { ImageCropModal } from '../../../components/common/ImageCropModal';
import { EmptyState } from '../../../components/common/EmptyState';
import { LoadingState } from '../../../components/common/LoadingState';
import { ResetPasswordModal } from '../../../components/common/ResetPasswordModal';
import type { AdminCheckpointActivityPage, AdminCheckpointActivityRecord, AdminRecord, UpdateAdminPayload } from '../models';
import hawiBoxImg from '../../../assets/illustrations/Hawi Box.png';

interface AdminProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminRecord | null;
  onUpdate: (adminId: string, payload: UpdateAdminPayload) => Promise<boolean>;
  onResetPassword?: (adminId: string, password: string) => Promise<boolean>;
  onArchive: (adminId: string) => Promise<boolean>;
  onRestore: (adminId: string) => Promise<boolean>;
  isSelf: boolean;
  onDelete: (admin: AdminRecord) => void;
  onUploadAvatar: (adminId: string, image: string) => Promise<string>;
  onRemoveAvatar: (adminId: string) => Promise<void>;
  onLoadCheckpointActivity: (adminId: string, page: number) => Promise<AdminCheckpointActivityPage>;
}

export const AdminProfileDrawer: React.FC<AdminProfileDrawerProps> = ({
  isOpen, onClose, admin, onUpdate, onResetPassword, onArchive, onRestore, isSelf, onDelete, onUploadAvatar, onRemoveAvatar, onLoadCheckpointActivity,
}) => {
  const formatTime = (value: string | null) => {
    if (!value) return '—';
    const [hour, minute] = value.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);
  const [activityRecords, setActivityRecords] = useState<AdminCheckpointActivityRecord[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const activityAdminIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setRawImage(null);
      setIsCropOpen(false);
      setPhotoError(null);
      setIsEditingName(false);
      setIsRoleOpen(false);
      setIsResetPasswordOpen(false);
      setInlineError(null);
      setIsArchiveConfirmOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const adminId = isOpen ? admin?.id ?? null : null;
    activityAdminIdRef.current = adminId;
    setActivityRecords([]);
    setActivityTotal(0);
    setActivityPage(0);
    setActivityError(false);
    if (!adminId) { setActivityLoading(false); return; }
    setActivityLoading(true);
    void onLoadCheckpointActivity(adminId, 1).then((result) => {
      if (activityAdminIdRef.current !== adminId) return;
      setActivityRecords(result.records);
      setActivityTotal(result.total);
      setActivityPage(1);
    }).catch(() => {
      if (activityAdminIdRef.current === adminId) setActivityError(true);
    }).finally(() => {
      if (activityAdminIdRef.current === adminId) setActivityLoading(false);
    });
  }, [isOpen, admin?.id, onLoadCheckpointActivity]);

  const loadMoreActivity = async () => {
    if (!admin || activityLoading) return;
    const adminId = admin.id;
    setActivityLoading(true);
    setActivityError(false);
    try {
      const result = await onLoadCheckpointActivity(adminId, activityPage + 1);
      if (activityAdminIdRef.current !== adminId) return;
      setActivityRecords((previous) => [...previous, ...result.records]);
      setActivityTotal(result.total);
      setActivityPage(result.page);
    } catch {
      if (activityAdminIdRef.current === adminId) setActivityError(true);
    } finally {
      if (activityAdminIdRef.current === adminId) setActivityLoading(false);
    }
  };

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

  return <>
    <Drawer
      isOpen={isOpen}
      onClose={() => { if (!isCropOpen && !isUploading && !isArchiveConfirmOpen && !isResetPasswordOpen) onClose(); }}
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
              <button type="button" onClick={() => admin.archived_at ? void onRestore(admin.id) : setIsArchiveConfirmOpen(true)} disabled={isSelf || isSaving} title={isSelf ? 'You cannot archive your own account' : admin.archived_at ? 'Restore administrator' : 'Archive administrator'} aria-label={admin.archived_at ? 'Restore administrator' : 'Archive administrator'} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 bg-white/30 text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">{admin.archived_at ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
              <button type="button" onClick={() => onDelete(admin)} disabled={isSelf || isSaving} title={isSelf ? 'You cannot delete your own account' : 'Delete administrator'} aria-label="Delete administrator" className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/50 bg-white/30 text-white shadow-xs backdrop-blur-md transition-all hover:bg-white/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"><Trash2 className="h-4 w-4" /></button>
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
            <button
              type="button"
              onClick={() => setIsResetPasswordOpen(true)}
              disabled={Boolean(admin.archived_at)}
              title={admin.archived_at ? 'Restore administrator before resetting password' : 'Reset password'}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-[#7026B7] px-4 py-3 text-xs font-bold text-white shadow-[0_4px_0_#451475] transition-colors hover:bg-[#621FA3] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              Reset Password
            </button>
          </div>

          <section aria-label="Administrator overview" className="pt-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#A59AAB]">Overview</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="relative rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs"><p className="text-[10px] font-bold uppercase text-slate-500">Role</p><button type="button" onClick={() => setIsRoleOpen((open) => !open)} disabled={Boolean(admin.archived_at) || isSelf} className="mt-0.5 flex w-full items-center gap-1 text-left font-bold text-slate-900 disabled:cursor-default"><Shield className="h-3.5 w-3.5 text-[#7026B7]" />{admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}{!admin.archived_at && !isSelf && <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />}</button>{isRoleOpen && <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{(['admin', 'super_admin'] as const).map((role) => <button key={role} type="button" onClick={() => void saveRole(role)} className="block w-full rounded-lg px-3 py-2 text-left font-semibold hover:bg-purple-50">{role === 'super_admin' ? 'Super Admin' : 'Admin'}</button>)}</div>}</div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs"><p className="text-[10px] font-bold uppercase text-slate-500">Registered</p><p className="mt-0.5 flex items-center gap-1 font-bold text-slate-900"><CalendarDays className="h-3.5 w-3.5 text-[#7026B7]" />{new Date(admin.created_at).toLocaleDateString()}</p></div>
            </div>
          </section>

          <section aria-label="Assignment history" className="pt-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#A59AAB]">Assignment history</p>
              {activityTotal > 0 && <span className="text-[11px] font-semibold text-[#756883]">{activityTotal} assignment{activityTotal === 1 ? '' : 's'}</span>}
            </div>
            <p className="mt-1 text-xs text-[#756883]">Events, checkpoints, and time sessions assigned to this admin.</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {activityRecords.map((record) => (
                <div key={record.id} className="border-b border-slate-100 px-4 py-3 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#24133F]">{record.event_name} <span className="font-medium text-[#756883]">· {record.session_name}</span></p>
                      <p className="mt-1 text-xs text-[#24133F]">{record.type === 'time_in' ? 'Time In' : 'Time Out'} · {formatTime(record.time_start)} – {formatTime(record.time_end)}</p>
                    </div>
                    {record.session_date && <span className="shrink-0 text-[11px] font-semibold text-[#756883]">{record.session_date}</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#756883]">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{record.location_name}</span>
                    {record.session_date && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{record.session_date}</span>}
                  </div>
                </div>
              ))}
              {!activityLoading && !activityError && activityRecords.length === 0 && (
                <EmptyState
                  compact
                  variant="empty-list"
                  title="No checkpoint assignments yet"
                  description="This admin has not been assigned to any event checkpoints."
                />
              )}
              {activityLoading && activityRecords.length === 0 && (
                <LoadingState
                  compact
                  title="Hawi is finding assignments…"
                  description="Loading this admin’s checkpoint history."
                />
              )}
              {activityError && <div className="px-4 py-5 text-center text-xs text-[#756883]">Could not load assignments. <button type="button" onClick={() => void loadMoreActivity()} className="font-bold text-[#7026B7] underline">Retry</button></div>}
            </div>
            {activityRecords.length > 0 && activityRecords.length < activityTotal && <button type="button" onClick={() => void loadMoreActivity()} disabled={activityLoading} className="mt-3 w-full rounded-xl border border-[#E5E0EB] bg-white px-4 py-2.5 text-xs font-bold text-[#7026B7] hover:bg-purple-50 disabled:opacity-50">{activityLoading ? 'Loading…' : 'Load more assignments'}</button>}
          </section>
        </div>
      </div>}
    </Drawer>
    <Modal isOpen={isArchiveConfirmOpen && Boolean(admin)} onClose={() => { if (!isSaving) setIsArchiveConfirmOpen(false); }} title="Archive administrator" maxWidth="sm" zIndex={600}>
      {admin && <div className="space-y-4 pt-1">
        <img src={hawiBoxImg} alt="Hawi with an archive box" className="mx-auto h-24 w-24 object-contain" />
        <p className="text-sm text-[#756883]">Archive <strong className="text-[#24133F]">{admin.name}</strong>? This removes the account from active admins and blocks sign in. You can restore it later.</p>
        <div className="flex justify-end gap-3 border-t border-[#F1EEF4] pt-4">
          <Button type="button" variant="secondary" disabled={isSaving} onClick={() => setIsArchiveConfirmOpen(false)}>Cancel</Button>
          <Button type="button" variant="primary" isLoading={isSaving} onClick={async () => { setIsSaving(true); try { const archived = await onArchive(admin.id); if (archived) { setIsArchiveConfirmOpen(false); onClose(); } } finally { setIsSaving(false); } }}>Archive</Button>
        </div>
      </div>}
    </Modal>
    <ImageCropModal isOpen={isCropOpen} onClose={() => { setIsCropOpen(false); setRawImage(null); }} imageSrc={rawImage} onConfirmCrop={handleConfirmCrop} isSaving={isUploading} />
    <ResetPasswordModal
      isOpen={isResetPasswordOpen && Boolean(admin)}
      onClose={() => setIsResetPasswordOpen(false)}
      account={admin ? {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        identifier: admin.role === 'super_admin' ? 'Super Admin' : 'Admin',
        type: 'Admin',
        avatarUrl: admin.avatar_url,
      } : null}
      onReset={async (id, password) => {
        if (onResetPassword) {
          return await onResetPassword(id, password);
        }
        return await onUpdate(id, { password });
      }}
    />
  </>;
};

export default AdminProfileDrawer;
