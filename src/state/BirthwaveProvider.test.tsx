import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BirthwaveProvider, useBirthwave } from './BirthwaveProvider';

// Surface the context through the DOM (not a captured outer variable) so the probe
// stays a pure render and satisfies react-hooks/globals.
function Probe() {
  const { birthwave, offset, setBirthday } = useBirthwave();
  return (
    <div>
      <div data-testid="birthwave">{String(birthwave)}</div>
      <div data-testid="offset">{String(offset)}</div>
      <button onClick={() => setBirthday('1987-06-23')}>set-birthday</button>
    </div>
  );
}

beforeEach(() => localStorage.clear());

describe('BirthwaveProvider', () => {
  it('defaults to birthwave off with a null offset', () => {
    render(<BirthwaveProvider><Probe /></BirthwaveProvider>);
    expect(screen.getByTestId('birthwave').textContent).toBe('false');
    expect(screen.getByTestId('offset').textContent).toBe('null');
  });

  it('setBirthday enables birthwave, derives an offset, and persists', async () => {
    render(<BirthwaveProvider><Probe /></BirthwaveProvider>);
    await userEvent.click(screen.getByText('set-birthday'));
    expect(screen.getByTestId('birthwave').textContent).toBe('true');
    const offsetText = screen.getByTestId('offset').textContent!;
    expect(offsetText).not.toBe('null');
    expect(Number.isNaN(Number(offsetText))).toBe(false);
    expect(JSON.parse(localStorage.getItem('twz.birthwave')!).birthday).toBe('1987-06-23');
  });
});
