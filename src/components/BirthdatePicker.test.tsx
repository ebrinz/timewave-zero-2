import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BirthdatePicker } from './BirthdatePicker';

describe('BirthdatePicker', () => {
  it('clamps the day when stepping into a shorter month, and SET emits the clamped date', async () => {
    const onSet = vi.fn();
    render(<BirthdatePicker initial="1990-01-31" onSet={onSet} onClose={() => {}} />);
    // Jan 31 shown.
    expect(screen.getByTestId('bp-day').textContent).toBe('31');
    // Step month forward: Jan -> Feb 1990 (28 days) clamps the day to 28.
    await userEvent.click(screen.getByLabelText('Next month'));
    expect(screen.getByTestId('bp-month').textContent).toBe('Feb');
    expect(screen.getByTestId('bp-day').textContent).toBe('28');
    // SET emits the clamped date.
    await userEvent.click(screen.getByRole('button', { name: 'SET' }));
    expect(onSet).toHaveBeenCalledWith('1990-02-28');
  });
});
