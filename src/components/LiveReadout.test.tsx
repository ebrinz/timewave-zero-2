import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveReadout } from './LiveReadout';
import { ChartProvider } from '@/state/ChartProvider';

describe('LiveReadout', () => {
  it('is empty with no hover', () => {
    render(<ChartProvider layers={[]}><LiveReadout /></ChartProvider>);
    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
