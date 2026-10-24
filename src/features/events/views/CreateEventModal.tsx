import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Clock,
  Info,
  MapPin,
  Pencil,
  Send,
  ShieldCheck,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Checkbox } from '../../../components/common/Checkbox';
import { TimePicker } from '../../../components/common/TimePicker';
import {
  AssignOfficersDrawer,
  type AssignedOfficer,
} from './AssignOfficersDrawer';

export interface SessionTimeSlot {
  inTime: string;
  inOfficers: AssignedOfficer[];
  outTime: string;
  outOfficers: AssignedOfficer[];
}

export interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublished?: (eventData: any) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onPublished,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPublished, setIsPublished] = useState<boolean>(false);

  // Form State
  const [eventName, setEventName] = useState('CITE FESTIVAL');
  const [eventDescription, setEventDescription] = useState(
    'CITE Fest is an annual department festival that celebrates the talents, creativity, and teamwork of CITE students through various academic, sports, and recreational activities. It promotes camaraderie, collaboration, and school spirit among students and faculty.'
  );
  const [startDate, setStartDate] = useState('2026-10-02');
  const [endDate, setEndDate] = useState('2026-10-05');
  const [calendarMonth, setCalendarMonth] = useState(9); // 9 = October
  const [calendarYear, setCalendarYear] = useState(2026);

  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const d1 = new Date(`${startDate}T00:00:00`);
    const d2 = new Date(`${endDate}T00:00:00`);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  }, [startDate, endDate]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(`${dateStr}T00:00:00`);
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Step 3 state
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [afternoonEnabled, setAfternoonEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(false);

  const [morningExpanded, setMorningExpanded] = useState(true);
  const [afternoonExpanded, setAfternoonExpanded] = useState(true);
  const [eveningExpanded, setEveningExpanded] = useState(true);

  // Dynamic session slots & officers
  const [morningSlot, setMorningSlot] = useState<SessionTimeSlot>({
    inTime: '7:00 - 8:30 AM',
    inOfficers: [{ id: 'adm-3', name: 'Nonoy Kaibo', initials: 'NK', role: 'Admin', location: 'Cite Building', status: 'Online' }],
    outTime: '12:00 - 1:30 PM',
    outOfficers: [{ id: 'adm-3', name: 'Nonoy Kaibo', initials: 'NK', role: 'Admin', location: 'Cite Building', status: 'Online' }],
  });

  const [afternoonSlot, setAfternoonSlot] = useState<SessionTimeSlot>({
    inTime: '1:00 - 2:30 PM',
    inOfficers: [{ id: 'adm-3', name: 'Nonoy Kaibo', initials: 'NK', role: 'Admin', location: 'Cite Building', status: 'Online' }],
    outTime: '5:00 - 6:30 PM',
    outOfficers: [{ id: 'adm-3', name: 'Nonoy Kaibo', initials: 'NK', role: 'Admin', location: 'Cite Building', status: 'Online' }],
  });

  const [eveningSlot, setEveningSlot] = useState<SessionTimeSlot>({
    inTime: '6:00 - 7:30 PM',
    inOfficers: [{ id: 'adm-1', name: 'Ako si batman', initials: 'AB', role: 'Admin', location: 'Gymnasium', status: 'Online' }],
    outTime: '9:00 - 10:30 PM',
    outOfficers: [{ id: 'adm-1', name: 'Ako si batman', initials: 'AB', role: 'Admin', location: 'Gymnasium', status: 'Online' }],
  });

  // Time Window Edit Modal State (with Start & End tabs)
  const [activeTimeField, setActiveTimeField] = useState<'start' | 'end'>('start');
  const [editingTimeSlot, setEditingTimeSlot] = useState<{
    isOpen: boolean;
    sessionType: 'Morning' | 'Afternoon' | 'Evening';
    slot: 'IN' | 'OUT';
    start: string;
    end: string;
  }>({
    isOpen: false,
    sessionType: 'Morning',
    slot: 'IN',
    start: '07:00',
    end: '08:30',
  });

  const parseSlotTime = (windowStr: string) => {
    try {
      const parts = windowStr.split('-').map((s) => s.trim());
      const to24 = (t: string) => {
        const [time, period] = t.split(' ');
        const [h, m] = time.split(':').map(Number);
        let hr = h;
        if (period?.toUpperCase() === 'PM' && hr < 12) hr += 12;
        if (period?.toUpperCase() === 'AM' && hr === 12) hr = 0;
        return `${String(hr).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
      };
      return {
        start: parts[0] ? to24(parts[0]) : '07:00',
        end: parts[1] ? to24(parts[1]) : '08:30',
      };
    } catch {
      return { start: '07:00', end: '08:30' };
    }
  };

  const formatSlotTimeWindow = (start24: string, end24: string) => {
    const to12 = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const period = (h || 0) >= 12 ? 'PM' : 'AM';
      const hr = (h || 0) % 12 || 12;
      return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`;
    };
    return `${to12(start24)} - ${to12(end24)}`;
  };

  const handleOpenEditTimeSlot = (
    sessionType: 'Morning' | 'Afternoon' | 'Evening',
    slot: 'IN' | 'OUT',
    currentTimeStr: string
  ) => {
    const parsed = parseSlotTime(currentTimeStr);
    setActiveTimeField('start');
    setEditingTimeSlot({
      isOpen: true,
      sessionType,
      slot,
      start: parsed.start,
      end: parsed.end,
    });
  };



  const handleSaveSlotTime = () => {
    const { sessionType, slot, start, end } = editingTimeSlot;
    const formatted = formatSlotTimeWindow(start, end);
    const updateSlot = (s: SessionTimeSlot): SessionTimeSlot => ({
      ...s,
      [slot === 'IN' ? 'inTime' : 'outTime']: formatted,
    });

    if (sessionType === 'Morning') setMorningSlot(updateSlot);
    if (sessionType === 'Afternoon') setAfternoonSlot(updateSlot);
    if (sessionType === 'Evening') setEveningSlot(updateSlot);

    setEditingTimeSlot((prev) => ({ ...prev, isOpen: false }));
  };

  // Drawer state for assigning officers
  const [drawerConfig, setDrawerConfig] = useState<{
    isOpen: boolean;
    sessionType: 'Morning' | 'Afternoon' | 'Evening';
    slot: 'IN' | 'OUT';
    sessionTime: string;
    initialOfficers: AssignedOfficer[];
  }>({
    isOpen: false,
    sessionType: 'Morning',
    slot: 'IN',
    sessionTime: '',
    initialOfficers: [],
  });

  const handleOpenAssignDrawer = (
    sessionType: 'Morning' | 'Afternoon' | 'Evening',
    slot: 'IN' | 'OUT',
    timeStr: string,
    officers: AssignedOfficer[]
  ) => {
    setDrawerConfig({
      isOpen: true,
      sessionType,
      slot,
      sessionTime: timeStr,
      initialOfficers: officers,
    });
  };

  const handleSaveAssignedOfficers = (assigned: AssignedOfficer[]) => {
    const { sessionType, slot } = drawerConfig;

    const updateSlot = (s: SessionTimeSlot): SessionTimeSlot => ({
      ...s,
      [slot === 'IN' ? 'inOfficers' : 'outOfficers']: assigned,
    });

    if (sessionType === 'Morning') setMorningSlot(updateSlot);
    if (sessionType === 'Afternoon') setAfternoonSlot(updateSlot);
    if (sessionType === 'Evening') setEveningSlot(updateSlot);

    setDrawerConfig((prev) => ({ ...prev, isOpen: false }));
  };

  if (!isOpen) return null;

  const daysCount = calculatedDays;

  const resetForm = () => {
    setCurrentStep(1);
    setIsPublished(false);
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handlePublish = () => {
    setIsPublished(true);
    if (onPublished) {
      onPublished({
        name: eventName,
        description: eventDescription,
        startDate,
        endDate,
        daysCount,
      });
    }
  };

  const handleCloseModal = () => {
    resetForm();
    onClose();
  };

  const stepTitles = [
    'Event Details',
    'Event Dates',
    'Add Sessions',
    'Review Schedule',
    'Publish Event',
  ];

  return createPortal(
    <>
      <div
        role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleCloseModal();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#170D29]/40 p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col justify-between overflow-hidden rounded-[24px] border border-[#E5E0EB] bg-white shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="border-b border-[#F1EEF4] px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFB] text-[#451475]">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#24133F]">Create Event</h2>
                <p className="text-xs text-[#756883]">
                  Set up a new event for attendance management. Complete all steps to publish
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stepper (Only visible during creation, not in success modal) */}
          {!isPublished && (
            <div className="mt-4 overflow-x-auto py-1">
              <div className="grid min-w-[600px] grid-cols-5 px-4 pt-2 pb-1">
              {stepTitles.map((title, idx) => {
                const stepNum = idx + 1;
                const isComplete = currentStep > stepNum;
                const isActive = currentStep === stepNum;

                return (
                  <button
                    key={title}
                    type="button"
                    onClick={() => setCurrentStep(stepNum)}
                    className="group relative flex flex-col items-center text-center cursor-pointer focus:outline-none"
                    title={`Go to step ${stepNum}: ${title}`}
                  >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ease-out transform group-hover:scale-105 ${
                          isComplete
                            ? 'bg-[#A855F7] text-white shadow-sm'
                            : isActive
                            ? 'bg-[#A855F7] text-white ring-4 ring-[#A855F7]/25 scale-110 shadow-md'
                            : 'bg-[#F3E8FF] text-[#A855F7] group-hover:bg-[#E9D5FF]'
                        }`}
                      >
                        {isComplete ? <Check className="h-4 w-4 stroke-[2.5]" /> : stepNum}
                      </div>
                      <span
                        className={`mt-1.5 whitespace-nowrap text-[11px] font-medium transition-colors duration-200 ${
                          isActive || isComplete ? 'font-bold text-[#24133F]' : 'text-[#756883] group-hover:text-[#24133F]'
                        }`}
                      >
                        {title}
                      </span>
                    {idx < stepTitles.length - 1 && (
                      <div className="absolute left-[calc(50%+1.5rem)] top-6 h-[2px] w-[calc(100%-3rem)] bg-[#E5E0EB] overflow-hidden pointer-events-none">
                        <div
                          className={`h-full bg-[#A855F7] transition-all duration-500 ease-out ${
                            currentStep > stepNum ? 'w-full' : 'w-0'
                          }`}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Published Celebration State (Image 1 from user) */}
          {isPublished ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981] text-white shadow-lg">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <div className="mt-4 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#10B981]">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                Live
              </div>
              <h3 className="mt-3 text-xl font-bold text-[#24133F]">{eventName} is published</h3>
              <p className="mt-1 max-w-sm text-xs text-[#756883]">
                Attendance sessions are now open for scanning. Admins and students can view this event.
              </p>
            </div>
          ) : currentStep === 1 ? (
            /* STEP 1: EVENT DETAILS */
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-[#756883]">step 1 to 5</p>
                <h3 className="text-lg font-bold text-[#24133F]">Event Details</h3>
                <p className="text-xs text-[#756883]">Provide the basic information about your event</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#24133F]">Event Name</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Enter event name"
                  className="mt-1.5 w-full rounded-2xl border border-[#E5E0EB] px-4 py-2.5 text-xs text-[#24133F] placeholder-[#756883] focus:border-[#451475] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#24133F]">Event Description</label>
                  <span className="text-[10px] text-[#756883]">{eventDescription.length}/500</span>
                </div>
                <textarea
                  rows={5}
                  maxLength={500}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Describe your event..."
                  className="mt-1.5 w-full rounded-2xl border border-[#E5E0EB] p-4 text-xs leading-relaxed text-[#24133F] placeholder-[#756883] focus:border-[#451475] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-[#F9F7FA] p-3.5 text-xs text-[#756883]">
                <Info className="h-4 w-4 shrink-0 text-[#451475]" />
                <span>The information you provide here will be visible to all users once the event is publish</span>
              </div>
            </div>
          ) : currentStep === 2 ? (
            /* STEP 2: EVENT DATES */
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-[#756883]">Step 2 of 5</p>
                <h3 className="text-lg font-bold text-[#24133F]">Event Dates</h3>
                <p className="text-xs text-[#756883]">
                  Select the start and end date for your event using the interactive calendar below.
                </p>
              </div>

              {/* Selected Dates Display (No dropdown) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#E5E0EB] bg-white px-4 py-3 shadow-xs">
                  <span className="block text-[10px] font-bold text-[#756883] uppercase tracking-wider mb-0.5">Start Date</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#451475] shrink-0" />
                    <span className="text-xs font-bold text-[#24133F]">
                      {startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select on calendar'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E5E0EB] bg-white px-4 py-3 shadow-xs">
                  <span className="block text-[10px] font-bold text-[#756883] uppercase tracking-wider mb-0.5">End Date</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#451475] shrink-0" />
                    <span className="text-xs font-bold text-[#24133F]">
                      {endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select on calendar'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Calendar Month View */}
              <div className="rounded-2xl border border-[#E5E0EB] bg-[#FAF8FB]/60 p-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1EEF4]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#451475]" />
                    <span className="text-xs font-bold text-[#24133F]">
                      {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear((y) => y - 1);
                        } else {
                          setCalendarMonth((m) => m - 1);
                        }
                      }}
                      className="rounded-lg p-1 text-[#756883] hover:bg-white hover:text-[#24133F] transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear((y) => y + 1);
                        } else {
                          setCalendarMonth((m) => m + 1);
                        }
                      }}
                      className="rounded-lg p-1 text-[#756883] hover:bg-white hover:text-[#24133F] transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Day headers */}
                <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-bold text-[#756883]">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 text-center text-xs">
                  {(() => {
                    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                    const cells = [];

                    // Blank leading days
                    for (let i = 0; i < firstDay; i++) {
                      cells.push(<div key={`blank-${i}`} className="h-8" />);
                    }

                    // Days in month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isStart = dayStr === startDate;
                      const isEnd = dayStr === endDate;
                      const inRange = startDate && endDate && dayStr > startDate && dayStr < endDate;
                      const hasRange = startDate && endDate && startDate !== endDate;

                      // Check day of week for rounding row ends (0 = Sunday, 6 = Saturday)
                      const dayOfWeek = (firstDay + day - 1) % 7;
                      const isRowStart = dayOfWeek === 0;
                      const isRowEnd = dayOfWeek === 6;

                      cells.push(
                        <div key={day} className="relative flex h-9 items-center justify-center py-0.5">
                          {/* Seamless continuous range background strip */}
                          {hasRange && (
                            <>
                              {/* Background for start date: right half filled, rounded if on Saturday */}
                              {isStart && (
                                <div className={`absolute right-0 top-0.5 bottom-0.5 left-1/2 bg-[#E9D5FF]/60 ${
                                  isRowEnd ? 'rounded-r-full' : ''
                                }`} />
                              )}
                              {/* Background for in-between dates: full width, rounded on row edges */}
                              {inRange && (
                                <div className={`absolute inset-x-0 top-0.5 bottom-0.5 bg-[#E9D5FF]/60 ${
                                  isRowStart && isRowEnd
                                    ? 'rounded-full'
                                    : isRowStart
                                    ? 'rounded-l-full'
                                    : isRowEnd
                                    ? 'rounded-r-full'
                                    : ''
                                }`} />
                              )}
                              {/* Background for end date: left half filled, rounded if on Sunday */}
                              {isEnd && (
                                <div className={`absolute left-0 top-0.5 bottom-0.5 right-1/2 bg-[#E9D5FF]/60 ${
                                  isRowStart ? 'rounded-l-full' : ''
                                }`} />
                              )}
                            </>
                          )}

                          {/* Date button circle */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!startDate || (startDate && endDate && startDate !== endDate)) {
                                setStartDate(dayStr);
                                setEndDate(dayStr);
                              } else if (startDate && (!endDate || startDate === endDate)) {
                                if (dayStr < startDate) {
                                  setEndDate(startDate);
                                  setStartDate(dayStr);
                                } else {
                                  setEndDate(dayStr);
                                }
                              }
                            }}
                            className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                              isStart || isEnd
                                ? 'bg-[#451475] font-bold text-white shadow-xs'
                                : inRange
                                ? 'text-[#451475] hover:bg-[#D8B4FE]/40'
                                : 'text-[#24133F] hover:bg-white'
                            }`}
                          >
                            {day}
                          </button>
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
              </div>

              {/* Calculated Duration Box */}
              <div className="flex items-center gap-4 rounded-2xl bg-[#F6F4F8] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-[#451475]">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#756883]">Event Duration</p>
                  <p className="text-base font-extrabold text-[#24133F]">
                    {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                  </p>
                  <p className="text-[11px] text-[#756883]">
                    From {formatDateDisplay(startDate)} to {formatDateDisplay(endDate)}
                  </p>
                </div>
              </div>
            </div>
          ) : currentStep === 3 ? (
            /* STEP 3: ADD SESSIONS */
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-[#756883]">Step 3 of 5</p>
                <h3 className="text-lg font-bold text-[#24133F]">Add sessions</h3>
                <p className="text-xs text-[#756883]">Configure the attendance sessions for each day of your event.</p>
              </div>

              {/* Day pill selectors */}
              <div className="flex items-center gap-2">
                {[
                  { num: 1, label: 'Day 1 · Oct 2' },
                  { num: 2, label: 'Day 2 · Oct 3' },
                  { num: 3, label: 'Day 3 · Oct 4' },
                  { num: 4, label: 'Day 4 · Oct 5' },
                ].map((d) => (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => setSelectedDayTab(d.num)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      selectedDayTab === d.num
                        ? 'bg-[#E9D5FF] text-[#6D21A8]'
                        : 'bg-white border border-[#E5E0EB] text-[#756883] hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Day header & Session Toggles */}
              <div className="border-t border-[#F1EEF4] pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#24133F]">Day 1 - October 2, 2026</h4>
                    <p className="text-[11px] text-[#756883]">Enable one, multiple, or all for this day.</p>
                  </div>
                  <button type="button" className="text-xs font-bold text-[#451475] hover:underline">
                    Select all
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {[
                    { label: 'Morning', state: morningEnabled, setter: setMorningEnabled },
                    { label: 'Afternoon', state: afternoonEnabled, setter: setAfternoonEnabled },
                    { label: 'Evening', state: eveningEnabled, setter: setEveningEnabled },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => chip.setter(!chip.state)}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition-colors ${
                        chip.state
                          ? 'border-[#451475] bg-[#FAF7FD] text-[#451475]'
                          : 'border-[#E5E0EB] bg-white text-[#756883]'
                      }`}
                    >
                      <span>{chip.label}</span>
                      <Checkbox checked={chip.state} onChange={() => {}} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Session Accordions */}
              {[
                {
                  type: 'Morning' as const,
                  label: 'Morning Session',
                  badge: 'Both (IN + OUT)',
                  enabled: morningEnabled,
                  expanded: morningExpanded,
                  setExpanded: setMorningExpanded,
                  slot: morningSlot,
                },
                {
                  type: 'Afternoon' as const,
                  label: 'Afternoon Session',
                  badge: 'Both (IN + OUT)',
                  enabled: afternoonEnabled,
                  expanded: afternoonExpanded,
                  setExpanded: setAfternoonExpanded,
                  slot: afternoonSlot,
                },
                {
                  type: 'Evening' as const,
                  label: 'Evening Session',
                  badge: 'Both (IN + OUT)',
                  enabled: eveningEnabled,
                  expanded: eveningExpanded,
                  setExpanded: setEveningExpanded,
                  slot: eveningSlot,
                },
              ].map(
                (session) =>
                  session.enabled && (
                    <div key={session.type} className="rounded-2xl border border-[#E5E0EB] bg-white p-4 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#24133F]">{session.label}</span>
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-[#756883]">
                            {session.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#EBF3FF] px-2.5 py-0.5 text-[10px] font-bold text-[#3B82F6]">
                            Selected
                          </span>
                          <button
                            type="button"
                            onClick={() => session.setExpanded(!session.expanded)}
                            className="rounded p-1 text-[#756883] hover:text-[#24133F] transition-colors"
                          >
                            {session.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {session.expanded && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {/* IN Slot Card */}
                          <div className="rounded-2xl border border-[#F1EEF4] bg-[#FAF8FB]/50 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 font-bold text-emerald-600 text-xs">
                                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                Check-in Window
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditTimeSlot(session.type, 'IN', session.slot.inTime)}
                                className="group flex items-center gap-1.5 rounded-lg bg-white hover:bg-[#FAF7FD] border border-[#E5E0EB] hover:border-[#451475] px-2.5 py-1 text-[11px] font-semibold text-[#24133F] hover:text-[#451475] transition-all shadow-xs"
                                title="Click to edit check-in window"
                              >
                                <Clock className="h-3.5 w-3.5 text-[#451475]" />
                                <span>{session.slot.inTime}</span>
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {session.slot.inOfficers.map((off: AssignedOfficer) => (
                                <button
                                  key={off.id}
                                  type="button"
                                  onClick={() =>
                                    handleOpenAssignDrawer(
                                      session.type,
                                      'IN',
                                      session.slot.inTime,
                                      session.slot.inOfficers
                                    )
                                  }
                                  className="group flex items-center gap-1.5 rounded-full bg-white border border-[#E5E0EB] hover:border-[#451475] pl-1.5 pr-2.5 py-1 text-[11px] font-semibold text-[#24133F] transition-colors shadow-2xs"
                                  title="Click to view/change assignment"
                                >
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E9D5FF] text-[9px] font-bold text-[#6D21A8]">
                                    {off.initials}
                                  </div>
                                  <span>{off.name}</span>
                                  {off.location && (
                                    <span className="flex items-center gap-0.5 rounded-full bg-[#FAF7FD] text-[9px] font-medium text-[#451475] px-1.5 py-0.2">
                                      <MapPin className="h-2.5 w-2.5 text-[#451475]" />
                                      {off.location}
                                    </span>
                                  )}
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenAssignDrawer(
                                    session.type,
                                    'IN',
                                    session.slot.inTime,
                                    session.slot.inOfficers
                                  )
                                }
                                className="flex items-center gap-1 rounded-full border border-dashed border-[#756883] hover:border-[#451475] px-2.5 py-1 text-[11px] font-semibold text-[#756883] hover:text-[#451475] hover:bg-[#FAF7FD] transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Assign Officers</span>
                              </button>
                            </div>
                          </div>

                          {/* OUT Slot Card */}
                          <div className="rounded-2xl border border-[#F1EEF4] bg-[#FAF8FB]/50 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 font-bold text-[#EF3340] text-xs">
                                <span className="h-2 w-2 rounded-full bg-[#EF3340]" />
                                Check-out Window
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenEditTimeSlot(session.type, 'OUT', session.slot.outTime)}
                                className="group flex items-center gap-1.5 rounded-lg bg-white hover:bg-[#FAF7FD] border border-[#E5E0EB] hover:border-[#EF3340] px-2.5 py-1 text-[11px] font-semibold text-[#24133F] hover:text-[#EF3340] transition-all shadow-xs"
                                title="Click to edit check-out window"
                              >
                                <Clock className="h-3.5 w-3.5 text-[#EF3340]" />
                                <span>{session.slot.outTime}</span>
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {session.slot.outOfficers.map((off: AssignedOfficer) => (
                                <button
                                  key={off.id}
                                  type="button"
                                  onClick={() =>
                                    handleOpenAssignDrawer(
                                      session.type,
                                      'OUT',
                                      session.slot.outTime,
                                      session.slot.outOfficers
                                    )
                                  }
                                  className="group flex items-center gap-1.5 rounded-full bg-white border border-[#E5E0EB] hover:border-[#451475] pl-1.5 pr-2.5 py-1 text-[11px] font-semibold text-[#24133F] transition-colors shadow-2xs"
                                  title="Click to view/change assignment"
                                >
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E9D5FF] text-[9px] font-bold text-[#6D21A8]">
                                    {off.initials}
                                  </div>
                                  <span>{off.name}</span>
                                  {off.location && (
                                    <span className="flex items-center gap-0.5 rounded-full bg-[#FAF7FD] text-[9px] font-medium text-[#451475] px-1.5 py-0.2">
                                      <MapPin className="h-2.5 w-2.5 text-[#451475]" />
                                      {off.location}
                                    </span>
                                  )}
                                </button>
                              ))}

                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenAssignDrawer(
                                    session.type,
                                    'OUT',
                                    session.slot.outTime,
                                    session.slot.outOfficers
                                  )
                                }
                                className="flex items-center gap-1 rounded-full border border-dashed border-[#756883] hover:border-[#451475] px-2.5 py-1 text-[11px] font-semibold text-[#756883] hover:text-[#451475] hover:bg-[#FAF7FD] transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Assign Officers</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
              )}
            </div>
          ) : currentStep === 4 ? (
            /* STEP 4: REVIEW SCHEDULE */
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-[#756883]">Step 4 of 5</p>
                <h3 className="text-lg font-bold text-[#24133F]">Review Schedule</h3>
                <p className="text-xs text-[#756883]">Check all the details before publishing your event.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Event Details Card */}
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#451475]" />
                      <h4 className="text-xs font-bold text-[#24133F]">Event Details</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="rounded p-1 text-[#756883] hover:text-[#24133F]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] text-[#756883]">Event Name</p>
                    <p className="text-xs font-bold text-[#24133F]">{eventName}</p>
                    <p className="mt-2 text-[10px] text-[#756883]">Description</p>
                    <p className="text-[11px] leading-relaxed text-[#756883] line-clamp-3">
                      {eventDescription}
                    </p>
                  </div>
                </div>

                {/* Event Dates Card */}
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#451475]" />
                      <h4 className="text-xs font-bold text-[#24133F]">Event Dates</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="rounded p-1 text-[#756883] hover:text-[#24133F]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-[#756883]">Start Date</p>
                      <p className="text-[11px] font-bold text-[#24133F]">October 2, 2026</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#756883]">End Date</p>
                      <p className="text-[11px] font-bold text-[#24133F]">October 5, 2026</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#756883]">Total Event Days</p>
                      <p className="text-[11px] font-bold text-[#24133F]">4 days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Schedule Summary */}
              <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#451475]" />
                    <h4 className="text-xs font-bold text-[#24133F]">Attendance Schedule</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="rounded p-1 text-[#756883] hover:text-[#24133F]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {['Day 1 - October 2', 'Day 2 - October 3', 'Day 3 - October 4', 'Day 4 - October 5'].map(
                    (dayLabel) => (
                      <div key={dayLabel} className="rounded-xl border border-[#F1EEF4] p-3">
                        <p className="text-xs font-bold text-[#24133F]">{dayLabel}</p>
                        <div className="mt-2 space-y-2 text-xs">
                          <div className="flex items-center justify-between py-1">
                            <div>
                              <span className="font-semibold text-[#24133F]">Morning</span>
                              <span className="ml-2 text-[11px] text-[#756883]">7:00 AM - 9:00 AM</span>
                            </div>
                            <span className="flex items-center gap-1 text-[11px] text-[#756883]">
                              <MapPin className="h-3 w-3" /> CITE Building
                            </span>
                            <span className="rounded-full bg-[#EBF3FF] px-2 py-0.5 text-[10px] font-bold text-[#3B82F6]">
                              IN and OUT
                            </span>
                            <div className="flex -space-x-1">
                              <span className="h-5 w-5 rounded-full bg-purple-200 border border-white text-[9px] font-bold text-purple-800 flex items-center justify-center">
                                JD
                              </span>
                              <span className="h-5 w-5 rounded-full bg-blue-200 border border-white text-[9px] font-bold text-blue-800 flex items-center justify-center">
                                NK
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <div>
                              <span className="font-semibold text-[#24133F]">Afternoon</span>
                              <span className="ml-2 text-[11px] text-[#756883]">11:00 AM - 12:00 PM</span>
                            </div>
                            <span className="flex items-center gap-1 text-[11px] text-[#756883]">
                              <MapPin className="h-3 w-3" /> CITE Building
                            </span>
                            <span className="rounded-full bg-[#EBF3FF] px-2 py-0.5 text-[10px] font-bold text-[#3B82F6]">
                              IN and OUT
                            </span>
                            <div className="flex -space-x-1">
                              <span className="h-5 w-5 rounded-full bg-purple-200 border border-white text-[9px] font-bold text-purple-800 flex items-center justify-center">
                                JD
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 5: PUBLISH EVENT */
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-[#756883]">Step 5 of 5</p>
                <h3 className="text-lg font-bold text-[#24133F]">Publish Event</h3>
                <p className="text-xs text-[#756883]">
                  Confirm and publish your event. Once published, it will be available for all users.
                </p>
              </div>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5">
                  <p className="text-[10px] text-[#756883]">Event name</p>
                  <p className="mt-1 truncate text-xs font-bold text-[#24133F]">{eventName}</p>
                </div>
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5">
                  <p className="text-[10px] text-[#756883]">Date Range</p>
                  <p className="mt-1 text-xs font-bold text-[#24133F]">October 2 - 5, 2026</p>
                </div>
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5">
                  <p className="text-[10px] text-[#756883]">Duration</p>
                  <p className="mt-1 text-xs font-bold text-[#24133F]">4 days</p>
                </div>
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-3.5">
                  <p className="text-[10px] text-[#756883]">Total Sessions</p>
                  <p className="mt-1 text-xs font-bold text-[#24133F]">12 Sessions</p>
                </div>
              </div>

              {/* Publication Readiness Card */}
              <div className="rounded-2xl border border-[#E5E0EB] bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[#451475]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#24133F]">Publication Readiness</h4>
                    <p className="text-xs text-[#756883]">Make sure all requirements are met before publishing</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {[
                    'Event details and description configured',
                    'Event schedule and dates validated',
                    'Sessions created with designated IN/OUT windows',
                    'Checkpoint locations and admin officers assigned',
                    'No schedule conflicts detected across facilities',
                  ].map((req) => (
                    <div key={req} className="flex items-center gap-2.5 text-xs text-[#24133F]">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-white">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                      <span>{req}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-[#E4F7EB] p-3 text-xs font-bold text-[#16883F] flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Ready to Publish! All required event details are complete. No schedule conflicts detected.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[#F1EEF4] px-6 py-4">
          {isPublished ? (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-[#E5E0EB] px-5 py-2.5 text-xs font-bold text-[#24133F] hover:bg-slate-50 transition-colors"
              >
                Create another
              </button>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-2xl bg-[#451475] px-6 py-2.5 text-xs font-bold text-white shadow-[0_4px_0_0_#2B0C4A] hover:bg-[#38105F] active:translate-y-[2px] active:shadow-none transition-all"
              >
                View Event
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-2xl border border-[#E5E0EB] px-5 py-2.5 text-xs font-bold text-[#24133F] hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-2xl border border-[#E5E0EB] px-5 py-2.5 text-xs font-bold text-[#756883] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              )}

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-2xl bg-[#451475] px-6 py-2.5 text-xs font-bold text-white shadow-[0_4px_0_0_#2B0C4A] hover:bg-[#38105F] active:translate-y-[2px] active:shadow-none transition-all"
                >
                  Next →
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-2xl border border-[#E5E0EB] px-5 py-2.5 text-xs font-bold text-[#24133F] hover:bg-slate-50 transition-colors"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="flex items-center gap-2 rounded-2xl bg-[#451475] px-6 py-2.5 text-xs font-bold text-white shadow-[0_4px_0_0_#2B0C4A] hover:bg-[#38105F] active:translate-y-[2px] active:shadow-none transition-all"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Publish Event
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Edit Time Window Modal */}
      {editingTimeSlot.isOpen && (
        <div
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setEditingTimeSlot((prev) => ({ ...prev, isOpen: false }));
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#170D29]/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-[24px] border border-[#E5E0EB] bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#F1EEF4] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#451475]" />
                <h3 className="text-sm font-bold text-[#24133F]">
                  Edit {editingTimeSlot.sessionType} ({editingTimeSlot.slot}) Window
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTimeSlot((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-lg p-1 text-[#756883] hover:bg-slate-100 hover:text-[#24133F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Dual Start / End Tab Toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F6F4F8] p-1.5 border border-[#E5E0EB]">
                <button
                  type="button"
                  onClick={() => setActiveTimeField('start')}
                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-3 transition-all ${
                    activeTimeField === 'start'
                      ? 'bg-white text-[#451475] shadow-xs font-bold'
                      : 'text-[#756883] hover:text-[#24133F] font-semibold'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">Start Window</span>
                  <span className="text-sm font-bold mt-0.5">
                    {editingTimeSlot.start ? formatSlotTimeWindow(editingTimeSlot.start, editingTimeSlot.start).split('-')[0].trim() : 'Select'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTimeField('end')}
                  className={`flex flex-col items-center justify-center rounded-xl py-2 px-3 transition-all ${
                    activeTimeField === 'end'
                      ? 'bg-white text-[#451475] shadow-xs font-bold'
                      : 'text-[#756883] hover:text-[#24133F] font-semibold'
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider">End Window</span>
                  <span className="text-sm font-bold mt-0.5">
                    {editingTimeSlot.end ? formatSlotTimeWindow(editingTimeSlot.end, editingTimeSlot.end).split('-')[0].trim() : 'Select'}
                  </span>
                </button>
              </div>

              {/* Grid-based TimePicker component (Calendly / Deel style) */}
              <TimePicker
                label={`Select ${activeTimeField === 'start' ? 'Start' : 'End'} Time`}
                value={activeTimeField === 'start' ? editingTimeSlot.start : editingTimeSlot.end}
                onChange={(val) => {
                  if (activeTimeField === 'start') {
                    // Update start time
                    setEditingTimeSlot((prev) => {
                      const next = { ...prev, start: val };
                      // If new start is >= end, auto-advance end by 1.5 hrs
                      if (val >= prev.end) {
                        const [h, m] = val.split(':').map(Number);
                        const totalMinutes = h * 60 + m + 90;
                        const newH = Math.floor(totalMinutes / 60) % 24;
                        const newM = totalMinutes % 60;
                        next.end = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
                      }
                      return next;
                    });
                  } else {
                    // Update end time
                    setEditingTimeSlot((prev) => ({
                      ...prev,
                      end: val,
                    }));
                  }
                }}
              />




            </div>

            {/* Modal actions */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#F1EEF4] pt-3">
              <button
                type="button"
                onClick={() => setEditingTimeSlot((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-xl border border-[#E5E0EB] px-4 py-2 text-xs font-bold text-[#756883] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSlotTime}
                className="rounded-xl bg-[#451475] px-4 py-2 text-xs font-bold text-white hover:bg-[#38105F] transition-colors shadow-xs"
              >
                Save Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Officers Drawer */}
      <AssignOfficersDrawer
        isOpen={drawerConfig.isOpen}
        onClose={() => setDrawerConfig((prev) => ({ ...prev, isOpen: false }))}
        sessionName={`${drawerConfig.sessionType} Session (${drawerConfig.slot})`}
        sessionTime={drawerConfig.sessionTime}
        sessionDate={formatDateDisplay(startDate)}
        initialAssigned={drawerConfig.initialOfficers}
        onSave={handleSaveAssignedOfficers}
      />
    </>,
    document.body
  );
};
