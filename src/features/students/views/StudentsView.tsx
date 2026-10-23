import React from 'react';
import { useStudentsViewModel } from '../viewmodels';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Input } from '../../../components/common/Input';
import { Modal } from '../../../components/common/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/common/Table';
import { GraduationCap, Plus, Search, Sparkles, CreditCard } from 'lucide-react';

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Directory & RFID Cards</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Create student logins and manage institutional IDs and RFID cards.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Register Student
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, student ID, email, course, or RFID UID..."
          value={searchQuery}
          onChange={(e) => { setPage(1); setSearchQuery(e.target.value); }}
          className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-brand-600" />
            Enrolled Students ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p role="alert" className="px-6 pb-3 text-sm text-rose-600">{error}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Academic Program</TableHead>
                <TableHead>RFID Card Status</TableHead>
                <TableHead>Registered At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-xs font-semibold">
                    {isLoading ? 'Loading students…' : error ? 'Unable to show students.' : 'No students match your query.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell>
                      <div className="font-bold text-slate-900 text-sm">{st.name}</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {st.email || 'No email registered'} · {st.auth_user_id ? 'Login enabled' : 'No login linked'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-slate-800">
                      {st.student_id}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-medium">
                      {st.course || '—'} {st.year_level ? `(Year ${st.year_level})` : ''}
                    </TableCell>
                    <TableCell>
                      {st.rfid_uid ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="emerald" size="sm" dot>
                            Linked
                          </Badge>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {st.rfid_uid}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="amber" size="sm" dot>
                          No Card Assigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {new Date(st.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            <span>Page {page} of {Math.max(1, Math.ceil(total / 25))}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page * 25 >= total || isLoading} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
