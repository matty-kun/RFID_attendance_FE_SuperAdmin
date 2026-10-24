import React, { useMemo, useState } from 'react';
import { useStudentsViewModel } from '../viewmodels';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { BookOpen, ChevronDown, CreditCard, Pencil, Plus, Search, Sparkles, Trash2, UsersRound } from 'lucide-react';

export const StudentsView: React.FC = () => {
  const {
    filteredStudents,
    searchQuery,
    setSearchQuery,
    isModalOpen,
    setIsModalOpen,
    isSubmitting,
    isLoading,
    studentId,
    setStudentId,
    name,
    setName,
    email,
    setEmail,
    temporaryPassword,
    setTemporaryPassword,
    page, setPage, total, error,
    course,
    setCourse,
    yearLevel,
    setYearLevel,
    rfidUid,
    setRfidUid,
    handleRegister,
  } = useStudentsViewModel();
  const [courseFilter, setCourseFilter] = useState('all');
  const [rfidFilter, setRfidFilter] = useState('all');
  const courses = useMemo(() => [...new Set(filteredStudents.map((student) => student.course).filter((course): course is string => Boolean(course)))].sort(), [filteredStudents]);
  const visibleStudents = filteredStudents.filter((student) =>
    (courseFilter === 'all' || student.course === courseFilter)
    && (rfidFilter === 'all' || (rfidFilter === 'verified' ? Boolean(student.rfid_uid) : !student.rfid_uid)));
  const yearLabel = (year?: number | null) => year ? `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year` : '—';
  const initials = (fullName: string) => fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 text-[#24133F]">
      {/* Top Header */}
      <div><h1 className="text-[22px] font-extrabold leading-tight">Students &amp; RFID Cards</h1><p className="text-[11px] text-[#756883]">Register, replace and manage student RFID cards.</p></div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-[#756883] sm:max-w-[310px]"><Search className="h-4 w-4" /><span className="sr-only">Search students</span><input type="search" value={searchQuery} onChange={(event) => { setPage(1); setSearchQuery(event.target.value); }} placeholder="Search" className="w-full bg-transparent text-xs text-[#24133F] outline-none placeholder:text-[#A59AAB]" /></label>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs"><BookOpen className="h-4 w-4 text-[#756883]" /><span className="sr-only">Course</span><select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="max-w-28 bg-transparent font-semibold outline-none"><option value="all">All Courses</option>{courses.map((course) => <option key={course} value={course}>{course}</option>)}</select><ChevronDown className="h-3 w-3 text-[#756883]" /></label>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-[#E5E0EB] bg-white px-3 text-xs"><UsersRound className="h-4 w-4 text-[#756883]" /><span className="sr-only">RFID status</span><select value={rfidFilter} onChange={(event) => setRfidFilter(event.target.value)} className="max-w-28 bg-transparent font-semibold outline-none"><option value="all">RFID Status</option><option value="verified">Verified</option><option value="no-card">No card</option></select><ChevronDown className="h-3 w-3 text-[#756883]" /></label>
        <div className="ml-auto"><Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>Add Student</Button></div>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto rounded-2xl border border-[#E5E0EB] bg-white p-2.5">
        {error && <p role="alert" className="px-3 py-2 text-sm text-rose-600">{error}</p>}
        <table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="rounded-xl border border-[#E9EDF4] text-[10px] uppercase text-[#637596]"><th className="rounded-l-xl border-y border-l border-[#E9EDF4] px-3 py-3 font-medium">Student</th><th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">Course</th><th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">Year</th><th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">RFID Card</th><th className="border-y border-[#E9EDF4] px-3 py-3 font-medium">RFID Status</th><th className="rounded-r-xl border-y border-r border-[#E9EDF4] px-3 py-3 font-medium"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visibleStudents.map((student) => <tr key={student.id} className="border-b border-[#E9EDF4] last:border-b-0 hover:bg-[#FAF8FC]"><td className="px-3 py-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#DFE8F8] text-[9px] font-extrabold text-[#294B85]">{initials(student.name)}</span><span className="font-bold">{student.name}</span></div></td><td className="px-3 py-3 font-semibold">{student.course || '—'}</td><td className="px-3 py-3">{yearLabel(student.year_level)}</td><td className="px-3 py-3 font-mono text-[11px] text-[#637596]">{student.rfid_uid || 'No card'}</td><td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 font-semibold ${student.rfid_uid ? 'bg-[#E4F7EB] text-[#16883F]' : 'bg-[#FFF2DE] text-[#E58A00]'}`}><i className={`h-1.5 w-1.5 rounded-full ${student.rfid_uid ? 'bg-[#17B556]' : 'bg-[#F59E0B]'}`} />{student.rfid_uid ? 'Verified' : 'No card'}</span></td><td className="px-3 py-3"><div className="flex gap-3"><button type="button" disabled title="Edit is not available yet" aria-label={`Edit ${student.name} unavailable`} className="text-[#756883] opacity-40"><Pencil className="h-4 w-4" /></button><button type="button" disabled title="Delete is not available yet" aria-label={`Delete ${student.name} unavailable`} className="text-rose-500 opacity-40"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody>
        </table>
        {!visibleStudents.length && <p className="px-4 py-10 text-center text-xs text-[#756883]">{isLoading ? 'Loading students…' : error ? 'Unable to show students.' : 'No students match these filters.'}</p>}
        <div className="flex items-center justify-between gap-3 border-t border-[#E9EDF4] px-3 py-3 text-xs text-[#756883]"><span>{total.toLocaleString()} students · Page {page} of {Math.max(1, Math.ceil(total / 25))}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page * 25 >= total || isLoading} onClick={() => setPage(page + 1)}>Next</Button></div></div>
      </div>

      {/* Register Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Student"
        description="Create a student login with a temporary password and optionally link an RFID card. Share the password privately; the student must change it after first login."
      >
        <form onSubmit={handleRegister} className="space-y-4 mt-2">
          <Input
            label="Institutional Student ID"
            placeholder="e.g. 2026-00045"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          />

          <Input
            label="Full Name"
            placeholder="e.g. Roberto Garcia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. roberto@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Temporary Password"
            type="password"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            minLength={12}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Academic Course / Program"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Year Level
              </label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/50 space-y-2">
            <label className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Physical RFID Card UID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. E28011700000020B042F3401 (tap reader or enter hex)"
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-purple-200 text-xs font-mono font-bold text-purple-950 bg-white placeholder:text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[10px] text-purple-700 font-medium">
              You can tap the card onto a USB OTG scanner while focusing this input field.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Save Student
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
