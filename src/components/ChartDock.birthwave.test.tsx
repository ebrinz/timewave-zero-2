import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartProvider } from '@/state/ChartProvider';
import { BirthwaveProvider } from '@/state/BirthwaveProvider';
import { ChartDock } from './ChartDock';

const wrap = (ui: React.ReactNode) => (
  <BirthwaveProvider><ChartProvider layers={[]}>{ui}</ChartProvider></BirthwaveProvider>
);

beforeEach(() => localStorage.clear());

describe('ChartDock birthwave controls', () => {
  it('shows the BIRTHWAVE control and opens the picker when no birthday is set', async () => {
    render(wrap(<ChartDock />));
    expect(screen.getByText('Birthwave')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /BIRTHDATE/i }));
    expect(screen.getByRole('dialog', { name: 'Birthdate' })).toBeTruthy();
  });
});
