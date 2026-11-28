// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AcademicTermHeaderSelector } from '../src/components/academic-terms/AcademicTermHeaderSelector';
import { AcademicTermProvider } from '../src/context/AcademicTermContext';

describe('AcademicTermHeaderSelector Chevron Hover Styling', () => {
  it('renders chevron with opacity-0 by default and group-hover:opacity-100', () => {
    const { container } = render(
      <AcademicTermProvider>
        <AcademicTermHeaderSelector />
      </AcademicTermProvider>
    );

    const button = screen.getByRole('button', { name: /2026-2027/i });
    expect(button.className).toContain('group');

    const svg = container.querySelector('svg.lucide-chevron-down');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('class')).toContain('opacity-0');
    expect(svg?.getAttribute('class')).toContain('group-hover:opacity-100');
  });
});
