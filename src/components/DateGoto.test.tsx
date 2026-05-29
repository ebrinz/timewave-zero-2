import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateGoto } from './DateGoto';
import { ChartProvider } from '@/state/ChartProvider';

const wrap = (ui: React.ReactNode) => <ChartProvider layers={[]}>{ui}</ChartProvider>;

describe('DateGoto', () => {
  it('shows an inline error for an unparseable date and stays open', async () => {
    const u = userEvent.setup();
    const onClose = vi.fn();
    render(wrap(<DateGoto onClose={onClose} />));
    await u.type(screen.getByRole('textbox'), 'not a date');
    await u.click(screen.getByRole('button', { name: /go/i }));
    expect(screen.getByText(/unrecognized date/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
  it('closes after a valid date', async () => {
    const u = userEvent.setup();
    const onClose = vi.fn();
    render(wrap(<DateGoto onClose={onClose} />));
    await u.type(screen.getByRole('textbox'), '1969-07-20');
    await u.click(screen.getByRole('button', { name: /^\[ go \]$/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
