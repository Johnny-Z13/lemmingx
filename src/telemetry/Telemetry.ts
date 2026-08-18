export type FunnelEventName =
  | 'load_started'
  | 'first_frame'
  | 'first_input'
  | 'first_chain_reaction'
  | 'first_reward'
  | 'active_60s'
  | 'active_90s'
  | 'site_start'
  | 'site_complete'
  | 'site_fail'
  | 'site_retry'
  | 'tool_assigned'
  | 'tool_invalid'
  | 'route_choice'
  | 'first_expedition_complete'
  | 'second_expedition_started'
  | 'first_project_purchased'
  | 'storage_status'
  | 'quality_step_down'
  | 'long_frame'
  | 'renderer_context_lost'
  | 'renderer_context_restored'
  | 'ad_offer'
  | 'ad_accept'
  | 'ad_started'
  | 'ad_complete'
  | 'ad_error'
  | 'session_end'
  | 'return_session';

export interface FunnelEvent {
  name: FunnelEventName;
  atMs: number;
  data?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface TelemetrySink {
  send(events: readonly FunnelEvent[]): Promise<void> | void;
}

/** Small no-PII queue; production delivery remains replaceable and opt-in. */
export class Telemetry {
  private readonly queue: FunnelEvent[] = [];
  private sink: TelemetrySink | null = null;
  private readonly emittedOnce = new Set<FunnelEventName>();

  emit(name: FunnelEventName, data?: FunnelEvent['data']): void {
    this.queue.push({ name, atMs: Math.round(performance.now()), data });
    if (this.queue.length > 256) this.queue.shift();
  }

  emitOnce(name: FunnelEventName, data?: FunnelEvent['data']): boolean {
    if (this.emittedOnce.has(name)) return false;
    this.emittedOnce.add(name);
    this.emit(name, data);
    return true;
  }

  attachSink(sink: TelemetrySink): void {
    this.sink = sink;
    void this.flush();
  }

  snapshot(): readonly FunnelEvent[] {
    return this.queue.map((event) => ({ ...event, data: event.data ? { ...event.data } : undefined }));
  }

  async flush(): Promise<void> {
    if (!this.sink || this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.queue.length);
    try {
      await this.sink.send(batch);
    } catch {
      this.queue.unshift(...batch.slice(-256));
    }
  }
}

export const telemetry = new Telemetry();
