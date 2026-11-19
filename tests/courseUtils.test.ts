// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeCourse,
  areCoursesEqual,
  getCourseAbbreviation,
  getAllKnownCourses,
  saveCustomCourse,
} from '../src/utils/courseUtils';

describe('courseUtils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes common course abbreviations into canonical names', () => {
    expect(normalizeCourse('BSIT')).toBe('BS Information Technology');
    expect(normalizeCourse('bsit')).toBe('BS Information Technology');
    expect(normalizeCourse('bs-it')).toBe('BS Information Technology');
    expect(normalizeCourse('CS')).toBe('BS Computer Science');
    expect(normalizeCourse('BSCS')).toBe('BS Computer Science');
    expect(normalizeCourse('BSCPE')).toBe('BS Computer Engineering');
    expect(normalizeCourse('BSBA')).toBe('BS Business Administration');
  });

  it('preserves and trims unrecognized or custom courses', () => {
    expect(normalizeCourse('  BS Marine Transportation  ')).toBe('BS Marine Transportation');
    expect(normalizeCourse('')).toBe('');
  });

  it('correctly compares courses taking aliases into account', () => {
    expect(areCoursesEqual('BSIT', 'BS Information Technology')).toBe(true);
    expect(areCoursesEqual('bs-it', 'BS Information Technology')).toBe(true);
    expect(areCoursesEqual('BSCS', 'BS Computer Science')).toBe(true);
    expect(areCoursesEqual('BSIT', 'BSCS')).toBe(false);
  });

  it('computes course abbreviations properly', () => {
    expect(getCourseAbbreviation('BS Information Technology')).toBe('BSIT');
    expect(getCourseAbbreviation('BS Computer Science')).toBe('BSCS');
  });

  it('contains only College of Information Technology courses by default', () => {
    const all = getAllKnownCourses();
    expect(all).toContain('BS Information Technology');
    expect(all).toContain('BS Computer Science');
    expect(all).toContain('BS Information Systems');
    expect(all).toContain('BS Computer Engineering');
    expect(all).toContain('BS Electronics Engineering');
    expect(all).not.toContain('BS Nursing');
    expect(all).not.toContain('BS Criminology');
    expect(all).not.toContain('BS Business Administration');
    expect(all).not.toContain('BS Entertainment and Multimedia Computing');
    expect(all).toHaveLength(5);
  });

  it('allows saving and retrieving custom courses', () => {
    saveCustomCourse('BS Architecture');
    const all = getAllKnownCourses();
    expect(all).toContain('BS Architecture');
  });
});
