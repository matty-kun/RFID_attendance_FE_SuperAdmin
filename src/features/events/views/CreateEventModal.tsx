import React, { useState } from 'react';
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
  Plus,
} from 'lucide-react';
import { Checkbox } from '../../../components/common/Checkbox';

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
  const [startDate] = useState('2026-10-02');
  const [endDate] = useState('2026-10-05');

  // Step 3 state
  const [selectedDayTab, setSelectedDayTab] = useState<number>(1);
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [afternoonEnabled, setAfternoonEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(false);

  const [morningExpanded, setMorningExpanded] = useState(true);
  const [afternoonExpanded, setAfternoonExpanded] = useState(true);

  if (!isOpen) return null;

  const daysCount = 4; // October 2 to October 5

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
            <div className="mt-6 flex items-center justify-between px-4">
              {stepTitles.map((title, idx) => {
                const stepNum = idx + 1;
                const isComplete = currentStep > stepNum;
                const isActive = currentStep === stepNum;

                return (
                  <div key={title} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          isComplete
                            ? 'bg-[#A855F7] text-white'
                            : isActive
                            ? 'bg-[#A855F7] text-white ring-4 ring-[#A855F7]/20'
                            : 'bg-[#F3E8FF] text-[#A855F7]'
                        }`}
                      >
                        {isComplete ? <Check className="h-4 w-4 stroke-[2.5]" /> : stepNum}
                      </div>
                      <span
                        className={`mt-1.5 whitespace-nowrap text-[11px] font-medium ${
                          isActive || isComplete ? 'font-semibold text-[#24133F]' : 'text-[#756883]'
                        }`}
                      >
                        {title}
                      </span>
                    </div>
                    {idx < stepTitles.length - 1 && (
                      <div
                        className={`mx-2 mb-4 h-[2px] flex-1 transition-colors ${
                          currentStep > stepNum ? 'bg-[#A855F7]' : 'bg-[#E5E0EB]'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
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
                  Set the start and end date for your event. The system will automatically calculate the number of days.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#24133F]">Start Date</label>
                  <div className="mt-1.5 flex items-center justify-between rounded-2xl border border-[#E5E0EB] px-4 py-2.5 text-xs text-[#24133F]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#756883]" />
                      <span>October 2, 2026</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-[#756883]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24133F]">End Date</label>
                  <div className="mt-1.5 flex items-center justify-between rounded-2xl border border-[#E5E0EB] px-4 py-2.5 text-xs text-[#24133F]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#756883]" />
                      <span>October 5, 2026</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-[#756883]" />
                  </div>
                </div>
              </div>

              {/* Calculated Duration Box */}
              <div className="flex items-center gap-4 rounded-2xl bg-[#F6F4F8] p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-[#451475]">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#756883]">Event Duration</p>
                  <p className="text-base font-extrabold text-[#24133F]">4 days</p>
                  <p className="text-[11px] text-[#756883]">From October 2, 2026 to October 5, 2026</p>
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
              {morningEnabled && (
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#24133F]">Morning Session</span>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#756883]">
                        Both (IN + OUT)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#EBF3FF] px-2.5 py-0.5 text-[10px] font-bold text-[#3B82F6]">
                        Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => setMorningExpanded(!morningExpanded)}
                        className="rounded p-1 text-[#756883]"
                      >
                        {morningExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {morningExpanded && (
                    <div className="mt-3 space-y-3 pt-2">
                      <p className="text-[11px] font-semibold text-[#756883]">Location (2)</p>

                      {/* Row 1: CITE Building */}
                      <div className="rounded-xl border border-[#F1EEF4] p-3">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#24133F]">
                          <MapPin className="h-3.5 w-3.5 text-[#756883]" />
                          <span>CITE Building</span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              IN
                            </span>
                            <span className="rounded-lg border border-[#E5E0EB] px-2.5 py-1 text-[11px]">
                              7:00 - 8:30 AM
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#756883]">
                              Nonoy Kaibo
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-semibold text-[#3B82F6]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                              OUT
                            </span>
                            <span className="rounded-lg border border-[#E5E0EB] px-2.5 py-1 text-[11px]">
                              12:00 - 1:30 PM
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#756883]">
                              Nonoy Kaibo
                            </span>
                            <button type="button" className="rounded-full border border-dashed border-[#756883] p-0.5 text-[#756883]">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: JBB Building */}
                      <div className="rounded-xl border border-[#F1EEF4] p-3">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#24133F]">
                          <MapPin className="h-3.5 w-3.5 text-[#756883]" />
                          <span>JBB Building</span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              IN
                            </span>
                            <span className="rounded-lg border border-[#E5E0EB] px-2.5 py-1 text-[11px]">
                              7:00 - 8:30 AM
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#756883]">
                              Nonoy Kaibo
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 font-semibold text-[#3B82F6]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                              OUT
                            </span>
                            <span className="rounded-lg border border-[#E5E0EB] px-2.5 py-1 text-[11px]">
                              12:00 - 1:30 PM
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#756883]">
                              Nonoy Kaibo
                            </span>
                            <button type="button" className="rounded-full border border-dashed border-[#756883] p-0.5 text-[#756883]">
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-bold text-[#451475] hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add location
                      </button>
                    </div>
                  )}
                </div>
              )}

              {afternoonEnabled && (
                <div className="rounded-2xl border border-[#E5E0EB] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#24133F]">Afternoon Session</span>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#756883]">
                        IN ONLY
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAfternoonExpanded(!afternoonExpanded)}
                      className="rounded p-1 text-[#756883]"
                    >
                      {afternoonExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {afternoonExpanded && (
                    <div className="mt-3 space-y-3 pt-2">
                      <p className="text-[11px] font-semibold text-[#756883]">Location (1)</p>
                      <div className="rounded-xl border border-[#F1EEF4] p-3">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#24133F]">
                          <MapPin className="h-3.5 w-3.5 text-[#756883]" />
                          <span>CITE Building</span>
                        </div>
                        <div className="mt-2.5 flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 font-semibold text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            IN
                          </span>
                          <span className="rounded-lg border border-[#E5E0EB] px-2.5 py-1 text-[11px]">
                            7:00 - 8:30 AM
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-[#756883]">
                            Nonoy Kaibo
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1.5 text-xs font-bold text-[#451475] hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add location
                      </button>
                    </div>
                  )}
                </div>
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
    </div>,
    document.body
  );
};
