<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import Icon from '$lib/components/ui/Icon.svelte';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const sizePreset = $derived(
    layoutW >= 4 && layoutH >= 3 ? 'xl' :
    layoutW >= 3 && layoutH >= 2 ? 'lg' :
    layoutW >= 2 || layoutH >= 2 ? 'md' :
    'sm'
  );
  
  const state = $derived(entity?.state ?? 'unknown');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Weather');
  const temp = $derived(attrs.temperature as number | undefined);
  const tempUnit = '°';
  const humidity = $derived(attrs.humidity as number | undefined);
  const windSpeed = $derived(attrs.wind_speed as number | undefined);
  const windUnit = $derived(attrs.wind_speed_unit as string ?? 'km/h');

  interface ForecastDay { datetime: string; temperature: number; templow?: number; condition: string; }
  const forecastArray = $derived(((attrs.forecast as unknown[]) ?? []) as ForecastDay[]);
  
  // Find today's forecast for the Hi/Low hero. If not found, fallback to first entry.
  const todayForecast = $derived(
    forecastArray.find(d => new Date(d.datetime).toDateString() === new Date().toDateString()) || 
    forecastArray[0]
  );
  
  // The forecast strip should show 5 days starting from the first available.
  const forecastDays = $derived(forecastArray.slice(0, 5));

  function conditionIcon(c: string): string {
    const map: Record<string,string> = { 
      'clear-night':'moon', sunny:'sun', partlycloudy:'cloud-sun', cloudy:'cloud', 
      fog:'cloud-fog', rainy:'cloud-rain', snowy:'cloud-snow', 'snowy-rainy':'cloud-snow',
      windy:'wind', hail:'cloud-rain', lightning:'zap', 'lightning-rainy':'cloud-lightning',
      pouring:'cloud-drizzle', exceptional:'alert-triangle' 
    };
    return map[c] ?? 'cloud';
  }
  
  function conditionColor(c: string): string {
    if (c === 'sunny' || c === 'clear-night') return 'var(--color-warning)';
    if (c.includes('rain') || c.includes('snow') || c === 'pouring') return 'var(--color-info)';
    if (c === 'lightning' || c.includes('lightning')) return 'var(--color-warning)';
    return 'var(--fg-muted)';
  }
  
  function dayLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    
    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
</script>

