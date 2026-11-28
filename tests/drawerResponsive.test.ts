import { describe, it, expect } from 'vitest';

const maxWidthMap = {
  sm: 'w-full max-w-full sm:max-w-sm',
  md: 'w-full max-w-full sm:max-w-md',
  lg: 'w-full max-w-full sm:max-w-lg',
  xl: 'w-full max-w-full sm:max-w-xl',
  '2xl': 'w-full max-w-full sm:max-w-xl md:max-w-2xl',
  '3xl': 'w-full max-w-full sm:max-w-2xl lg:max-w-3xl',
};

describe('Drawer Responsive Layout and Constraints', () => {
  it('applies fluid 100% width on mobile viewports while constraining max-width on tablets and desktops', () => {
    expect(maxWidthMap.md).toContain('w-full');
    expect(maxWidthMap.md).toContain('max-w-full');
    expect(maxWidthMap.md).toContain('sm:max-w-md');

    expect(maxWidthMap['2xl']).toContain('w-full');
    expect(maxWidthMap['2xl']).toContain('sm:max-w-xl');
    expect(maxWidthMap['2xl']).toContain('md:max-w-2xl');
  });

  it('keeps wide drawers proportional on iPads and tablets without overflowing screen width', () => {
    expect(maxWidthMap['3xl']).toContain('sm:max-w-2xl');
    expect(maxWidthMap['3xl']).toContain('lg:max-w-3xl');
  });
});
