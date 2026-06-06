/** A point in canvas pixel space (offset coordinates). */
export interface Pt { x: number; y: number; }

/** Euclidean distance between two pointers — drives the pinch zoom ratio. */
export const distance = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Midpoint of two pointers — the anchor a pinch zooms around. */
export const midpoint = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Max finger travel (px) a one-finger press may have and still count as a tap. */
export const TAP_MOVE_PX = 6;

/** True when a press moved little enough to read as a tap rather than a pan. */
export const isTap = (totalMove: number, threshold = TAP_MOVE_PX): boolean =>
  totalMove <= threshold;
