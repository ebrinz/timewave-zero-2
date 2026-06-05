import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkbenchWindow } from './WorkbenchWindow';

describe('WorkbenchWindow', () => {
  it('chrome gadgets are inert by default (no easter egg)', () => {
    render(<WorkbenchWindow title="X">body</WorkbenchWindow>);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('prankGadgets: clicking a chrome gadget pops a Guru Meditation', async () => {
    const u = userEvent.setup();
    render(<WorkbenchWindow title="X" prankGadgets>body</WorkbenchWindow>);
    await u.click(screen.getByRole('button', { name: /close/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/Guru Meditation #/i);
  });

  it('prankGadgets: the Guru Meditation is dismissable', async () => {
    const u = userEvent.setup();
    render(<WorkbenchWindow title="X" prankGadgets>body</WorkbenchWindow>);
    await u.click(screen.getByRole('button', { name: /resize/i }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /continue/i }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('without prank, the close gadget calls onClose', async () => {
    const u = userEvent.setup();
    const onClose = vi.fn();
    render(<WorkbenchWindow title="X" onClose={onClose}>body</WorkbenchWindow>);
    await u.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
