import { WAVE_VARIANT } from '@/chart/timewave';
import type { EventsData } from '@/chart/events';

/**
 * Fetch public/data/events.json (raw fetch is NOT auto-prefixed under basePath, so
 * include the env prefix). Returns null on 404 (expected before the pipeline runs)
 * or on a wave_variant mismatch (logged) — a null-data layer draws nothing.
 */
export async function loadEvents(): Promise<EventsData | null> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const res = await fetch(`${base}/data/events.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as EventsData;
    if (json.wave_variant !== WAVE_VARIANT) {
      console.error(`events.json wave_variant "${json.wave_variant}" != "${WAVE_VARIANT}"; ignoring`);
      return null;
    }
    return json;
  } catch {
    return null;
  }
}
