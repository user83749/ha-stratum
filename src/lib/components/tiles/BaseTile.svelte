<script lang="ts">
  // ── BaseTile ─────────────────────────────────────────────────────────────

  // ── Imports ─────────────────────────────────────────────────────────────
  import type { Snippet } from 'svelte';

  // ── Props ───────────────────────────────────────────────────────────────
  interface Props {
    name: string;
    state: string;
    isOn?: boolean;
    style?: string;
    showName?: boolean;
    showState?: boolean;
    icon: Snippet;
    circle?: Snippet;
    below?: Snippet;
  }

  // ── Props Bindings ──────────────────────────────────────────────────────
  let { name, state, isOn = false, style = '', showName = true, showState = true, icon, circle, below }: Props = $props();
</script>

<div class="base-tile" class:on={isOn} class:no-name={!showName} {style}>
  <div class="tile-grid">
    <!-- ── Icon Area ─────────────────────────────────────────────────────── -->
    <div class="icon-area">
      <div class="icon-inner">
        {@render icon()}
      </div>
    </div>

    <!-- ── Circle Area ───────────────────────────────────────────────────── -->
    <div class="circle-area">
      {@render circle?.()}
    </div>

    <!-- ── Name Row ──────────────────────────────────────────────────────── -->
    {#if showName}
      <span class="name-text">{name}</span>
    {/if}

    <!-- ── State Row ─────────────────────────────────────────────────────── -->
    {#if showState}
      <span class="state-text">{state}</span>
    {/if}

  </div>

  <!-- ── Extra Content Slot ─────────────────────────────────────────────── -->
  {@render below?.()}
</div>

<style>
  /* ── Tile Root ─────────────────────────────────────────────────────────── */
  .base-tile {
    flex: 1;
    margin: calc(var(--tile-padding) * -1);
    padding:
      calc(10.9% * var(--tile-padding-scale, 1))
      calc(9.9% * var(--tile-padding-scale, 1))
      calc(8.9% * var(--tile-padding-scale, 1))
      calc(10.9% * var(--tile-padding-scale, 1));
    position: relative;
    display: flex;
    flex-direction: column;
    border-radius: inherit;
    gap: var(--tile-gap);
    color: var(--tile-label-off, #97989c);
  }

  /* ── Standard grid layout ─────────────────────────────────────────────── */
  .tile-grid {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-areas:
      "icon circle"
      "n    n"
      "s    s";
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto repeat(2, min-content);
    gap: 1.3%;
    align-items: start;
  }

  /* ── Wide Layout ──────────────────────────────────────────────────────── */
  :global(.tile-wrapper.shape-wide) .tile-grid {
    grid-template-areas:
      "icon n circle"
      "icon s circle";
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 2.05fr) minmax(0, 0.95fr);
    grid-template-rows: min-content min-content;
    align-content: center;
    align-items: center;
    column-gap: calc(1.3% * var(--tile-gap-scale, 1));
    row-gap: calc(var(--button-card-font-size) * 0.08);
  }

  /* ── No-Name Layout ───────────────────────────────────────────────────── */
  .base-tile.no-name .tile-grid {
    grid-template-areas:
      "icon circle"
      "s    s";
    grid-template-rows: auto min-content;
  }

  :global(.tile-wrapper.shape-wide) .base-tile.no-name .tile-grid {
    grid-template-areas: "icon s circle";
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 2.05fr) minmax(0, 0.95fr);
    grid-template-rows: min-content;
    align-content: center;
    align-items: center;
    column-gap: calc(1.3% * var(--tile-gap-scale, 1));
    row-gap: 0;
  }

  /* ── Icon Area ────────────────────────────────────────────────────────── */
  .icon-area {
    grid-area: icon;
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    display: block;
    overflow: visible;
  }

  :global(.tile-wrapper.shape-wide) .icon-area {
    width: 84%;
    justify-self: start;
    align-self: center;
    max-width: 84%;
  }

  /* ── Icon Inner ───────────────────────────────────────────────────────── */
  .icon-inner {
    width: 100%;
    height: 100%;
    display: block;
    line-height: 0;
    flex-shrink: 0;
  }

  /* ── Circle Area ──────────────────────────────────────────────────────── */
  .circle-area {
    grid-area: circle;
    display: initial;
    justify-self: end;
    width: 88%;
    margin: -3% 2% 0 0;
    opacity: 1;
  }

  :global(.tile-wrapper.shape-wide) .circle-area {
    width: 82%;
    margin: 0;
    align-self: center;
    justify-self: end;
  }

  /* ── Name / state text ────────────────────────────────────────────────── */
  .name-text {
    grid-area: n;
    justify-self: start;
    font-size: var(--button-card-font-size);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-off, #97989c);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.21;
  }

  :global(.tile-wrapper.shape-wide) .name-text,
  :global(.tile-wrapper.shape-wide) .state-text {
    align-self: center;
    min-width: 0;
  }

  :global(.tile-wrapper.shape-wide) .name-text {
    line-height: 1.16;
  }

  :global(.tile-wrapper.shape-wide) .state-text {
    line-height: 1.12;
  }

  .state-text {
    grid-area: s;
    justify-self: start;
    line-height: 1.15;
    font-size: var(--button-card-font-size);
    font-weight: 500;
    letter-spacing: var(--button-card-letter-spacing);
    color: var(--tile-label-off, #97989c);
    transition: color var(--transition);
  }

  .state-text::first-letter {
    text-transform: uppercase;
  }
  .base-tile.on { color: var(--tile-label-on, var(--control-active-name)); }
  .base-tile.on .name-text { color: var(--tile-label-on, var(--control-active-name)); }
  .base-tile.on .state-text { color: var(--tile-label-on, var(--control-active-name)); }</style>
