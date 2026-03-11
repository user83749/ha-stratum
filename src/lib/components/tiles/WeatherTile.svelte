<script lang="ts">
  import type { HassEntity } from 'home-assistant-js-websocket';
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { isCustomIcon } from '$lib/icons/customIcons';

  interface Props { tile: Tile; entity: HassEntity | null; }
  const { tile, entity }: Props = $props();

  const config = $derived(tile.config);
  const layoutW = $derived((tile.layout?.w ?? tile.size?.w) ?? 1);
  const layoutH = $derived((tile.layout?.h ?? tile.size?.h) ?? 1);
  const isWideMd = $derived(layoutW >= 2 && layoutH === 1);
  const isTallMd = $derived(layoutW === 1 && layoutH >= 2);
  const sizePreset = $derived(getTileSizePreset(tile));

  const state = $derived(entity?.state ?? 'unknown');
  const attrs = $derived(entity?.attributes ?? {});
  const name = $derived(config.name ?? attrs.friendly_name ?? 'Weather');
  const iconOverride = $derived((config.icon as string | undefined)?.trim() || undefined);
  const overrideIsCustom = $derived(iconOverride ? isCustomIcon(iconOverride) : false);
  const temp = $derived(attrs.temperature as number | undefined);
  const tempUnit = '°';
  const humidity = $derived(attrs.humidity as number | undefined);
  const windSpeed = $derived(attrs.wind_speed as number | undefined);
  const windUnit = $derived(attrs.wind_speed_unit as string ?? 'km/h');

  interface ForecastDay { datetime: string; temperature: number; templow?: number; condition: string; }
  const forecastArray = $derived(((attrs.forecast as unknown[]) ?? []) as ForecastDay[]);

  const todayForecast = $derived(
    forecastArray.find(d => new Date(d.datetime).toDateString() === new Date().toDateString()) ||
    forecastArray[0]
  );

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

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  const mainIcon = $derived(iconOverride ?? conditionIcon(state));
</script>

