import { describe, expect, it, vi } from 'vitest';
import { Telemetry } from '../src/telemetry/Telemetry';

describe('Telemetry', () => {
  it('deduplicates funnel milestones and flushes a bounded no-PII batch', async () => {
    const telemetry = new Telemetry();
    expect(telemetry.emitOnce('first_frame', { site: 1 })).toBe(true);
    expect(telemetry.emitOnce('first_frame', { site: 2 })).toBe(false);
    telemetry.emit('tool_assigned', { site: 1, tool: 'basher' });

    const send = vi.fn();
    telemetry.attachSink({ send });
    await telemetry.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].map((event: { name: string }) => event.name)).toEqual([
      'first_frame',
      'tool_assigned',
    ]);
    expect(telemetry.snapshot()).toEqual([]);
  });
});
