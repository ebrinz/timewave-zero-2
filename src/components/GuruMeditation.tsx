'use client';
import { useEffect } from 'react';

/**
 * Easter-egg "Guru Meditation" requester — the Amiga's iconic crash screen
 * (black box, flashing red border), repurposed as a period-accurate virus-scare
 * gag crossed with McKenna / Timewave Zero lore. Fired only by the otherwise-
 * decorative window chrome gadgets (close / resize). Purely cosmetic.
 */
export interface Guru { head: string; body: string; code: string }

export const GURUS: readonly Guru[] = [
  { head: 'YOUR AMIGA IS NOW STONED!', body: '…and is receiving transmissions from hyperspace. Legalise novelty.', code: '1987.0420.THC' },
  { head: 'VIRUS DETECTED: BRAINWORM.LOGOS', body: 'A self-transforming machine elf is now resident in your hippocampus. It is trying to tell you something.', code: '2012.1221.ELF' },
  { head: 'TIMEWAVE OVERFLOW AT $2012', body: 'Novelty buffer overrun. The universe is running out of time to complete its work.', code: '0000.0000.EOT' },
  { head: 'MICHELANGELO RESONANCE DETECTED', body: 'System will achieve eschaton on 21 DEC. Please back up your DNA before continuing.', code: '1992.0306.DOS' },
  { head: 'THE MUSHROOM SPEAKS', body: '"I will show you how deep the timewave goes. You are not stuck in traffic. You ARE traffic."', code: '0000.0006.LOGOS' },
  { head: 'CANNOT CLOSE WINDOW', body: 'There is no exit from the Transcendental Object at the End of History. Nature loves courage.', code: 'EXIT.DENIED.404' },
  { head: 'CULTURE IS NOT YOUR FRIEND', body: 'Neither is this operating system. Press left mouse button to continue.', code: '1971.LASCAUX.0' },
  { head: 'WARNING: HABIT.SYS CORRUPTED', body: 'Ingression of novelty imminent. The King Wen sequence has been weaponised.', code: '0064.0384.ICHING' },
] as const;

/** Pick a random gag. Call at click time (never during render) to stay SSR-safe. */
export const pickGuru = (): Guru => GURUS[Math.floor(Math.random() * GURUS.length)];

export function GuruMeditation({ guru, onClose }: { guru: Guru; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="System failure"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 cursor-pointer"
      onClick={onClose}
    >
      <div className="guru" onClick={(e) => e.stopPropagation()}>
        <p className="font-bold">SOFTWARE FAILURE.&nbsp;&nbsp;PRESS LEFT MOUSE BUTTON TO CONTINUE.</p>
        <p className="guru-head">{guru.head}</p>
        <p className="my-2">{guru.body}</p>
        <p>Guru Meditation #{guru.code}</p>
        <button type="button" className="mt-3 underline" onClick={onClose}>[ Continue ]</button>
      </div>
    </div>
  );
}