<div class="weather-tile size-{sizePreset}" style="--wc: {conditionColor(state)};">
  {#if sizePreset === 'sm'}
    <!-- 1x1 Bold Center Complication -->
    <div class="layout-sm">
      <div class="sm-icon-wrap" style="color: {conditionColor(state)}">
        {#if iconOverride && overrideIsCustom}
          <Icon name={mainIcon} entity={entity} size="100%" />
        {:else}
          <Icon name={mainIcon} size="100%" />
        {/if}
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
    <div class="layout-md" class:is-wide-md={isWideMd} class:is-tall-md={isTallMd}>
      <div class="md-icon" style="color: {conditionColor(state)}">
        {#if iconOverride && overrideIsCustom}
          <Icon name={mainIcon} entity={entity} size="100%" />
        {:else}
          <Icon name={mainIcon} size="100%" />
        {/if}
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
            {#if iconOverride && overrideIsCustom}
              <Icon name={mainIcon} entity={entity} size="100%" />
            {:else}
              <Icon name={mainIcon} size="100%" />
            {/if}
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
            <div class="metric"><Icon name="wind" size={14} /><span>{windSpeed}{windUnit ? ` ${windUnit}` : ''}</span></div>
          {/if}
        </div>
      </div>

      {#if forecastDays.length > 0}
        <div class="forecast-section">
          {#each forecastDays as day}
            <div class="forecast-day">
              <span class="day-lbl">{dayLabel(day.datetime)}</span>
              <span class="day-icon" style="color: {conditionColor(day.condition)}">
                <Icon name={conditionIcon(day.condition)} size="100%" />
              </span>
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
    --weather-icon-sm: calc(var(--button-card-font-size) * 2.55);
    --weather-icon-md: calc(var(--button-card-font-size) * 2.95);
    --weather-icon-lg: calc(var(--hero-text-size) * 0.92);
    --weather-forecast-icon: calc(var(--button-card-font-size) * 1.35);
    --weather-gap-xxs: calc(var(--tile-padding-effective) * 0.16);
    --weather-gap-xs: calc(var(--tile-padding-effective) * 0.35);
    --weather-gap-sm: calc(var(--tile-padding-effective) * 0.53);
    --weather-gap-md: calc(var(--tile-padding-effective) * 0.7);
    --weather-gap-lg: calc(var(--tile-padding-effective) * 0.88);
    --weather-gap-xl: calc(var(--tile-padding-effective) * 1.4);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    overflow: hidden;
  }

  /* ── SM (1x1) ────────────────────────────────────────────────────────── */
  .layout-sm {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    padding: 0;
  }
  .sm-icon-wrap {
    width: var(--weather-icon-sm);
    height: var(--weather-icon-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sm-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--weather-gap-xxs);
  }

  .temp-val {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 0.9;
    color: var(--fg);
    letter-spacing: -0.05em;
  }

  .sm-hi-lo {
    display: flex;
    gap: var(--weather-gap-xs);
    font-size: var(--secondary-label-size);
    font-weight: 500;
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
    padding: calc(var(--tile-padding-effective) * 1.05) calc(var(--tile-padding-effective) * 2.1);
    gap: var(--weather-gap-xl);
    transition: all 0.3s ease;
  }
  .layout-md.is-tall-md {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: var(--weather-gap-md);
    padding: 0;
  }

  .md-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--weather-icon-md);
    height: var(--weather-icon-md);
  }

  .md-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--weather-gap-xl);
    min-width: 0;
  }
  .layout-md.is-tall-md .md-content {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--weather-gap-sm);
  }
  .layout-md.is-tall-md .md-temp-group {
    align-items: flex-start;
  }
  .layout-md.is-tall-md .md-meta {
    width: 100%;
  }

  .md-temp-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--weather-gap-xxs);
  }

  .md-temp {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 1;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .md-temp .unit {
    font-size: var(--button-card-font-size);
    vertical-align: super;
    font-weight: 500;
    margin-left: var(--weather-gap-xxs);
    opacity: 0.7;
  }

  .md-hi-lo {
    display: flex;
    gap: var(--weather-gap-sm);
    font-size: var(--button-card-font-size);
    font-weight: 500;
    line-height: 1;
    color: var(--fg-muted);
  }

  .md-hi-lo .sep { opacity: 0.3; }
  .md-hi-lo .hi { color: var(--color-warning); }
  .md-hi-lo .lo { color: var(--fg-subtle); opacity: 0.8; }

  .md-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: var(--weather-gap-xxs);
  }

  .md-state {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-muted);
    text-transform: capitalize;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .md-name {
    font-size: var(--secondary-label-size);
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
    padding: calc(var(--tile-padding-effective) * 2.1);
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
    gap: var(--weather-gap-xl);
  }
  .lg-icon {
    width: var(--weather-icon-lg);
    height: var(--weather-icon-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .layout-lg.is-xl .lg-icon {
    width: calc(var(--weather-icon-lg) * 1.2);
    height: calc(var(--weather-icon-lg) * 1.2);
  }

  .lg-hero-text {
    display: flex;
    flex-direction: column;
  }

  .lg-temp-row {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 1.4);
  }

  .lg-temp {
    font-size: var(--hero-text-size);
    font-weight: 500;
    line-height: 0.9;
    color: var(--fg);
    letter-spacing: -0.06em;
  }

  .lg-range {
    display: flex;
    flex-direction: column;
    gap: var(--weather-gap-xs);
    font-size: var(--button-card-font-size);
    font-weight: 500;
  }

  .lg-range div {
    display: flex;
    align-items: center;
    gap: var(--weather-gap-xs);
  }

  .hi-row { color: var(--fg); }
  .lo-row { color: var(--fg-subtle); }

  .lg-status-line {
    display: flex;
    align-items: center;
    gap: var(--weather-gap-md);
    margin-top: var(--weather-gap-md);
  }

  .lg-status-line .sep {
    opacity: 0.3;
    font-size: var(--secondary-label-size);
  }

  .lg-state {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-muted);
    text-transform: capitalize;
  }

  .lg-name {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-subtle);
  }

  .lg-metrics {
    display: flex;
    flex-direction: column;
    gap: calc(var(--tile-padding-effective) * 1.05);
    background: color-mix(in srgb, var(--fg) 5%, transparent);
    padding: calc(var(--tile-padding-effective) * 1.4) calc(var(--tile-padding-effective) * 1.58);
    border-radius: var(--radius);
  }

  .metric {
    display: flex;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 0.88);
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg-muted);
  }

  .forecast-section {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--border);
    padding-top: calc(var(--tile-padding-effective) * 2.1);
    margin-top: calc(var(--tile-padding-effective) * 2.1);
  }

  .forecast-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: calc(var(--tile-padding-effective) * 0.88);
    flex: 1;
    min-width: 0;
  }
  .day-icon {
    width: var(--weather-forecast-icon);
    height: var(--weather-forecast-icon);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .day-lbl {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-subtle);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .day-temps {
    display: flex;
    align-items: baseline;
    gap: var(--weather-gap-sm);
  }

  .high {
    font-size: var(--button-card-font-size);
    font-weight: 500;
    color: var(--fg);
  }

  .low {
    font-size: var(--secondary-label-size);
    font-weight: 500;
    color: var(--fg-subtle);
  }


</style>
