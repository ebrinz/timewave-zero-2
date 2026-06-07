import { describe, it, expect } from 'vitest';
import { classifyWave, waveState, waveBadge } from '@/chart/oracle/wave';

describe('classifyWave', () => {
  it('low value = ingression (high novelty); high = entrenchment (habit)', () => {
    expect(classifyWave(0, 0, 10, 0).tendency).toBe('ingression');
    expect(classifyWave(10, 0, 10, 10).tendency).toBe('entrenchment');
    expect(classifyWave(5, 0, 10, 5).tendency).toBe('transition');
  });
  it('falling toward the future = deepening; rising = returning; flat = steady', () => {
    expect(classifyWave(5, 0, 10, 1).trend).toBe('deepening');   // ahead < value
    expect(classifyWave(5, 0, 10, 9).trend).toBe('returning');   // ahead > value
    expect(classifyWave(5, 0, 10, 5).trend).toBe('steady');
  });
});

describe('waveState / waveBadge', () => {
  it('at the zero point novelty is the global minimum → ingression', () => {
    const ws = waveState(0, { tLeft: 5000, tRight: -5000 });
    expect(ws.tendency).toBe('ingression');
  });
  it('badge has an arrow and a label', () => {
    expect(waveBadge(classifyWave(0, 0, 10, 1))).toMatch(/[▼▲■]\s+\w+/);
  });
});
