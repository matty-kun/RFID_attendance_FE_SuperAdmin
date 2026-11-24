// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from '../src/components/common/ExportButton';

describe('ExportButton with custom label & export indicator', () => {
  it('renders default Export label when no label is provided', () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} />);
    expect(screen.getByRole('button', { name: /^export$/i })).toBeDefined();
  });

  it('renders custom label with selected count indicator', () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} label="Export Selected (12)" />);
    expect(screen.getByText('Export Selected (12)')).toBeDefined();
  });

  it('triggers onExport with defaultFormat xlsx when clicked', () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} label="Export Selected (5)" />);
    const button = screen.getByText('Export Selected (5)');
    fireEvent.click(button);
    expect(onExport).toHaveBeenCalledWith('xlsx');
  });
});
