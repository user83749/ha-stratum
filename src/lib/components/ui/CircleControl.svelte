<script lang="ts">
  interface Props {
    value: number | null;
    isOn: boolean;
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    onchange?: (value: number) => void;
  }

  let { value, isOn, unit = '%', min = 1, max = 100, step = 1, label = 'Value', onchange }: Props = $props();

  const effectiveMin = $derived(min < 1 ? 1 : min);

  // Local slider value — synced from prop only when not dragging
  let localValue = $state<number>(0);
  let dragging   = $state(false);
  let pendingCommit = $state<number | null>(null);
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  const PENDING_TTL_MS = 1200;

  function clearPendingCommit() {
    pendingCommit = null;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function setPendingCommit(v: number) {
    pendingCommit = v;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingCommit = null;
      pendingTimer = null;
    }, PENDING_TTL_MS);
  }

  // Keep in sync with prop changes from HA (ignored while user is dragging)
  $effect.pre(() => {
    if (dragging) return;
    const serverValue = value ?? (isOn ? max : effectiveMin);
    const clampedServerValue = Math.max(effectiveMin, Math.min(max, serverValue));
    if (pendingCommit !== null) {
      if (Math.abs(clampedServerValue - pendingCommit) < 0.0001) {
        clearPendingCommit();
        localValue = clampedServerValue;
      }
      return;
    }
    localValue = clampedServerValue;
  });
  $effect(() => {
    return () => {
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };
  });

  const pct = $derived(localValue);

  // r=22.1, circumference = 2π×r  (exactly matching YAML)
  const circumference = 138.938;

  // ── Drag state ───────────────────────────────────────────────────────────
  // Drag direction matches the YAML rotated range slider:
  //   drag UP   → value increases  (same as dragging slider thumb up)
  //   drag DOWN → value decreases
  // Sensitivity auto-scales from element size: full element height = full range.

  let svgEl: SVGSVGElement | null = $state(null);
  let prevY = 0;  // Y position of previous pointermove, used for incremental delta

  function handlePointerDown(ev: PointerEvent) {
    if (!onchange) return;
    // Ignore non-primary pointer on mouse
    if (ev.button !== 0 && ev.pointerType === 'mouse') return;
    ev.stopPropagation();
    // Capture so pointermove fires even when cursor leaves element
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    dragging = true;
    prevY = ev.clientY;
    // Do NOT change localValue here — no jump on press
  }

  function handlePointerMove(ev: PointerEvent) {
    if (!dragging || !onchange || !svgEl) return;
    ev.stopPropagation();

    const dy = prevY - ev.clientY;  // positive = moved up
    prevY = ev.clientY;

    // Sensitivity: dragging full element height covers the full value range.
    const rect = svgEl.getBoundingClientRect();
    const sensitivity = (max - effectiveMin) / rect.height;

    const delta = dy * sensitivity;
    const next  = Math.max(effectiveMin, Math.min(max, localValue + delta));
    // Only snap to step on pointerup — keep sub-step precision during drag
    // so slow drags don't feel frozen.
    localValue = next;
  }

  function handlePointerUp(ev: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    // Round to step and commit
    const snapped = Math.max(effectiveMin, Math.min(max, Math.round(localValue / step) * step));
    localValue = snapped;
    setPendingCommit(snapped);
    onchange?.(snapped);
  }
</script>

<!--
  Visual: SVG ring + value text.
  Interaction: pointer-capture on the circle-wrap overlay.
  Dragging UP increases value, DOWN decreases — same axis as the YAML's
  rotated vertical range slider.
-->
<button
  class="circle-wrap"
  class:interactive={!!onchange}
  role={onchange ? 'slider' : undefined}
  aria-label={label}
  aria-valuenow={Math.round(pct)}
  aria-valuemin={effectiveMin}
  aria-valuemax={max}
  type="button"
  disabled={!onchange}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
>
  <svg
    bind:this={svgEl}
    viewBox="0 0 50 50"
    class="circle-svg"
    aria-hidden="true"
  >
    <!-- Ring stroke — matches YAML exactly -->
    <circle
      cx="25" cy="25" r="22.1"
      class="circle-stroke"
      class:on={isOn}
      class:dragging
      stroke-dasharray={circumference}
      stroke-dashoffset={circumference - pct / 100 * circumference}
    />
    <!-- Value label — matches YAML tspan offset exactly -->
    <text x="50%" y="52%" class="circle-value">
      {Math.round(pct)}<tspan dx=".2" dy="-.4">{unit}</tspan>
    </text>
  </svg>
</button>

<style>
  .circle-wrap {
    position: relative;
    display: flex;
    width: 100%;
    height: auto;
    aspect-ratio: 1;
    padding: 0;
    border: 0;
    background: none;
    appearance: none;
    /* Prevent accidental text selection during fast drags */
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .circle-wrap.interactive { cursor: grab; }
  .circle-wrap.interactive:active { cursor: grabbing; }

  .circle-svg {
    width: 100%;
    height: 100%;
    pointer-events: none;  /* SVG itself is display-only; wrap div handles events */
  }

  /* ── Ring stroke — YAML variable defaults ────────────────────────────── */
  .circle-stroke {
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
    stroke-width: var(--c-stroke-width, 2.3);
    stroke: var(--c-stroke-color-off, none);
    fill: var(--c-fill-color-off, rgba(255, 255, 255, 0.04));
    transition: stroke-dashoffset 0.08s ease, stroke-width 0.15s ease;
  }

  .circle-stroke.on {
    stroke: var(--c-stroke-color-on, #b0b0b0);
    fill: var(--c-fill-color-on, none);
  }

  /* YAML: stroke-width expands to --c-stroke-width-dragging while dragging */
  .circle-stroke.dragging {
    stroke-width: var(--c-stroke-width-dragging, 5);
    transition: stroke-width 0.08s ease;
  }

  /* ── Value text — YAML variable defaults ─────────────────────────────── */
  .circle-value {
    font-size: var(--c-font-size, 14px);
    font-weight: var(--c-font-weight, 700);
    letter-spacing: var(--c-letter-spacing, -0.02rem);
    fill: var(--c-font-color, #97989c);
    text-anchor: middle;
    dominant-baseline: central;
    font-variant-numeric: tabular-nums;
  }

  .circle-value tspan { font-size: var(--c-unit-font-size, 10.5px); }
</style>
