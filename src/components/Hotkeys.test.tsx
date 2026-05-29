import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Hotkeys } from './Hotkeys';

describe('Hotkeys', () => {
  it('ignores keys while a text input is focused', async () => {
    const u = userEvent.setup();
    const onHelp = vi.fn();
    render(<><input data-testid="in" /><Hotkeys onHelp={onHelp} /></>);
    (document.querySelector('[data-testid=in]') as HTMLInputElement).focus();
    await u.keyboard('h');
    expect(onHelp).not.toHaveBeenCalled();
  });
  it('fires onHelp when focus is on the body', async () => {
    const u = userEvent.setup();
    const onHelp = vi.fn();
    render(<Hotkeys onHelp={onHelp} />);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    await u.keyboard('h');
    expect(onHelp).toHaveBeenCalled();
  });
});
