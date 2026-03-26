<script lang="ts">
	// ── Toggle ────────────────────────────────────────────────────────────────

	// ── Props ─────────────────────────────────────────────────────────────────
	interface Props {
		checked: boolean;
		disabled?: boolean;
		size?: 'sm' | 'md';
		label?: string;         // accessible label (used for aria-label if no visible label)
		onchange?: (checked: boolean) => void;
	}

	// ── Props / Local State ───────────────────────────────────────────────────
	let {
		checked = $bindable(false),
		disabled = false,
		size = 'md',
		label,
		onchange
	}: Props = $props();

	// ── Actions ───────────────────────────────────────────────────────────────
	function toggle() {
		if (disabled) return;
		checked = !checked;
		onchange?.(checked);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			toggle();
		}
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	aria-disabled={disabled}
	tabindex={disabled ? -1 : 0}
	class="toggle"
	class:toggle--on={checked}
	class:toggle--sm={size === 'sm'}
	class:toggle--disabled={disabled}
	onclick={toggle}
	onkeydown={handleKeydown}
>
	<span class="toggle__thumb"></span>
</button>

<style>
	.toggle {
		/* Size tokens — overridden by --sm modifier */
		--_w:     36px;
		--_h:     20px;
		--_thumb: 14px;
		--_pad:   3px;

		position: relative;
		display: inline-flex;
		align-items: center;
		flex-shrink: 0;
		width: var(--_w);
		height: var(--_h);
		border-radius: calc(var(--_h) / 2);
		border: 1px solid color-mix(in srgb, var(--fg) 26%, var(--border));
		background-color: var(--color-off);
		transition:
			background-color var(--transition),
			box-shadow var(--transition),
			border-color var(--transition);
		cursor: pointer;
		user-select: none;
	}

	.toggle--sm {
		--_w:     28px;
		--_h:     16px;
		--_thumb: 10px;
		--_pad:   3px;
	}

	.toggle--on {
		background-color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 68%, var(--fg) 18%);
	}

	.toggle--disabled {
		opacity: 0.38;
		cursor: not-allowed;
		pointer-events: none;
	}

	.toggle:hover:not(.toggle--disabled) {
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
	}

	/* Thumb */
	.toggle__thumb {
		position: absolute;
		left: var(--_pad);
		top: 50%;
		width: var(--_thumb);
		height: var(--_thumb);
		border-radius: 50%;
		background-color: var(--thumb-bg);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
		transform: translateY(-50%);
		transition: transform var(--transition), box-shadow var(--transition);
	}

	.toggle--on .toggle__thumb {
		transform: translateY(-50%) translateX(calc(var(--_w) - var(--_thumb) - var(--_pad) * 2));
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
	}
</style>
