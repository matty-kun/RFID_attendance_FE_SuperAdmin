import { describe, it, expect } from 'vitest';

interface MockAcademicTerm {
  id: string;
  school_year: string;
  semester: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface MockEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

const terms: MockAcademicTerm[] = [
  {
    id: 'term-sem1',
    school_year: '2026-2027',
    semester: '1st Sem',
    start_date: '2026-08-01',
    end_date: '2026-10-31',
    is_active: false,
  },
  {
    id: 'term-sem2',
    school_year: '2026-2027',
    semester: '2nd Sem',
    start_date: '2026-11-01',
    end_date: '2027-04-30',
    is_active: true,
  },
];

const events: MockEvent[] = [
  {
    id: 'ev-1',
    name: 'Freshmen Orientation (Sem 1)',
    start_date: '2026-08-15',
    end_date: '2026-08-16',
  },
  {
    id: 'ev-2',
    name: 'Midterm Exams (Sem 1)',
    start_date: '2026-10-10',
    end_date: '2026-10-12',
  },
  {
    id: 'ev-3',
    name: 'Intramurals (Sem 2)',
    start_date: '2026-11-20',
    end_date: '2026-11-25',
  },
  {
    id: 'ev-4',
    name: 'University Week (Sem 2)',
    start_date: '2027-02-10',
    end_date: '2027-02-14',
  },
];

const toYmd = (val?: string | null) => (val ? val.substring(0, 10) : '');

function filterEventsByTerm(
  eventsList: MockEvent[],
  academicTermFilter: string,
  termList: MockAcademicTerm[]
) {
  return eventsList.filter((ev) => {
    if (academicTermFilter === 'all') return true;

    const targetTerm = termList.find((t) => t.id === academicTermFilter);
    if (targetTerm?.start_date && targetTerm?.end_date) {
      const termStart = toYmd(targetTerm.start_date);
      const termEnd = toYmd(targetTerm.end_date);
      const evStart = toYmd(ev.start_date);
      const evEnd = toYmd(ev.end_date || ev.start_date);

      if (evStart > termEnd || evEnd < termStart) {
        return false;
      }
    }
    return true;
  });
}

function resolveEventAcademicTerm(
  startDate: string,
  endDate: string | undefined,
  termList: MockAcademicTerm[]
) {
  const evStart = toYmd(startDate);
  const evEnd = toYmd(endDate || startDate);
  return termList.find((t) => {
    if (!t.start_date || !t.end_date) return false;
    const tStart = toYmd(t.start_date);
    const tEnd = toYmd(t.end_date);
    return !(evStart > tEnd || evEnd < tStart);
  });
}

describe('Academic Term Filtering Consistency across Pages', () => {
  it('filters events strictly within 1st Sem date window', () => {
    const sem1Events = filterEventsByTerm(events, 'term-sem1', terms);
    expect(sem1Events.map((e) => e.name)).toEqual([
      'Freshmen Orientation (Sem 1)',
      'Midterm Exams (Sem 1)',
    ]);
  });

  it('filters events strictly within 2nd Sem date window', () => {
    const sem2Events = filterEventsByTerm(events, 'term-sem2', terms);
    expect(sem2Events.map((e) => e.name)).toEqual([
      'Intramurals (Sem 2)',
      'University Week (Sem 2)',
    ]);
  });

  it('returns all events when academicTermFilter is "all"', () => {
    const allEvents = filterEventsByTerm(events, 'all', terms);
    expect(allEvents).toHaveLength(4);
  });

  it('correctly maps each event to its corresponding academic semester', () => {
    const term1 = resolveEventAcademicTerm('2026-08-15', '2026-08-16', terms);
    expect(term1?.semester).toBe('1st Sem');
    expect(term1?.school_year).toBe('2026-2027');

    const term2 = resolveEventAcademicTerm('2026-11-20', '2026-11-25', terms);
    expect(term2?.semester).toBe('2nd Sem');
    expect(term2?.school_year).toBe('2026-2027');
  });

  it('handles multi-day events that cross or touch term boundaries', () => {
    const spanningEvent: MockEvent = {
      id: 'ev-span',
      name: 'Sem Break Transition Camp',
      start_date: '2026-10-30',
      end_date: '2026-11-03',
    };
    // Should overlap both 1st Sem (ends Oct 31) and 2nd Sem (starts Nov 1)
    const sem1Overlap = filterEventsByTerm([spanningEvent], 'term-sem1', terms);
    const sem2Overlap = filterEventsByTerm([spanningEvent], 'term-sem2', terms);

    expect(sem1Overlap).toHaveLength(1);
    expect(sem2Overlap).toHaveLength(1);
  });
});
