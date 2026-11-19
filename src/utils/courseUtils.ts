export const DEFAULT_COURSES: string[] = [
  'BS Information Technology',
  'BS Computer Science',
  'BS Information Systems',
  'BS Computer Engineering',
  'BS Electronics Engineering',
];

export const COURSE_ALIAS_MAP: Record<string, string> = {
  BSIT: 'BS Information Technology',
  IT: 'BS Information Technology',
  'BS-IT': 'BS Information Technology',
  INFOTECH: 'BS Information Technology',
  'INFO TECH': 'BS Information Technology',
  'INFORMATION TECHNOLOGY': 'BS Information Technology',

  BSCS: 'BS Computer Science',
  CS: 'BS Computer Science',
  'BS-CS': 'BS Computer Science',
  'COMPUTER SCIENCE': 'BS Computer Science',

  BSIS: 'BS Information Systems',
  IS: 'BS Information Systems',
  'BS-IS': 'BS Information Systems',
  'INFORMATION SYSTEMS': 'BS Information Systems',

  BSCPE: 'BS Computer Engineering',
  CPE: 'BS Computer Engineering',
  'BS-CPE': 'BS Computer Engineering',
  'COMPUTER ENGINEERING': 'BS Computer Engineering',

  BSEMC: 'BS Entertainment and Multimedia Computing',
  EMC: 'BS Entertainment and Multimedia Computing',
  'BS-EMC': 'BS Entertainment and Multimedia Computing',
  'MULTIMEDIA COMPUTING': 'BS Entertainment and Multimedia Computing',

  BSECE: 'BS Electronics Engineering',
  ECE: 'BS Electronics Engineering',
  'BS-ECE': 'BS Electronics Engineering',
  'ELECTRONICS ENGINEERING': 'BS Electronics Engineering',

  BSBA: 'BS Business Administration',
  BA: 'BS Business Administration',
  'BS-BA': 'BS Business Administration',
  'BUSINESS ADMINISTRATION': 'BS Business Administration',

  BSHM: 'BS Hospitality Management',
  HM: 'BS Hospitality Management',
  HRM: 'BS Hospitality Management',
  'HOSPITALITY MANAGEMENT': 'BS Hospitality Management',

  BSTM: 'BS Tourism Management',
  TM: 'BS Tourism Management',
  'TOURISM MANAGEMENT': 'BS Tourism Management',

  BSN: 'BS Nursing',
  NURSING: 'BS Nursing',

  BSCRIM: 'BS Criminology',
  CRIM: 'BS Criminology',
  CRIMINOLOGY: 'BS Criminology',

  BSED: 'Bachelor of Secondary Education',
  'BS EDUCATION': 'Bachelor of Secondary Education',
  'SECONDARY EDUCATION': 'Bachelor of Secondary Education',

  BEED: 'Bachelor of Elementary Education',
  'ELEMENTARY EDUCATION': 'Bachelor of Elementary Education',

  BSA: 'BS Accountancy',
  ACCOUNTANCY: 'BS Accountancy',

  BSP: 'BS Psychology',
  PSYCHOLOGY: 'BS Psychology',
};

const ABBR_MAP: Record<string, string> = {
  'BS Information Technology': 'BSIT',
  'BS Computer Science': 'BSCS',
  'BS Information Systems': 'BSIS',
  'BS Computer Engineering': 'BSCPE',
  'BS Electronics Engineering': 'BSECE',
  'BS Business Administration': 'BSBA',
  'BS Accountancy': 'BSA',
  'BS Hospitality Management': 'BSHM',
  'BS Tourism Management': 'BSTM',
  'BS Nursing': 'BSN',
  'BS Criminology': 'BSCRIM',
  'BS Psychology': 'BSP',
  'Bachelor of Secondary Education': 'BSEd',
  'Bachelor of Elementary Education': 'BEEd',
};

const CUSTOM_COURSES_STORAGE_KEY = 'rfid_custom_courses';

export function getCustomCourses(): string[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_COURSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomCourse(courseName: string): void {
  const normalized = normalizeCourse(courseName);
  if (!normalized) return;
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const existing = getCustomCourses();
    const set = new Set(existing.map((c) => normalizeCourse(c)));
    if (!set.has(normalized)) {
      const updated = [...existing, normalized];
      localStorage.setItem(CUSTOM_COURSES_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // ignore local storage errors
  }
}

export function normalizeCourse(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const cleanKey = trimmed.toUpperCase().replace(/[\s_.-]+/g, '');
  if (COURSE_ALIAS_MAP[cleanKey]) {
    return COURSE_ALIAS_MAP[cleanKey];
  }

  // Also check original uppercase in case of spaces
  const upper = trimmed.toUpperCase();
  if (COURSE_ALIAS_MAP[upper]) {
    return COURSE_ALIAS_MAP[upper];
  }

  return trimmed;
}

export function getCourseAbbreviation(courseName: string): string {
  const normalized = normalizeCourse(courseName);
  if (ABBR_MAP[normalized]) return ABBR_MAP[normalized];
  // Auto-generate abbreviation if not in map
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return normalized.slice(0, 5).toUpperCase();
  return words.map((w) => w[0].toUpperCase()).join('');
}

export function areCoursesEqual(courseA: string | null | undefined, courseB: string | null | undefined): boolean {
  if (!courseA && !courseB) return true;
  if (!courseA || !courseB) return false;
  const normA = normalizeCourse(courseA).toLowerCase();
  const normB = normalizeCourse(courseB).toLowerCase();
  if (normA === normB) return true;

  // Check if abbreviation matches
  const abbrA = getCourseAbbreviation(courseA).toLowerCase();
  const abbrB = getCourseAbbreviation(courseB).toLowerCase();
  return abbrA === abbrB || abbrA === normB || abbrB === normA;
}

export function getAllKnownCourses(extraCourses: string[] = []): string[] {
  const custom = getCustomCourses();
  const combined = [...DEFAULT_COURSES, ...custom, ...extraCourses];
  const uniqueMap = new Map<string, string>();

  combined.forEach((item) => {
    const norm = normalizeCourse(item);
    if (norm && !uniqueMap.has(norm.toLowerCase())) {
      uniqueMap.set(norm.toLowerCase(), norm);
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
}
