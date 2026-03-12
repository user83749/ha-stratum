<!--
  BaseTile — shared grid layout for all standard button-card style tiles.

  Grid: "icon circle" / "n n" / "s s"
  Icon area fills its grid cell at 100% width — custom icons apply their own
  width/margin via .ci-sizer in Icon.svelte. No hardcoded sizing here.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

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

  let { name, state, isOn = false, style = '', showName = true, showState = true, icon, circle, below }: Props = $props();
</script>

<div class="base-tile" class:on={isOn} class:no-name={!showName} {style}>
  <div class="tile-grid">

    <!-- grid-area: icon — icon container (custom icons self-position via width/margins) -->
    <div class="icon-area">
      <div class="icon-inner">
        {@render icon()}
      </div>
    </div>

    <!-- grid-area: circle — CircleControl, badge, or empty spacer -->
    <div class="circle-area">
      {@render circle?.()}
    </div>

    <!-- grid-area: n -->
    {#if showName}
      <span class="name-text">{name}</span>
    {/if}

    <!-- grid-area: s -->
    {#if showState}
      <span class="state-text">{state}</span>
    {/if}

  </div>

  <!-- Below grid: presets, action rows, sliders — rendered at flex level -->
  {@render below?.()}
</div>

<style>
  .base-tile {
    flex: 1;
    margin: calc(var(--tile-padding) * -1);
    /* YAML #card: padding: 10.9% 9.9% 8.9% 10.9% — percentage of card width */
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
    /* HA button-card sets `color` on the card — icons that use currentColor
       should follow the same on/off palette as your YAML. */
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

  /* 2x1 / wide tiles need a different content flow than square tiles.
     Keep all sizing token-driven; only change grid geometry here. */
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

  /* If the name row is hidden, collapse the grid so state sits directly under the icon row. */
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

  /* icon-area: grid cell */
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

  /* icon-inner: centralised icon sizing — every tile's icon lands here */
  .icon-inner {
    width: 100%;
    height: 100%;
    display: block;
    line-height: 0;
    flex-shrink: 0;
  }

  /* circle-area: right cell */
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
