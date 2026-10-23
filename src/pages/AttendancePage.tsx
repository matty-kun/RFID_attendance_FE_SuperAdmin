import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AttendanceListView } from '../features/attendance';
import { SessionsView } from '../features/sessions';

export const AttendancePage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'records' ? 'records' : 'sessions';
  const selectTab = (nextTab: 'sessions' | 'records') => {
    const next = new URLSearchParams(params);
    next.set('tab', nextTab);
    setParams(next);
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-black tracking-tight text-[#24133F]">Attendance</h1><p className="mt-1 text-xs text-slate-500">Manage sessions and review RFID attendance records.</p></div>
      <div role="tablist" aria-label="Attendance sections" className="flex rounded-xl bg-[#F2F1F5] p-1">
        <button type="button" role="tab" aria-selected={tab === 'sessions'} onClick={() => selectTab('sessions')} className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${tab === 'sessions' ? 'bg-white text-brand-700 shadow-sm' : 'text-[#756883] hover:text-brand-700'}`}>Sessions</button>
        <button type="button" role="tab" aria-selected={tab === 'records'} onClick={() => selectTab('records')} className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${tab === 'records' ? 'bg-white text-brand-700 shadow-sm' : 'text-[#756883] hover:text-brand-700'}`}>Records</button>
      </div>
    </div>
    <div role="tabpanel">{tab === 'sessions' ? <SessionsView /> : <AttendanceListView />}</div>
  </div>;
};

export default AttendancePage;
