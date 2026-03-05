<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — ColorPicker.svelte
	// Simple hex color picker: hue slider + hex input + swatch preview
	// ─────────────────────────────────────────────────────────────────────────

	interface Props {
		value: string;
		onchange: (hex: string) => void;
	}

	const { value, onchange }: Props = $props();

	// ── Helpers ────────────────────────────────────────────────────────────

	function hslToHex(h: number, s: number, l: number): string {
		s /= 100;
		l /= 100;
		const k = (n: number) => (n + h / 30) % 12;
		const a = s * Math.min(l, 1 - l);
		const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
		const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
		return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
	}

	function hexToHue(hex: string): number {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const d = max - min;
		if (d === 0) return 0;
		let h = 0;
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
		else if (max === g) h = ((b - r) / d + 2) / 6;
		else h = ((r - g) / d + 4) / 6;
		return Math.round(h * 360);
	}

	function isValidHex(hex: string): boolean {
		return /^#[0-9a-fA-F]{6}$/.test(hex);
	}

	// ── State ──────────────────────────────────────────────────────────────

	let hue = $state(220);
	let hexInput = $state('');

	$effect(() => {
		hexInput = value;
		if (isValidHex(value)) {
			hue = hexToHue(value);
		}
	});

	// ── Handlers ───────────────────────────────────────────────────────────

	function handleHueChange(e: Event) {
		hue = parseInt((e.target as HTMLInputElement).value);
		const hex = hslToHex(hue, 70, 55);
		hexInput = hex;
		onchange(hex);
	}

	function handleHexInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		hexInput = val;
		const normalized = val.startsWith('#') ? val : `#${val}`;
		if (isValidHex(normalized)) {
			hue = hexToHue(normalized);
			onchange(normalized);
		}
	}
</script>

<div class="cp">
	<div class="cp__swatch" style="background: {isValidHex(hexInput) ? hexInput : value}"></div>
	<div class="cp__controls">
		<input
			class="cp__hue"
			type="range"
			min="0"
			max="360"
			value={hue}
			oninput={handleHueChange}
			aria-label="Hue"
		/>
		<input
			class="cp__hex"
			type="text"
			value={hexInput}
			oninput={handleHexInput}
			spellcheck="false"
			maxlength="7"
			aria-label="Hex color value"
		/>
	</div>
</div>

<style>
	.cp {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.cp__swatch {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		flex-shrink: 0;
	}

	.cp__controls {
		display: flex;
		flex-direction: column;
		gap: 6px;
		flex: 1;
		min-width: 0;
	}

	.cp__hue {
		-webkit-appearance: none;
		appearance: none;
		width: 100%;
		height: 10px;
		border-radius: 999px;
		background: linear-gradient(
			to right,
			hsl(0,70%,55%), hsl(30,70%,55%), hsl(60,70%,55%),
			hsl(90,70%,55%), hsl(120,70%,55%), hsl(150,70%,55%),
			hsl(180,70%,55%), hsl(210,70%,55%), hsl(240,70%,55%),
			hsl(270,70%,55%), hsl(300,70%,55%), hsl(330,70%,55%),
			hsl(360,70%,55%)
		);
		outline: none;
		cursor: pointer;
		border: none;
	}

	.cp__hue::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 2px solid var(--border-strong);
		cursor: pointer;
		box-shadow: 0 1px 4px var(--shadow);
	}

	.cp__hue::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--bg-elevated);
		border: 2px solid var(--border-strong);
		cursor: pointer;
		box-shadow: 0 1px 4px var(--shadow);
	}

	.cp__hex {
		width: 100%;
		padding: 5px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--hover);
		color: var(--fg);
		font-size: 0.8rem;
		font-family: monospace;
		box-sizing: border-box;
		transition:
			border-color var(--transition),
			background-color var(--transition);
	}

	.cp__hex:focus {
		border-color: var(--accent);
		outline: none;
		background: var(--bg-elevated);
	}
</style>
