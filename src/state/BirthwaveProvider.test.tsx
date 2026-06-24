import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BirthwaveProvider, useBirthwave } from './BirthwaveProvider';

let api: ReturnType<typeof useBirthwave>;
function Probe() {
  api = useBirthwave();
  return <div data-testid="offset">{String(api.offset)}</div>;
}

beforeEach(() => localStorage.clear());

describe('BirthwaveProvider', () => {
  it('defaults to birthwave off with a null offset', async () => {
    render(<BirthwaveProvider><Probe /></BirthwaveProvider>);
    expect(api.birthwave).toBe(false);
    expect(screen.getByTestId('offset').textContent).toBe('null');
  });

  it('setBirthday enables birthwave, derives an offset, and persists', async () => {
    render(<BirthwaveProvider><Probe /></BirthwaveProvider>);
    await act(async () => { api.setBirthday('1987-06-23'); });
    expect(api.birthwave).toBe(true);
    expect(typeof api.offset).toBe('number');
    expect(JSON.parse(localStorage.getItem('twz.birthwave')!).birthday).toBe('1987-06-23');
  });
});