<div class="weather-tile size-{sizePreset}" style="--wc: {conditionColor(state)};">
  {#if sizePreset === 'sm'}
    <!-- 1x1 Bold Center Complication -->
    <div class="layout-sm">
      <div class="sm-icon-wrap" style="color: {conditionColor(state)}">
        <Icon name={conditionIcon(state)} size={42} />
      </div>
      <div class="sm-content">
        {#if temp !== undefined}
          <div class="temp-val">{Math.round(temp)}{tempUnit}</div>
        {/if}
        {#if todayForecast}
          <div class="sm-hi-lo">
            <span class="hi">{Math.round(todayForecast.temperature)}°</span>
            <span class="sep">/</span>
            {#if todayForecast.templow !== undefined}
              <span class="lo">{Math.round(todayForecast.templow)}°</span>
            {/if}
          </div>
        {/if}
      </div>
    </div>

  {:else if sizePreset === 'md'}
    <!-- 2x1 Horizontal Row -->
    <div class="layout-md">
      <div class="md-icon" style="color: {conditionColor(state)}">
        <Icon name={conditionIcon(state)} size={48} />
      </div>
      <div class="md-content">
        <div class="md-temp-group">
          {#if temp !== undefined}
            <div class="md-temp">{Math.round(temp)}<span class="unit">{tempUnit}</span></div>
          {/if}
          {#if todayForecast}
            <div class="md-hi-lo">
              <span class="hi">{Math.round(todayForecast.temperature)}°</span>
              <span class="sep">/</span>
              <span class="lo">{Math.round(todayForecast.templow ?? 0)}°</span>
            </div>
          {/if}
        </div>
        <div class="md-meta">
          <div class="md-state">{state.replace(/-/g, ' ')}</div>
          <div class="md-name">{name}</div>
        </div>
      </div>
    </div>

  {:else}
    <div class="layout-lg" class:is-xl={sizePreset === 'xl'}>
      <div class="lg-main">
        <div class="lg-hero">
          <div class="lg-icon" style="color: {conditionColor(state)}">
            <Icon name={conditionIcon(state)} size={sizePreset === 'xl' ? 92 : 72} />
          </div>
          <div class="lg-hero-text">
            {#if temp !== undefined}
              <div class="lg-temp-row">
                <span class="lg-temp">{Math.round(temp)}{tempUnit}</span>
                {#if todayForecast}
                  <div class="lg-range">
                    <div class="hi-row"><Icon name="arrow-up" size={10} /><span>{Math.round(todayForecast.temperature)}°</span></div>
                    <div class="lo-row"><Icon name="arrow-down" size={10} /><span>{Math.round(todayForecast.templow ?? 0)}°</span></div>
                  </div>
                {/if}
              </div>
            {/if}
            <div class="lg-status-line">
              <span class="lg-state">{state.replace(/-/g, ' ')}</span>
              <span class="sep">•</span>
              <span class="lg-name">{name}</span>
            </div>
          </div>
        </div>

        <div class="lg-metrics">
          {#if humidity !== undefined}
            <div class="metric"><Icon name="droplets" size={14} /><span>{humidity}%</span></div>
          {/if}
          {#if windSpeed !== undefined}
            <div class="metric"><Icon name="wind" size={14} /><span>{windSpeed}</span></div>
          {/if}
        </div>
      </div>

      {#if forecastDays.length > 0}
        <div class="forecast-section">
          {#each forecastDays as day}
            <div class="forecast-day">
              <span class="day-lbl">{dayLabel(day.datetime)}</span>
              <Icon name={conditionIcon(day.condition)} size={22} color={conditionColor(day.condition)} />
              <div class="day-temps">
                <span class="high">{Math.round(day.temperature)}°</span>
                <span class="low">{Math.round(day.templow ?? 0)}°</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .weather-tile {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    container-type: size;
    border-radius: inherit;
    overflow: hidden;
  }

  /* ── SM (1x1) ────────────────────────────────────────────────────────── */
  .layout-sm {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px;
  }

  .sm-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .temp-val {
    font-size: clamp(2rem, 30cqw, 2.5rem);
    font-weight: 800;
    line-height: 1;
    color: var(--fg);
    letter-spacing: -0.05em;
  }

  .sm-hi-lo {
    display: flex;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 700;
    line-height: 1;
    color: var(--fg-muted);
  }

  .sm-hi-lo .hi { color: var(--fg); }
  .sm-hi-lo .sep { opacity: 0.3; }
  .sm-hi-lo .lo { color: var(--fg-subtle); }

  /* ── MD (2x1, 2x2, 1x2) ─────────────────────────────────────────────────── */
  .layout-md {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 24px;
    gap: 24px;
    transition: all 0.3s ease;
  }

  @container (min-height: 160px) and (max-width: 280px) {
    .layout-md {
      flex-direction: column;
      gap: 16px;
      text-align: center;
    }
    .md-content {
      flex-direction: column !important;
      gap: 12px !important;
    }
    .md-meta {
      align-items: center;
    }
  }

  .md-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .md-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 24px;
    min-width: 0;
  }

  .md-temp-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .md-temp {
    font-size: 2.8rem;
    font-weight: 800;
    line-height: 1;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .md-temp .unit {
    font-size: 1.5rem;
    vertical-align: super;
    font-weight: 600;
    margin-left: 2px;
    opacity: 0.7;
  }

  .md-hi-lo {
    display: flex;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1;
    color: var(--fg-muted);
  }

  .md-hi-lo .sep { opacity: 0.3; }
  .md-hi-lo .hi { color: var(--fg); }
  .md-hi-lo .lo { color: var(--fg-subtle); }

  .md-hi-lo {
    display: flex;
    gap: 6px;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1;
  }

  .md-hi-lo .hi { color: var(--color-warning); }
  .md-hi-lo .lo { color: var(--fg-subtle); opacity: 0.8; }

  .md-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }

  .md-state {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--fg-muted);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .md-name {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--fg-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── LG / XL (3x3+) ─────────────────────────────────────────────────── */
  .layout-lg {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px;
    justify-content: space-between;
  }

  .lg-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .lg-hero {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .lg-hero-text {
    display: flex;
    flex-direction: column;
  }

  .lg-temp-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .lg-temp {
    font-size: clamp(3rem, 15cqw, 5.5rem);
    font-weight: 800;
    line-height: 0.9;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .lg-range {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 1rem;
    font-weight: 800;
  }

  .lg-range div {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .hi-row { color: var(--fg); }
  .lo-row { color: var(--fg-subtle); }

  .lg-status-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .lg-status-line .sep {
    opacity: 0.3;
    font-size: 12px;
  }

  .lg-state {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--fg-muted);
    text-transform: capitalize;
  }

  .lg-name {
    font-size: 1rem;
    font-weight: 500;
    color: var(--fg-subtle);
  }

  .lg-metrics {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    padding: 16px 18px;
    border-radius: 16px;
  }

  .metric {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--fg-muted);
  }

  .metric small {
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.7;
    margin-left: -2px;
  }

  .forecast-section {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--border);
    padding-top: 24px;
    margin-top: 24px;
  }

  .forecast-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .day-lbl {
    font-size: clamp(0.65rem, 3cqw, 0.8rem);
    font-weight: 700;
    color: var(--fg-subtle);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .day-temps {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .high {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--fg);
  }

  .low {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--fg-subtle);
  }

  /* ── XL Overrides ────────────────────────────────────────────── */
  .is-xl .lg-temp {
    font-size: 5rem;
  }

  /* ── Container Overrides ────────────────────────────────────────────── */
  @container (max-width: 320px) {
    .lg-metrics { display: none; }
  }

  @container (max-height: 280px) {
    .forecast-section { display: none; }
    .layout-lg { justify-content: center; }
  }
</style>
