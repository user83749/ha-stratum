<script lang="ts">
  import type { Tile } from '$lib/types/dashboard';

  interface Props { tile: Tile; }
  const { tile }: Props = $props();

  const config = $derived(tile.config);
  const label = $derived(config.label ?? config.name ?? '');
  const style = $derived((config as Record<string, unknown>).style as string ?? 'line');
  const align = $derived((config as Record<string, unknown>).align as string ?? 'left');
</script>

<div class="divider-tile align-{align} style-{style}" role="separator">
  {#if style === 'dots'}
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
  {:else if style === 'space'}
    <!-- intentionally empty -->
  {:else if label}
    <span class="divider-label">{label}</span>
  {:else}
    <hr class="line" />
  {/if}
</div>

<style>
  .divider-tile {
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  .align-center { justify-content: center; }
  .align-right { justify-content: flex-end; }

  hr.line {
    flex: 1;
    border: none;
    border-top: 1px solid var(--border);
    margin: 0;
  }

  .divider-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-subtle);
    border-bottom: 2px solid var(--border-strong);
    white-space: nowrap;
  }

  .dot {
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--border-strong);
    margin: 0 3px;
  }

  /* ── Universal 1x1 Graceful Layout ────────────────────────────────────────── */
  @container tile (max-width: 120px) {
    :global(.hue-icon-wrap) { width: 38px !important; height: 38px !important; }
    :global(.vac-btn), :global(.fan-btn), :global(.icon-badge), :global(.power-btn), :global(.avatar-wrap) { width: 44px !important; height: 44px !important; }
    :global(.bottom) { gap: 0px !important; }
    :global(.tile-content) { padding-bottom: 2px !important; }
  }


  .name-text {
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.15;
  }

  .state-text {
    line-height: 1.15;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--fg-muted);
    transition: color var(--transition);
  }

</style>
