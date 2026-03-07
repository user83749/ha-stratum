<script lang="ts">
	import type { HassEntity } from 'home-assistant-js-websocket';

	interface Props {
		name: string;
		entity?: HassEntity | null;
		class?: string;
	}

	let { name, entity = null, class: className = '' }: Props = $props();

	function randomId(): string {
		return Math.random().toString(36).slice(2, 9);
	}

	function prefixCssRules(css: string, scopeSelector: string): string {
		let out = '';
		let i = 0;

		function skipWs(idx: number): number {
			while (idx < css.length && /\s/.test(css[idx]!)) idx++;
			return idx;
		}

		while (i < css.length) {
			const wsStart = i;
			const start = skipWs(i);

			// Preserve trailing whitespace at end.
			if (start >= css.length) {
				out += css.slice(wsStart);
				break;
			}

			// Copy keyframes blocks verbatim (we scope selectors, not keyframes bodies).
			if (css.startsWith('@keyframes', start)) {
				const open = css.indexOf('{', start);
				if (open === -1) { out += css.slice(wsStart); break; }
				let depth = 1;
				let j = open + 1;
				while (j < css.length && depth > 0) {
					const ch = css[j]!;
					if (ch === '{') depth++;
					else if (ch === '}') depth--;
					j++;
				}
				out += css.slice(wsStart, j);
				i = j;
				continue;
			}

			// Copy other at-rules verbatim (none expected here, but keep safe).
			if (css[start] === '@') {
				const semi = css.indexOf(';', start);
				const open = css.indexOf('{', start);
				if (semi !== -1 && (open === -1 || semi < open)) {
					out += css.slice(wsStart, semi + 1);
					i = semi + 1;
					continue;
				}
				if (open === -1) { out += css.slice(wsStart); break; }
				let depth = 1;
				let j = open + 1;
				while (j < css.length && depth > 0) {
					const ch = css[j]!;
					if (ch === '{') depth++;
					else if (ch === '}') depth--;
					j++;
				}
				out += css.slice(wsStart, j);
				i = j;
				continue;
			}

			const open = css.indexOf('{', start);
			if (open === -1) { out += css.slice(wsStart); break; }

			const selectorRaw = css.slice(start, open).trim();
			const scopedSelector = selectorRaw
				.split(',')
				.map((s) => `${scopeSelector} ${s.trim()}`)
				.join(', ');

			let depth = 1;
			let j = open + 1;
			while (j < css.length && depth > 0) {
				const ch = css[j]!;
				if (ch === '{') depth++;
				else if (ch === '}') depth--;
				j++;
			}

			out += css.slice(wsStart, start) + scopedSelector + css.slice(open, j);
			i = j;
		}

		return out;
	}

	function scopeInlineSvg(svg: string, scopeId: string): string {
		if (!svg) return svg;
		const scopeSelector = `svg[data-ci="${scopeId}"]`;

		// Add scope attribute to the root svg tag (first one only).
		let scoped = svg.replace(/<svg\b(?![^>]*\bdata-ci=)/, `<svg data-ci="${scopeId}"`);

		scoped = scoped.replace(/<style>([\s\S]*?)<\/style>/g, (_m, cssText: string) => {
			let css = String(cssText);

			// Avoid global keyframe name collisions for the generic "on" animation.
			css = css.replace(/@keyframes\s+on\b/g, `@keyframes ci-${scopeId}-on`);
			css = css.replace(/(\banimation(?:-name)?\s*:\s*)on\b/g, `$1ci-${scopeId}-on`);

			css = prefixCssRules(css, scopeSelector);
			return `<style>${css}</style>`;
		});

		return scoped;
	}

	const entityState = $derived(entity?.state ?? 'off');
	const attrs = $derived(entity?.attributes ?? {});
	const isOn  = $derived(entityState === 'on' || entityState === 'playing' || entityState === 'open' || entityState === 'opening' || entityState === 'cool' || entityState === 'fan_only');

	// rgb_color as CSS rgb() string, or 'none' if unavailable
	const rgbColor = $derived.by(() => {
		const rgb = attrs.rgb_color as [number, number, number] | undefined;
		return rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : 'none';
	});

	// Track recent changes for icons with 2s timeout animations
	let lastState = $state('');
	let isRecent = $state(false);
	let timeoutId: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (entityState !== lastState) {
			lastState = entityState;
			isRecent = true;
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => { isRecent = false; }, 2000);
		}
	});

	// Unique scope id per icon instance to prevent inline SVG <style> rules leaking globally.
	let scopeId = $state(randomId());
	$effect(() => {
		name;
		scopeId = randomId();
	});

	// ── SVG getters ──────────────────────────────────────────────────────────

	const rawSvg = $derived.by(() => {
		switch (name) {

			// ── STATIC ICONS ────────────────────────────────────────────────
			case 'plex':
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
  <path d="M7.7.3h34.6c4.1 0 7.4 3.3 7.4 7.4v34.6c0 4.1-3.3 7.4-7.4 7.4H7.7c-4.1 0-7.4-3.3-7.4-7.4V7.7C.3 3.6 3.6.3 7.7.3z" fill="#282a2d"/>
  <path d="M25,7.1H14.6L25,25L14.6,42.9H25L35.4,25L25,7.1z" fill="#e5a00d"/>
</svg>`;

			case 'kodi':
				return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path fill="#17B2E7" d="M12.03,1C11.82,1 11.6,1.11 11.41,1.31C10.56,2.16 9.72,3 8.88,3.84 8.66,4.06 8.6,4.18 8.38,4.38 8.09,4.62 7.96,4.91 7.97,5.28c0 1.29 0 2.56 0 3.85 0 1.33 0 2.69 0 4.03a1.05 1.05 0 0 0 .03.28c.08.31.28.38.5.15 1.2-1.2 2.27-2.29 3.47-3.5 1.36-1.36 2.73-2.72 4.09-4.09 .41-.4.41-.85 0-1.25C14.94,3.6 13.77,2.47 12.63,1.31a.95.95 0 0 0-.6-.31M18.66,7.66c-.21,0-.41.09-.6.28-1.15,1.16-2.31,2.3-3.47,3.47-.39.39-.39.82 0,1.22 1.15,1.15 2.29,2.31 3.44,3.46c.4.41.82.41 1.22,0 1.11-1.09 2.25-2.22 3.34-3.34.17-.17.34-.33.41-.56v-.31c-.07-.24-.24-.38-.41-.57C21.47,10.19 20.37,9.06 19.25,7.94a.95.95 0 0 0-.59-.28M4.78,8.09c-.13-.05-.2.05-.28.13-1.15,1.17-2.16,2.21-3.31,3.37-.26.27-.26.65 0 .91 .62.63 1.25,1.25 1.87,1.88a10.4 10.4 0 0 0 1.5,1.5c.16.15.3.12.38-.07 .06-.1.06-.23.06-.34 0-1.18 0-2.1 0-3.28 0-1.19 0-2.38 0-3.56 0-.08 0-.18-.03-.25a.55.55 0 0 0-.19-.24.73.73 0 0 0-.12-.05M12.09,14.25c-.2,0-.43.09-.62.28-1.15,1.16-2.29,2.34-3.44,3.5-.4.4-.4.82 0,1.22 1.11,1.12 2.23,2.22 3.35,3.34 .16.17.33.34.56.41h.28c.22-.06.4-.21.56-.37 1.12-1.13 2.25-2.25 3.38-3.38 .39-.4.34-.85-.03-1.25-1.16-1.16-2.29-2.31-3.44-3.47a.95.95 0 0 0-.6-.28Z"/>
</svg>`;

			case 'camera':
				return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <g id="Glyph">
    <path fill="#9da0a2" d="m59.1735 22.2461-1.9696-.3473c-.5439-.0959-1.0626.2673-1.1584.8112l-.1736.9849-3.9392-.6946.4341-2.462c.1471-.8343-.2485-1.6351-.9303-2.0514l-2.8885 5.3354c-1.0508 1.939-3.0713 3.1431-5.2744 3.1431-.3486 0-.7002-.0308-1.0439-.0913l-28.6748-5.0557-.8682 4.9237c-.1918 1.0878.5345 2.1251 1.6223 2.3169l9.7716 1.723c.3843-2.3776 2.4352-4.2043 4.9196-4.2043 2.7568 0 5 2.2432 5 5 0 .3207-.0367.6326-.0947.9367l13.887 2.4487c1.0878.1918 2.1251-.5345 2.317-1.6223l.7814-4.4316 3.9392.6946-.1736.9848c-.0959.5439.2672 1.0626.8112 1.1584l1.9696.3473c.5439.0959 1.0626-.2673 1.1584-.8112l1.3892-7.8784c.0959-.5439-.2673-1.0626-.8112-1.1585z"/>
    <path fill="#9da0a2" d="m13.902 19.8484 28.6746 5.0561c1.6956.299 3.3922-.5206 4.212-2.0345l3.329-6.1478c.65-1.2004-.0671-2.6849-1.4114-2.9219l-32.7204-5.7696c-1.0878-.1918-2.1251.5345-2.3169 1.6223l-1.3892 7.8785c-.1918 1.0878.5345 2.1251 1.6223 2.3169zm3.5325-8.5159 9.8481 1.7363c.5435.0962.9067.6147.811 1.1587-.0854.4849-.5073.8262-.9839.8262-.0576 0-.1157-.0049-.1748-.0151l-9.8481-1.7363c-.5439-.0962-.9067-.6147-.811-1.1587.0957-.5435.6123-.9048 1.1587-.811z"/>
    <path fill="#9da0a2" d="m25.6799 35.2879-4.0989 11.7121h-9.581c0-.5523-.4477-1-1-1h-3v-2c0-1.1046-.8954-2-2-2h-2v14h2c1.1046 0 2-.8954 2-2v-2h3c.5523 0 1-.4478 1-1h9.5811c1.6973 0 3.2148-1.0767 3.7754-2.6787l4.127-11.7925c-.1614.0158-.3179.0489-.4835.0489-1.2789 0-2.4349-.4969-3.3201-1.2897z"/>
    <circle fill="#9da0a2" cx="29" cy="31.577" r="3"/>
  </g>
</svg>`;

			case 'apple_tv':
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
  <path fill="#9da0a2" d="M25.2 49.7l-13.7-.1c-2.4 0-4.6-.8-6.5-2.2-2-1.6-3.6-3.6-4.3-6.2-.2-1-.2-1.9-.3-3V11.5C.5 7.9 1.9 5 4.8 2.7 6.2 1.6 7.8.8 9.6.5c.5-.1.9-.1 1.4-.1L27.5.3l10.9.1c2.6 0 4.8.8 6.7 2.4 2.1 1.7 3.7 3.9 4.2 6.6l.2 2.4.1 20.5-.1 6.7c-.1 2.2-.9 4.2-2.2 5.9-1.7 2.2-4 3.8-6.8 4.4-.6.1-1.2.2-1.9.2-.1.1-13.4.2-13.4.2zm-4-27.8c-.9-1.2-2.2-1.6-3.7-1.2-.4.1-.8.2-1.2.4-.3.1-.6.1-.8 0-.4-.1-.8-.3-1.2-.4-.3-.1-.7-.1-1-.1-1.5.2-2.4 1.1-3 2.6-.4 1.1-.3 2.2 0 3.5.4 1.5 1 2.9 2.1 4 .5.6 1.2.9 2 .6 1.1-.5 2.2-.5 3.4 0 .8.3 1.5 0 2.1-.6.7-.8 1.1-1.8 1.6-2.8v-.2c-1-.6-1.7-1.4-1.8-2.7-.2-1.4.5-2.4 1.5-3.1zm9.9-1.4c.1.2.1.3.1.4l3.6 9.5c.1.3.3.4.6.4h.7c.6 0 .6 0 .9-.6l3.7-9.4c.1-.1.1-.3.2-.5H39l-2.9 8.3-3.1-8.3-1.9.2zM27.3 18l-1.3.4c-.5.2-.5.2-.6.7v1.4h-1.6l.1 1.4h1.5v5c0 .7.1 1.4.2 2.1.1.5.3 1 .8 1.4.8.6 2.6.7 3.5.2l-.1-1.2h-1.3c-.5 0-.9-.3-1-.8-.1-.3-.2-.6-.2-1v-5.8H30c0-.5.1-1 0-1.4h-2.7V18zm-8.8-.9c-1.9.3-3 2-2.7 3.2 1.4.2 2.9-1.7 2.7-3.2z"/>
</svg>`;

			case 'spotify':
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
  <path fill="#1DB954" d="M25 .3C11.4.3.3 11.4.3 25S11.4 49.7 25 49.7 49.7 38.6 49.7 25 38.6.3 25 .3zm11.3 35.6c-.4.7-1.4 1-2.1.5-5.8-3.5-13.1-4.3-21.7-2.4-.8.2-1.7-.3-1.8-1.2-.2-.8.3-1.7 1.2-1.8 9.4-2.2 17.5-1.2 24 2.8.6.5.9 1.4.4 2.1zm3.1-6.7c-.6.9-1.7 1.2-2.6.6-6.6-4.1-16.8-5.3-24.6-2.9a1.96 1.96 0 0 1-2.4-1.3 1.96 1.96 0 0 1 1.3-2.4c9-2.7 20.1-1.4 27.7 3.3.8.6 1.1 1.8.6 2.7h0zm.2-7c-8-4.7-21.1-5.2-28.7-2.9-1.2.4-2.5-.3-2.9-1.5s.3-2.5 1.5-2.9c8.7-2.6 23.2-2.1 32.4 3.3 1.1.7 1.5 2.1.8 3.2-.6 1.1-2 1.4-3.1.8h0z"/>
</svg>`;

			case 'nest_mini':
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
  <path fill="#9da0a2" d="M49.7 25c0 13.6-11.1 24.7-24.8 24.7C11.3 49.7.3 38.6.3 25S11.4.3 25 .3 49.7 11.4 49.7 25zm-33.9 0a2.22 2.22 0 0 0-2.2-2.2c-1.2 0-2.3 1-2.3 2.2a2.22 2.22 0 0 0 2.2 2.2c1.3.1 2.3-.9 2.3-2.2h0zm10.8 0c0 1.2.9 2.2 2.2 2.3 1.3 0 2.3-1 2.3-2.2 0-1.3-1-2.3-2.2-2.3-1.3 0-2.3.9-2.3 2.2zm-3.2 0a2.22 2.22 0 0 0-2.2-2.2c-1.2 0-2.3 1-2.3 2.2a2.22 2.22 0 0 0 2.2 2.2c1.3 0 2.3-.9 2.3-2.2h0zm13 2.2a2.22 2.22 0 0 0 2.2-2.2c0-1.2-1-2.3-2.2-2.3a2.22 2.22 0 0 0-2.2 2.2c0 1.3 1 2.3 2.2 2.3z"/>
</svg>`;

			case 'sonos':
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <path fill="#9da0a2" d="M25.2,49.6l-13.65-.1a10.81,10.81,0,0,1-6.47-2.19A11.86,11.86,0,0,1,.8,41.13a27.31,27.31,0,0,1-.3-3V11.55A11,11,0,0,1,4.88,2.79,10.63,10.63,0,0,1,9.66.6a6.6,6.6,0,0,1,1.4-.1L27.49.4,38.35.5A10,10,0,0,1,45,2.89,11.11,11.11,0,0,1,49.2,9.46l.2,2.39.1,20.42-.1,6.67a10.42,10.42,0,0,1-2.19,5.88,11.58,11.58,0,0,1-6.77,4.38,11.08,11.08,0,0,1-1.9.2C38.45,49.5,25.2,49.6,25.2,49.6Zm2.23-23.94-5.27-4.94V29h1.57v-4.6L29,29.36V21.05H27.43ZM15.2,20.61A4.31,4.31,0,0,0,10.82,25a4.46,4.46,0,0,0,4.38,4.38,4.38,4.38,0,1,0,0-8.75m0,7.18A2.81,2.81,0,1,1,18,25a2.78,2.78,0,0,1-2.81,2.81M8.13,25a5.45,5.45,0,0,0-1.79-.78c-1.57-.45-1.57-.9-1.57-1.13,0-.44.56-.89,1.34-.89a3,3,0,0,1,1.46.45l.11.11,1.24-.9-.11-.11a3.86,3.86,0,0,0-2.7-1.12A3.45,3.45,0,0,0,4,21.28a2.24,2.24,0,0,0,0,3.59,5.42,5.42,0,0,0,1.8.79c1.57.44,1.57.89,1.57,1.12,0,.45-.56.9-1.35.9a3.24,3.24,0,0,1-1.46-.45l-.11-.12L3.19,28l.12.11A3.84,3.84,0,0,0,6,29.25a3.43,3.43,0,0,0,2.13-.68A2.34,2.34,0,0,0,9,26.78a2.53,2.53,0,0,0-.9-1.8M36,20.61A4.3,4.3,0,0,0,31.59,25,4.38,4.38,0,0,0,36,29.36,4.32,4.32,0,0,0,40.34,25,4.38,4.38,0,0,0,36,20.61m0,7.18A2.81,2.81,0,1,1,38.77,25,2.86,2.86,0,0,1,36,27.79M43,24.87a5.42,5.42,0,0,0,1.8.79c1.57.44,1.57.89,1.57,1.12,0,.45-.56.9-1.35.9a3.24,3.24,0,0,1-1.46-.45h-.11l-1.23.89.11.12a3.85,3.85,0,0,0,2.69,1.12,3.49,3.49,0,0,0,2.13-.67,2.25,2.25,0,0,0,0-3.6,5.36,5.36,0,0,0-1.79-.78c-1.57-.45-1.57-.9-1.57-1.12,0-.45.56-.9,1.34-.9a3.15,3.15,0,0,1,1.46.45l.12.11L48,22l-.11-.11a3.86,3.86,0,0,0-2.7-1.12,3.45,3.45,0,0,0-2.13.67,2.35,2.35,0,0,0-.9,1.8,1.67,1.67,0,0,0,.9,1.68" transform="translate(-0.5 -0.4)"/>
        </svg>`;

			// ── DYNAMIC ICONS ──────────────────────────────────────────────────

			case 'floorlamp': {
				const active = isOn && isRecent;
				const fill   = isOn ? (rgbColor !== 'none' ? rgbColor : 'var(--lc, #f5a623)') : 'none';
				return `<svg viewBox="0 0 24 24" class="${active ? 'on' : ''}" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes on {
                0% { transform: scale(0.85); }
                20% { transform: scale(1.1); }
                40% { transform: scale(0.95); }
                60% { transform: scale(1.03); }
                80% { transform: scale(0.97); }
                100% { transform: scale(1); }
              }
              .on { animation: on 0.8s; transform-origin: center; }
            </style>
            <rect width="24" height="24" fill="none"/>
            <path fill="#9da0a2" d="M11.6 15.5V1.4c0-.3-.2-.5-.5-.5H7.5c-.3 0-.5.2-.5.5v15.3c-.5.3-.8.7-.8 1.3v2.6c0 1.7 2.9 2.5 5.8 2.5s5.8-.9 5.8-2.5V18c0-1.8-3.2-2.6-6.2-2.5m-1 1.3c0 .1-.1.5-.8.5s-.8-.4-.8-.5V1.9h1.7v14.9z"/>
            <path fill="${fill}" d="M10.6 16.8c0 .1-.1 .5-.8 .5s-.8-.4-.8-.5V1.9h1.7v14.9z"/>
          </svg>`;
			}

				case 'gate': {
					const isOpen = (entityState === 'open' || entityState === 'opening');
					const isActive = (entityState === 'open' || entityState === 'opening' || entityState === 'closing');
					const gateColor = isActive ? '#ff4d4d' : '#9da0a2';
					const scaleX = isOpen ? '0.4' : '1';
					return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
            <style>
              .wing { transition: transform 2s cubic-bezier(0.4, 0, 0.2, 1); }
              .wing-left { transform-origin: 65px center; transform: scaleX(${scaleX}); }
              .wing-right { transform-origin: 447px center; transform: scaleX(${scaleX}); }
            </style>
            <rect x="20" y="80" width="45" height="352" rx="4" fill="${gateColor}" />
            <rect x="10" y="70" width="65" height="20" rx="2" fill="${gateColor}" />
            <rect x="10" y="422" width="65" height="20" rx="2" fill="${gateColor}" />
            <rect x="447" y="80" width="45" height="352" rx="4" fill="${gateColor}" />
            <rect x="437" y="70" width="65" height="20" rx="2" fill="${gateColor}" />
            <rect x="437" y="422" width="65" height="20" rx="2" fill="${gateColor}" />
            <g class="wing wing-left">
              <path d="M65 160 Q160 100 255 100 V400 H65 Z" fill="none" stroke="${gateColor}" stroke-width="14" stroke-linejoin="round"/>
              <line x1="130" y1="135" x2="130" y2="400" stroke="${gateColor}" stroke-width="12" stroke-linecap="round"/>
              <line x1="190" y1="110" x2="190" y2="400" stroke="${gateColor}" stroke-width="12" stroke-linecap="round"/>
              <line x1="65" y1="350" x2="255" y2="350" stroke="${gateColor}" stroke-width="12"/>
            </g>
            <g class="wing wing-right">
              <path d="M257 100 Q352 100 447 160 V400 H257 Z" fill="none" stroke="${gateColor}" stroke-width="14" stroke-linejoin="round"/>
              <line x1="382" y1="135" x2="382" y2="400" stroke="${gateColor}" stroke-width="12" stroke-linecap="round"/>
              <line x1="322" y1="110" x2="322" y2="400" stroke="${gateColor}" stroke-width="12" stroke-linecap="round"/>
              <line x1="257" y1="350" x2="447" y2="350" stroke="${gateColor}" stroke-width="12"/>
            </g>
          </svg>`;
			}

				case 'garage': {
					const isOpen = entityState === 'open' || entityState === 'opening';
					const color = isOpen ? '#ff4d4d' : '#9da0a2';
					const stateClass = isOpen ? 'on' : (isRecent ? 'off' : '');
					const path = `<path fill="#9da0a2" d="M24.933 11.355l19.948 3.894c.082.14.09 1.51 0 1.8l-39.761-.033c-.089-.283-.085-1.618.01-1.821z"/><rect fill="#9da0a2" width="1.966" height="20.53" x="5.006" y="18.115" rx=".256"/><rect fill="#9da0a2" width="1.966" height="20.53" x="43.028" y="18.115" rx=".256"/><rect fill="#707070" width="34.328" height="5.932" x="7.836" y="18.115" rx=".186"/><rect fill="#707070" width="34.328" height="7.032" x="7.836" y="24.863" rx=".186" ry=".22"/><rect fill="#707070" width="34.328" height="5.932" x="7.836" y="32.71" rx=".186"/>`;
					const car = `<path fill="#474b4d" d="M16.0195 23.7109C15.5919 24.4049 15.1131 25.2714 14.5781 26.3223L11.8164 29.0801V37.6621C11.8164 38.17 12.2304 38.584 12.7383 38.584H15.8027C16.3107 38.584 16.7246 38.17 16.7246 37.6621V36.7441H33.2754V37.6621C33.2754 38.17 33.6893 38.584 34.1973 38.584H37.2617C37.7696 38.584 38.1836 38.17 38.1836 37.6621V29.0801L35.4219 26.3223C34.8869 25.2714 34.4081 24.4049 33.9805 23.7109H33.3809C33.8204 24.3917 34.2878 25.2148 34.7617 26.2207L15.2852 26.2051C15.6558 25.3312 16.1128 24.4762 16.6191 23.7109L16.0195 23.7109Z"/>`;
					return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes garage-on { from { transform: scaleY(0); } to { transform: scaleY(1); } }
              @keyframes garage-off { from { transform: scaleY(1); } to { transform: scaleY(0); } }
              .on { animation: garage-on 0.1s forwards; transform-origin: -100% 46%; }
              .off { animation: garage-off 0.1s forwards; transform-origin: -100% 46%; }
            </style>
            <g class="${stateClass}">
              ${path}
              ${isOpen ? car : ''}
            </g>
          </svg>`;
			}

			case 'bedroom': {
				const active = isOn && isRecent;
				const fill = isOn ? '#22c55e' : '#9da0a2';
				return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.3); } 20% { transform: scale(1.1); } 40% { transform: scale(0.9); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 1s; transform-origin: center; }
            </style>
            <path fill="${fill}" d="M20 10V7A2 2 0 0 0 18 5H6A2 2 0 0 0 4 7V10A2 2 0 0 0 2 12V17H3.33L4 19H5L5.67 17H18.33L19 19H20L20.67 17H22V12A2 2 0 0 0 20 10M13 7H18V10H13M6 7H11V10H6M20 15H4V12H20Z"/>
          </svg>`;
			}

			case 'spa': {
				const fill = isOn ? '#e53935' : '#9da0a2';
				return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.5 -0.5 16 16" style="color:${fill}">
            <path d="M2.13125 7.5h10.7375s1.19375 0 1.19375 1.19375 0 1.19375-1.19375 1.19375H2.13125s-1.19375 0-1.19375-1.19375S0.9375 7.5 2.13125 7.5" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="M2.13125 9.8875h10.7375v4.175H2.13125Z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="m0.34375 14.0625 14.3125 0" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="m4.51875 9.8875 0 4.175" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="m7.5 9.8875 0 4.175" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="m10.48125 9.8875 0 4.175" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="M2.725 1.53125C4.79375 3.20625 1.875 4.0375 3.91875 5.7125" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="M6.90625 0.9375c2.0625 1.66875-0.875 2.5 1.1875 4.175" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
            <path d="M11.08125 1.53125c2.0625 1.675-0.875 2.5 1.19375 4.18125" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="1"/>
          </svg>`;
			}

			case 'movie': {
				const active = isOn && isRecent;
				const fill = isOn ? '#a78bfa' : '#9da0a2';
				return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.3); } 20% { transform: scale(1.1); } 40% { transform: scale(0.9); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 1s; transform-origin: center; }
            </style>
            <path fill="${fill}" d="M10 11L9.06 13.06L7 14L9.06 14.94L10 17L10.94 14.94L13 14L10.94 13.06M18 4L20 8H17L15 4H13L15 8H12L10 4H8L10 8H7L5 4H4C2.91 4 2 4.9 2 6L2 18C2 19.1 2.91 20 4 20H20C21.11 20 22 19.1 22 18V4H18M20 18H4V6.47L5.77 10H16L15.37 11.37L14 12L15.37 12.63L16 14L16.63 12.63L18 12L16.63 11.37L16 10H20V18Z"/>
          </svg>`;
			}

			case 'pool': {
				const active = isOn && isRecent;
				const fill = isOn ? '#3ea7fb' : '#9da0a2';
				return `<svg viewBox="0 0 329.994 329.994" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.3); } 20% { transform: scale(1.1); } 40% { transform: scale(0.9); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 1s; transform-origin: center; }
            </style>
            <g>
              <path fill="${fill}" d="M304.382,284.394c-7.35,7.352-10.954,10.603-19.385,10.603c-0.001,0-0.003,0-0.005,0 c-8.43,0.001-12.037-3.25-19.392-10.605c-8.177-8.176-19.374-19.372-40.55-19.391c-0.02,0-0.037-0.003-0.057-0.003 c-21.215,0.001-32.424,11.21-40.608,19.395c-7.353,7.353-10.959,10.604-19.388,10.604c-0.001,0-0.003,0-0.003,0 c-8.43,0.001-12.037-3.25-19.391-10.604c-8.176-8.176-19.373-19.37-40.546-19.392c-0.02,0-0.039-0.003-0.059-0.003 c-21.214,0.001-32.423,11.21-40.607,19.395c-7.354,7.353-10.96,10.604-19.391,10.604c-0.003,0-0.005,0-0.007,0 c-8.426,0-12.033-3.251-19.387-10.604l-0.003-0.003c-5.858-5.857-15.354-5.854-21.212,0.003 c-5.857,5.858-5.856,15.357,0.003,21.215c8.184,8.183,19.392,19.39,40.596,19.39c0.005,0,0.009,0,0.014,0 c21.208,0,32.417-11.208,40.601-19.392c7.347-7.347,10.956-10.599,19.368-10.607c0.008,0,0.017,0.001,0.025,0.001 c8.432,0,12.038,3.251,19.393,10.606c8.184,8.184,19.39,19.391,40.598,19.391c0.004,0,0.008,0,0.012,0 c21.207,0,32.416-11.208,40.6-19.391c7.348-7.348,10.955-10.6,19.37-10.607c0.009,0,0.018,0.001,0.026,0.001 c8.431,0,12.037,3.251,19.393,10.606c8.184,8.184,19.391,19.391,40.598,19.391c0.003-0.001,0.009,0,0.014,0 c21.208-0.001,32.417-11.209,40.599-19.393c5.857-5.857,5.855-15.356-0.003-21.213 C319.737,278.534,310.242,278.536,304.382,284.394z"/>
              <path fill="${fill}" d="M304.382,224.394c-7.35,7.352-10.954,10.603-19.385,10.603c-0.001,0-0.003,0-0.005,0 c-8.43,0.001-12.037-3.251-19.392-10.605c-7.515-7.515-17.587-17.573-35.607-19.168V69.997c0-19.299,15.701-35,35-35 c19.299,0,35,15.701,35,35c0,8.284,6.716,15,15,15c8.284,0,15-6.716,15-15c0-35.841-29.159-65-65-65 c-20.085,0-38.067,9.16-50,23.518c-11.933-14.358-29.916-23.518-50-23.518c-35.841,0-65,29.159-65,65v135.226 c-18.017,1.598-28.087,11.655-35.602,19.17c-7.354,7.353-10.96,10.605-19.391,10.605c-0.003,0-0.005,0-0.007,0 c-8.426,0-12.033-3.251-19.387-10.605l-0.003-0.003c-5.858-5.857-15.354-5.854-21.212,0.003 c-5.857,5.858-5.856,15.357,0.003,21.215c8.184,8.183,19.392,19.39,40.596,19.39c0.005,0,0.009,0,0.014,0 c21.208,0,32.417-11.208,40.601-19.392c7.347-7.347,10.956-10.599,19.368-10.607c0.008,0,0.017,0.001,0.025,0.001 c8.432,0,12.038,3.251,19.393,10.606c8.184,8.184,19.39,19.391,40.598,19.391c0.004,0,0.008,0,0.012,0 c21.207,0,32.416-11.208,40.6-19.391c7.348-7.348,10.955-10.6,19.37-10.607c0.009,0,0.018,0.001,0.026,0.001 c8.431,0,12.037,3.251,19.393,10.606c8.184,8.184,19.391,19.391,40.598,19.391c0.003-0.001,0.009,0,0.014,0 c21.208-0.001,32.417-11.209,40.599-19.393c5.857-5.859,5.855-15.356-0.003-21.213 C319.737,218.535,310.242,218.536,304.382,224.394z M129.994,124.997h70v30h-70V124.997z M164.994,34.997c19.299,0,35,15.701,35,35v25h-70v-25C129.994,50.698,145.695,34.997,164.994,34.997z M164.998,234.997c-0.001,0-0.003,0-0.003,0 c-8.43,0.001-12.037-3.251-19.391-10.605c-4.132-4.132-9.038-9.033-15.61-12.875v-26.52h70v26.52 c-6.571,3.842-11.477,8.743-15.608,12.875C177.034,231.746,173.427,234.997,164.998,234.997z"/>
            </g>
          </svg>`;
			}

			case 'relax': {
				const active = isOn && isRecent;
				const fill = isOn ? '#c7983e' : '#9da0a2';
				return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.3); } 20% { transform: scale(1.1); } 40% { transform: scale(0.9); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 1s; transform-origin: center; }
            </style>
            <path fill="${fill}" d="M13 3C16.9 3 20 6.1 20 10C20 12.8 18.4 15.2 16 16.3V21H9V18H8C6.9 18 6 17.1 6 16V13H4.5C4.1 13 3.8 12.5 4.1 12.2L6 9.7C6.2 5.9 9.2 3 13 3M13 1C8.4 1 4.6 4.4 4.1 8.9L2.5 11C1.9 11.8 1.9 12.8 2.3 13.6C2.7 14.3 3.3 14.8 4 14.9V16C4 17.9 5.3 19.4 7 19.9V23H18V17.5C20.5 15.8 22 13.1 22 10C22 5 18 1 13 1M14 14H12V13H14V14M15.6 9.5C15.3 9.9 15 10.3 14.5 10.6V12H11.5V10.6C10.1 9.8 9.6 7.9 10.4 6.5S13.1 4.6 14.5 5.4 16.4 8.1 15.6 9.5Z"/>
          </svg>`;
			}

			case 'cam': {
				const active = isOn && isRecent;
				const camPath = `<path d="M24.959 47.162C15.907 47.162 8.598 39.945 8.621 30.981L8.70699 3.403C8.70699 3.403 13.159 2.749 25.042 2.847C40.934 2.977 41.38 3.426 41.38 3.426L41.298 30.983C41.277 39.947 34.01 47.164 24.96 47.164L24.959 47.162Z" fill="#9DA0A2"/><path d="M24.92 45.005C16.708 45.005 10.112 39.918 10.096 33.598L10.054 16.466C10.721 9.951 15.204 7.54 25.019 7.32C35.059 7.096 39.695 10.959 39.829 16.692L39.745 33.596C39.714 39.916 33.134 45.003 24.921 45.003L24.92 45.005Z" fill="#ABABAB"/><path opacity="0.737" d="M11.518 31.165C11.518 38.61 17.554 44.646 24.999 44.646C32.444 44.646 38.48 38.61 38.48 31.165V28.525C38.48 21.08 32.444 15.044 24.999 15.044C17.554 15.044 11.518 21.08 11.518 28.525V31.165Z" fill="#0E0E0E"/><path fill="#1A1A1A" d="M17.015 30.819C17.015 35.482 20.61 39.261 25.045 39.261C29.48 39.261 33.075 35.482 33.075 30.819V29.166C33.075 24.503 29.48 20.724 25.045 20.724C20.61 20.724 17.015 24.503 17.015 29.166V30.819Z"/><path opacity="0.33" d="M25.028 24.818C22.058 24.818 19.652 27.224 19.652 30.194C19.652 33.164 22.058 35.57 25.028 35.57C27.998 35.57 30.404 33.164 30.404 30.194C30.404 27.224 27.998 24.818 25.028 24.818Z" fill="#333333"/><path opacity="0.83" d="M25.005 26.126C22.746 26.126 20.913 27.957 20.913 30.218C20.913 32.479 22.746 34.31 25.005 34.31C27.264 34.31 29.097 32.479 29.097 30.218C29.097 27.957 27.264 26.126 25.005 26.126Z" fill="#464646"/><path d="M25.035 29.169C24.467 29.169 24.009 29.629 24.009 30.195C24.009 30.761 24.469 31.221 25.035 31.221C25.601 31.221 26.061 30.763 26.061 30.195C26.061 29.627 25.601 29.169 25.035 29.169Z" fill="#606060"/>`;
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            ${camPath}
            ${isOn ? `
            <path d="M25.005 21.76C24.645 21.76 24.326 22.079 24.326 22.439C24.326 22.799 24.645 23.118 25.005 23.118C25.365 23.118 25.684 22.799 25.684 22.439C25.684 22.079 25.365 21.76 25.005 21.76Z" fill="#750000"/>
            <path d="M25.005 36.894C24.645 36.894 24.326 37.213 24.326 37.573C24.326 37.933 24.645 38.252 25.005 38.252C25.365 38.252 25.684 37.933 25.684 37.573C25.684 37.213 25.365 36.894 25.005 36.894Z" fill="#750000"/>
            <path opacity="0.638" d="M18.712 40.61L20.305 37.738C20.305 37.738 18.855 36.442 18.315 35.585C17.811 34.784 17.184 32.904 17.184 32.904L13.483 33.435C13.483 33.435 13.84 35.54 15.188 37.521C16.501 39.45 18.71 40.61 18.71 40.61H18.712Z" fill="#f54336"/>
            ` : ''}
          </svg>`;
			}

				case 'play_pause': {
					const active = isRecent;
					const playPath = `<path d="M0 0l166 83L0 166z" fill="#dedede"/>`;
					const pausePath = `<path d="M0 0h59.9v166H0zm106.1 0H166v166h-59.9z" fill="#dedede"/>`;
					return `<svg viewBox="0 0 166 166" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-scaleup { 0% { opacity: 0; transform: scale(0); } 20% { transform: scale(1); } 30% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
              .ci-on { animation: ci-scaleup 1s forwards; transform-origin: center center; }
            </style>
	            ${entityState === 'playing' ? playPath : (entityState === 'paused' ? pausePath : playPath)}
	          </svg>`;
				}

			case 'hue': {
				const active = isOn && isRecent;
				const fill = isOn ? (rgbColor !== 'none' ? rgbColor : 'var(--lc, #f5a623)') : '#9da0a2';
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.85); } 20% { transform: scale(1.1); } 40% { transform: scale(0.95); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 0.8s; transform-origin: center; }
            </style>
            <path fill="#9da0a2" d="M27.4 47.3h-4.9s-.7.1-.7.8.4.9.7.9h4.9c.3 0 .7-.1.7-.9s-.7-.8-.7-.8zm3.3-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-3H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9s-.9-.8-.9-.8zm5.2-23.2c-3.3-5.3-7-5.6-10.9-5.6-3.8 0-8.4.4-10.9 5.6-.1.1-.1.3.1.7.4.8 3.3 7.2 3.2 18.8 0 1.1-.1 1.6 0 1.7 0 .1 0 .7 1.1.7h13c1 0 1-.5 1.1-.7v-1.7c-.1-11.6 2.8-18 3.2-18.8.1-.4.1-.5.1-.7"/>
            <path fill="${fill}" d="M14.1 15.3c3.4-.3 7-.4 10.9-.4 3.8 0 7.5.2 10.9.4.4-.4.7-.8.9-1.1C39 8.5 38.9 6.5 38.9 6c-.2-4.4-8.4-5-12.1-5h0-3.4c-3.7 0-12 .5-12.1 5 0 .5-.1 2.5 2.1 8.2 0 .3.3.8.7 1.1z"/>
          </svg>`;
			}


			case 'shade': {
				const active = isOn && isRecent;
				const fill = isOn ? (rgbColor !== 'none' ? rgbColor : 'var(--lc, #f5a623)') : '#9da0a2';
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.85); } 20% { transform: scale(1.1); } 40% { transform: scale(0.95); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 0.8s; transform-origin: center; }
            </style>
            <path fill="#9da0a2" d="M26.4 25.6c.6-.3 1.1-.7 1.1-1.3L25 17.9l-2.5 6.4c0 .7.6 1.1 1.1 1.3v20.8h-5.5v2.7h13.7v-2.7h-5.5V25.6z"/>
            <path fill="${fill}" d="M24.6.9l-9.4.5c-.6.1-1.9 0-2.5 2.1s-2.4 9.1-4 16.9c-.2.7-.5 2-.5 2.3s-.4 1.6.9 1.6c.8.1 7.4.3 15.9.3 8.6 0 15.1-.3 15.9-.3 1.3-.1.9-1.3.9-1.6s-.3-1.6-.5-2.3c-1.6-7.8-3.4-14.8-4-16.9s-1.9-2-2.5-2.1c-1.6-.2-6.9-.4-9.4-.5"/>
          </svg>`;
			}

			case 'tv': {
				const color = isOn ? '#7fdbe9' : '#9da0a2';
				const tvPath = `<path d="M46 9.2v27.5H4.1V9.2H46m2.4-2.4H1.6v32.3h46.7c.1 0 .1-32.3.1-32.3zM11.9 43.2h26.3c.6 0 1.1-.4 1.1-1v-.3c0-.6-.4-1.1-1-1.1H11.9c-.6 0-1.1.4-1.1 1v.3a1.11 1.11 0 0 0 1.1 1.1z" fill="${isOn ? '#616161' : '#9da0a2'}"/>`;
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="tv-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#64acb7"/><stop offset="100%" stop-color="#7fdbe9"/></linearGradient></defs>
            ${isOn ? `<rect x="3" y="8" width="44" height="30" fill="url(#tv-grad)" opacity="0.8"/>` : ''}
            ${tvPath}
          </svg>`;
			}

			case 'ps5': {
				const active = isOn;
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes ps5-scroll { 50% { transform: translateY(-45%); } 100% { transform: translateY(0); } }
              .ps5-anim { animation: ps5-scroll 2s cubic-bezier(0.55, 0.085, 0.68, 0.53) both; }
            </style>
            ${active ? `
            <defs><clipPath id="ps5-mask"><path d="M47.5 33.2c-.5-2.2-3.9-3.5-9.1-3.9-3.8-.3-7.5.6-11.1 1.9l-.6.2v-5.7l-5.7.8-4.6 1.6L6 31.9h-.1c-1.9.7-3.8 2.2-3.7 4.2.1 2.1 4.7 2.6 8.2 3.2 3.3.6 6.2.2 8.9-.7l7.3 4.8L33 41l10.7-4h.1c2.8-1 4-2.5 3.7-3.8zm-31.3 2l-3.6 1.3c-2.2.8-4.1-1.1-2.1-1.9l1.7-.6 7.2-2.7v2.8l-3.2 1.1zm22.5-1.1l-1.9.7-10.2 3.7V36l6.5-2.4 3.8-1.3c4-.9 5.6.5 1.8 1.8z"/></clipPath></defs>
            <g style="clip-path:url(#ps5-mask)">
              <g class="ps5-anim">
                <path fill="#00aa9e" d="M49.2 38.9l-75.6-25.1v7.4l75.6 25.2z"/>
                <path fill="#f3c202" d="M49.2 46.4l-75.6-25.2v7.5l75.6 25.1z"/>
                <path fill="#326db3" d="M49.2 53.8l-75.6-25.1V51l75.6 25.1zm0-22.3L-26.4 6.4v7.4l75.6 25.1z"/>
              </g>
            </g>
            <path fill="#de0029" d="M26.7 14.6v28.7l-7.3-2.5V7.1l9.3 2.6c6 1.7 9.6 5 9.6 10.7-.1 6.7-3 9.4-8.7 7.6V14.9c-.1-1.6-2.9-1.7-2.9-.3h0z"/>
            ` : `
            <path fill="#9da0a2" d="M43.8 37h-.1l-10.6 4-4.2 1.6v-4.9l8-2.9 1.9-.7c3.8-1.3 2.2-2.7-1.8-1.9l-3.8 1.3-4.3 1.6v-4.5c3.1-1 6.3-1.6 9.5-1.4 5.3.4 8.7 1.6 9.1 3.9.3 1.4-.9 2.9-3.7 3.9zm-26.7-2.1l-.9.3-3.6 1.3c-2.2.8-4.1-1.1-2.1-1.9l1.7-.6 5-1.9v-4.2l-.6.2L6 31.9h-.1c-1.9.7-3.8 2.2-3.7 4.2.1 2.1 4.7 2.6 8.2 3.2 2.4.4 4.6.3 6.7-.1v-4.3zm12.4-20V28c5.7 1.7 8.7-.9 8.7-7.6.1-5.7-3.6-9-9.6-10.7l-9.3-2.6v33.8l7.2 2.5.1.1V14.6c.1-1.4 2.9-1.3 2.9.3z"/>
            `}
          </svg>`;
			}

				case 'spot': {
					const id = Math.random().toString(36).substring(2, 9);
					const stage = (isOn && isRecent) ? 'on' : (!isOn && isRecent ? 'off' : (isOn && !isRecent ? 'on_timeout' : ''));
					// Off state must be a consistent HA-style grey (NOT fg-muted), even when used outside button-card tiles.
					const offFill = 'var(--state-icon-color, #9da0a2)';
					const lightFill = isOn
						? (rgbColor !== 'none' ? rgbColor : 'var(--lc, #f5a623)')
						: offFill;
					return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
	            <g id="spot-${id}">
		            <style>
	              @keyframes spot-on-${id} {
	                0% { transform: rotateZ(0deg); animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0); }
	                70% { transform: rotateZ(-15deg); animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
                75% { transform: rotateZ(-15deg); animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
                88% { transform: rotateZ(-11deg); }
                100% { transform: rotateZ(-15deg); }
              }
              @keyframes spot-off-${id} {
                0% { transform: rotateZ(-15deg); animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0); }
                70% { transform: rotateZ(0deg); animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
                75% { transform: rotateZ(0deg); animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
                88% { transform: rotateZ(-4deg); }
                100% { transform: rotateZ(0deg); }
              }
	              #spot-${id} .on { animation: spot-on-${id} 0.7s; transform-origin: 40% 20%; animation-fill-mode: forwards; animation-delay: -0.1s; }
		              #spot-${id} .off { animation: spot-off-${id} 0.7s; transform-origin: 40% 20%; animation-fill-mode: forwards; }
		              #spot-${id} .on_timeout { transform: rotateZ(-15deg); transform-origin: 40% 20%; }

									/* Override global light-color fill so off state matches HA grey everywhere. */
									#spot-${id} .light-color { fill: ${lightFill}; }
		            </style>
		            <path style="clip-path: url(#mask-spot-${id});" fill="${offFill}" d="M40.5.8H17.1c-.1 0-.1 0-.1.1A3.12 3.12 0 0 0 20.1 4h6.1c.1 0 .1 0 .1.1v7.4L18 19.1l3.6 3.5 9.1-8.6c.4-.4.6-1 .7-1.6V4c0-.1 0-.1.1-.1h6c1.7.1 3.1-1.3 3-3.1z"/>
		            <defs>
		              <clipPath id="mask-spot-${id}">
		                <path class="${stage}" d="M0 9.1h24l8.3 8.8H50V-9H0z"/>
		              </clipPath>
	            </defs>
	            <path class="${stage} light-color" fill="${lightFill}" d="M25.5 46.4s1.4.5 10.4-8.2c.5-.4 6.3-6.3 5.8-7.1-.7-.8-18.6-19.5-18.6-19.5s-.6-.9-8.6 6.4c-.6.5-8.7 8-7.7 9.1l18.7 19.3z"/>
            </g>
	          </svg>`;
			}

			case 'imac': {
				const active = isOn && isRecent;
				const fill = isOn ? '#72757c' : '#9da0a2';
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes imac-on { from { opacity: 0.5; transform: scale(0.6); } 100% { opacity: 1; transform: scale(1); } }
              .ci-on { animation: imac-on 0.8s cubic-bezier(0.25, 1, 0.5, 1); transform-origin: center; }
            </style>
            <path d="M31.9 44.5c-1-.3-1.9.4-1.9-3.7h-9.9c0 4.2-.9 3.4-1.9 3.7s-.2.7-.2.7h14.1s.8-.3-.2-.7zM47.6 4.8H2.5c-1.1 0-2 .9-2 2v30.1c0 1.1.9 2 2 2h45c1.1 0 2-.9 2-2v-30a1.95 1.95 0 0 0-1.9-2.1zm-.7 26.4H3.2V7.6H47v23.6z" fill="${fill}"/>
          </svg>`;
			}

			case 'monitors': {
				if (!isOn) {
					// Off state: preserve the original single-path silhouette so cutouts stay transparent.
					return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <path fill="#9da0a2" d="M25 18.6c-4.6 0-8.4 3.8-8.4 8.4s3.8 8.4 8.4 8.4 8.4-3.8 8.4-8.4-3.7-8.4-8.4-8.4zm0 11.7a3.33 3.33 0 0 1-3.3-3.3 3.33 3.33 0 0 1 3.3-3.3 3.33 3.33 0 0 1 3.3 3.3c0 1.8-1.4 3.3-3.3 3.3zM39.2 1H10.9C9.4 1 8.3 2.1 8.3 3.6v42.9a2.65 2.65 0 0 0 2.6 2.6h28.3a2.65 2.65 0 0 0 2.6-2.6v-43C41.7 2 40.5.9 39.2 1zM25 7c1.3 0 2.4 1.1 2.4 2.4s-1.1 2.4-2.4 2.4-2.4-1.1-2.4-2.4S23.7 7 25 7zm10.3 35.5l-.4 1.9s-.2.6-.6.6H15.8c-.4 0-.6-.6-.6-.6l-.4-1.9c-.2-.9.6-.9.6-.9h19.3s.9.1.6.9zM25 38.2c-6.2 0-11.3-5.1-11.3-11.3a11.29 11.29 0 1 1 22.6 0c.1 6.3-5 11.3-11.3 11.3z"/>
          </svg>`;
				}

				// On/playing: preserve your original multi-layer fills + animations.
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes cone {
                35% { transform: scale(0.8); animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1); }
                36% { transform: translateY(0%); }
                49% { transform: scale(1.25); }
                63% { transform: scale(0.85); animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1); }
                77% { transform: scale(1.15); animation-timing-function: cubic-bezier(0, 0.55, 0.45, 1); }
                95% { transform: scale(1); }
              }
              .cone { animation: cone 1.2s; transform-origin: center; }
              @keyframes speaker {
                0% { transform: scale(1); }
                40% { transform: scale(1); }
                49% { transform: scale(0.95); }
                63% { transform: scale(1); }
                77% { transform: scale(0.95); }
                100% { transform: scale(1); }
              }
              .speaker { animation: speaker 1.3s; transform-origin: center; }
            </style>
            <g class="speaker">
              <path fill="#686868" d="M35.8 46.9H14.2c-1.1 0-2-1-2-2.3V6.7c0-1.3.9-2.3 2-2.3h21.5c1.1 0 2 1 2 2.3v37.9c0 1.2-.9 2.3-1.9 2.3z"/>
              <path fill="#2a2a2a" d="M39.2 1H10.8C9.4 1 8.3 2.1 8.2 3.5v42.9a2.65 2.65 0 0 0 2.6 2.6h28.3c1.4 0 2.5-1.2 2.6-2.6V3.5c0-1.4-1.1-2.5-2.5-2.5zM25 7c1.3 0 2.4 1.1 2.4 2.4s-1.1 2.4-2.4 2.4-2.4-1.1-2.4-2.4C22.5 8 23.6 7 25 7zm10.2 35.5l-.4 1.9s-.2.6-.6.6H15.8c-.4 0-.6-.6-.6-.6s-.1-1.1-.4-1.9.6-.9.6-.9h19.3c0-.1.8-.1.5.9z"/>
            </g>
            <path class="cone" fill="#e5dd00" d="M25 15.7c-6.2 0-11.3 5.1-11.3 11.3S18.8 38.3 25 38.3 36.3 33.2 36.3 27c-.1-6.3-5.1-11.3-11.3-11.3zm0 14.5a3.33 3.33 0 0 1-3.3-3.3 3.33 3.33 0 0 1 3.3-3.3 3.33 3.33 0 0 1 3.3 3.3c-.1 1.9-1.5 3.3-3.3 3.3z"/>
          </svg>`;
			}

			case 'lamp': {
				const active = isOn && isRecent;
				const fill = isOn ? (rgbColor !== 'none' ? rgbColor : 'var(--lc, #f5a623)') : '#9da0a2';
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.85); } 20% { transform: scale(1.1); } 40% { transform: scale(0.95); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 0.8s; transform-origin: center; }
            </style>
            <path fill="#9da0a2" d="M26.5 21.8l3.8-6.1H19.7l3.8 6.1c-5 .7-6.3 5.8-5.7 10.2.7 5.1 3.2 10.1 5.7 14.4H19v2.5h11.8v-2.5h-4.5C29 42 31.4 37 32.1 32c.6-4.4-.6-9.4-5.6-10.2zm3.1 9.1c-.3 4.3-2.3 8.7-4.4 12.4l-.2.1v.1-.1c-1.8-3-3.3-6.4-4.1-9.7-.7-3.1-1-7.2 2.7-8.4 1.4-.5 3.1-.1 4.2.8 1.6 1 1.8 3 1.8 4.8z"/>
            <path fill="${fill}" d="M38.1 20L35.7 3.8c-.3-1.9-.4-1.7-.6-2-.9-.6-2.3-.7-2.3-.7H17.4s-1.4 0-2.3.7c-.2.3-.3.1-.6 2C14 5.7 11.9 20 11.9 20s5.8.3 13.4.3h0c7.3 0 12.8-.3 12.8-.3z"/>
          </svg>`;
			}

			case 'tvlights': {
				const active = isOn && isRecent;
				const fill = isOn ? (rgbColor !== 'none' ? rgbColor : 'var(--lc, #f5a623)') : 'transparent';
				return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.85); } 20% { transform: scale(1.1); } 40% { transform: scale(0.95); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 0.8s; transform-origin: center; }
            </style>
            <path fill="#9da0a2" d="M2.95 3L2 6.91L19.34 11.25L20.29 7.34L2.95 3M6.09 6.89L4.16 6.41L4.64 4.46L6.57 4.94L6.09 6.89M9.94 7.86L8 7.38L8.5 5.42L10.42 5.91L9.94 7.86M13.8 8.82L11.87 8.34L12.35 6.39L14.27 6.87L13.8 8.82M17.65 9.79L15.72 9.31L16.2 7.35L18.13 7.84L17.65 9.79M4.66 12.75L3.71 16.66L21.05 21L22 17.1L4.66 12.75M7.8 16.65L5.88 16.16L6.35 14.21L8.28 14.69L7.8 16.65M11.65 17.61L9.73 17.13L10.2 15.18L12.13 15.66L11.65 17.61M15.5 18.58L13.58 18.09L14.06 16.14L16 16.62L15.5 18.58M19.36 19.54L17.43 19.06L17.91 17.11L19.84 17.59L19.36 19.54M6.25 12.11L11 10.2L17.75 11.89L13 13.8L6.25 12.11Z"/>
            <path fill="${fill}" d="M2.95 3L2 6.91L19.34 11.25L20.29 7.34L2.95 3M6.09 6.89L4.16 6.41L4.64 4.46L6.57 4.94L6.09 6.89M9.94 7.86L8 7.38L8.5 5.42L10.42 5.91L9.94 7.86M13.8 8.82L11.87 8.34L12.35 6.39L14.27 6.87L13.8 8.82M17.65 9.79L15.72 9.31L16.2 7.35L18.13 7.84L17.65 9.79M4.66 12.75L3.71 16.66L21.05 21L22 17.1L4.66 12.75M7.8 16.65L5.88 16.16L6.35 14.21L8.28 14.69L7.8 16.65M11.65 17.61L9.73 17.13L10.2 15.18L12.13 15.66L11.65 17.61M15.5 18.58L13.58 18.09L14.06 16.14L16 16.62L15.5 18.58M19.36 19.54L17.43 19.06L17.91 17.11L19.84 17.59L19.36 19.54M6.25 12.11L11 10.2L17.75 11.89L13 13.8L6.25 12.11Z"/>
          </svg>`;
			}

				case 'climate': {
				const active = entityState === 'cool' || entityState === 'fan_only';
				const color = active ? '#5daeea' : '#9da0a2';
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <path fill="${color}" d="M36.8 1.2v1.7a5.34 5.34 0 0 1-5.3 5.3H18.4a5.34 5.34 0 0 1-5.3-5.3V1.2c-2.6.4-4.7 2.8-4.7 5.6v36.5c0 3.1 2.6 5.7 5.7 5.7h21.8c3.1 0 5.7-2.6 5.7-5.7V6.8c0-2.8-2.1-5.2-4.8-5.6zm-1.7 35.6c-.2 0-.4 0-.5-.1-.4-.1-1.2-.2-2.4-.6-.5-.2-.8-.3-1.2-.4-.3-.1-.7-.3-1.4-.5-1-.4-1.5-.5-1.9-.6-.5-.1-1.1-.2-1.9-.2s-1.4.2-1.9.4c-1 .3-1.8.7-2.1.9l-.6.3a9.75 9.75 0 0 1-1.4.6c-.3.1-.9.3-1.6.3h-.3c-.4 0-1 0-2-.2-.3-.1-.6-.1-.8-.2v-2.7l1.3.3c.5.1 1.3.2 1.7.2.5 0 .9-.2 1.1-.2.4-.1.6-.2 1-.4.2-.1.4-.2.7-.4.4-.2 1.3-.7 2.5-1 .6-.2 1.4-.4 2.5-.5s2 .1 2.5.2c.6.1 1.2.3 2.2.7l1.5.5c.3.1.6.2 1 .4 1 .3 1.8.5 2.1.5h.1v2.7zm0-6c-.2 0-.4 0-.5-.1-.4-.1-1.2-.2-2.4-.6-.5-.2-.8-.3-1.2-.4-.3-.1-.7-.3-1.4-.5-1-.4-1.5-.5-1.9-.6-.5-.1-1.1-.2-1.9-.2s-1.4.2-1.9.4c-1 .3-1.8.7-2.1.9l-.6.3a9.75 9.75 0 0 1-1.4.6c-.3.1-.9.3-1.6.3h-.3c-.4 0-1 0-2-.2-.3-.1-.6-.1-.8-.2v-2.7l1.3.3c.5.1 1.3.2 1.7.2.5 0 .9-.2 1.1-.2.4-.1.6-.2 1-.4.2-.1.4-.2.7-.4.4-.2 1.3-.7 2.5-1 .6-.2 1.4-.4 2.5-.5s2 .1 2.5.2c.6.1 1.2.3 2.2.7l1.5.5c.3.1.6.2 1 .4 1 .3 1.8.5 2.1.5h.1v2.7zm0-6c-.2 0-.4 0-.5-.1-.4-.1-1.2-.2-2.4-.6-.5-.2-.8-.3-1.2-.4-.3-.1-.7-.3-1.4-.5-1-.4-1.5-.5-1.9-.6-.5-.1-1.1-.2-1.9-.2s-1.4.2-1.9.4c-1 .3-1.8.7-2.1.9l-.6.3c-.4.2-.8.4-1.4.6-.3.1-.9.3-1.6.3h-.3c-.4 0-1 0-2-.2-.3-.1-.6-.1-.8-.2v-2.7l1.3.3c.5.1 1.3.2 1.7.2.5 0 .9-.2 1.1-.2.4-.1.6-.2 1-.4.2-.1.4-.2.7-.4.4-.2 1.3-.7 2.5-1 .6-.2 1.4-.4 2.5-.5s2 .1 2.5.2c.6.1 1.2.3 2.2.7l1.5.5c.3.1.6.2 1 .4 1 .3 1.8.5 2.1.5h.1v2.7zM15.7 1.9v-.8h18.6V3c0 1.5-1.2 2.8-2.8 2.8H18.4c-1.5 0-2.8-1.2-2.8-2.8V1.9z"/>
          </svg>`;
			}

			case 'bathroom': {
				const stateClass = (isOn && isRecent) ? 'on' : (isOn && !isRecent ? 'on_timeout' : (!isOn && isRecent ? 'off' : ''));
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes bath-on { 0% { transform: rotateZ(0deg) translate(0%, 0%); } 100% { transform: rotateZ(-90deg) translate(-1.5%, 0%); } }
              @keyframes bath-off { 0% { transform: rotateZ(-90deg) translate(-1.5%, 0%); } 45% { transform: rotateZ(-40deg); } 55% { transform: rotateZ(0deg); } 65% { transform: rotateZ(-15deg); } 75% { transform: rotateZ(0deg); } 85% { transform: rotateZ(-5deg); } 95% { transform: rotateZ(0deg); } }
              .on { animation: bath-on 0.45s forwards; transform-origin: 45% 41%; transition-timing-function: cubic-bezier(0.85, 0, 0.15, 1); }
              .on_timeout { transform: rotateZ(-90deg) translate(-1.5%, 0%); transform-origin: 45% 41%; }
              .off { animation: bath-off 1.1s linear; animation-delay: 0.05s; animation-fill-mode: both; transform-origin: 45% 41%; }
            </style>
            <g fill="#9da0a2">
              <path d="M12.9 1.2h2.5c1.6 0 2.9 1.3 2.9 2.9v18.6c0 1.4 1.1 2.5 2.4 2.5h20.5c.5 0 1 .4.9 1-.1 2.6-1.2 9.6-10.2 11v7.6c0 .2.2.4.4.4h1.5a1.58 1.58 0 0 1 1.6 1.6v.3a1.58 1.58 0 0 1-1.6 1.6H11a1.58 1.58 0 0 1-1.6-1.6v-.3a1.58 1.58 0 0 1 1.6-1.6h1.6c.2 0 .4-.2.4-.4v-7.6s-5.2-.3-5.2-5.9V4.2c0-1.6 1.3-2.9 2.9-2.9l2.2-.1z"/>
              <path class="${stateClass}" d="M22.3 18.8h18.3a1.58 1.58 0 0 1 1.6 1.6v.6a1.58 1.58 0 0 1-1.6 1.6h-19c-.4 0-.7-.3-.8-.7v-2.3c0-.4.3-.7.7-.8h.8z"/>
            </g>
          </svg>`;
			}

			case 'fan2': {
				const id = Math.random().toString(36).substring(2, 9);
				const path = `<circle cx="25" cy="25" r="6.6"/><path d="M31.9 30.4c-.5.6-1.1 1.1-1.7 1.5-1.4 1.1-3.2 1.7-5.2 1.7-2.3 0-4.5-.9-6-2.4-.9 1.1-1.6 2.3-2.3 3.2l-4.9 5.4c-1.8 2.7.3 5.6 2.5 7 3.9 2.4 9.8 3.1 14.1 1.9 4.6-1.3 7.9-4.7 7.4-9.7-.2-3.4-1.9-6-3.9-8.6zM17 28.3c-.4-1-.6-2.1-.6-3.3a8.7 8.7 0 0 1 6.4-8.4l-1.6-3.5L19 6.2c-1.5-2.8-5-2.5-7.3-1.2-4 2.2-7.5 6.9-8.7 11.3-1.2 4.6.2 9.2 4.7 11.3 3.1 1.3 6.1 1.2 9.3.7zm26.9-17.6c-3.3-3.4-8-4.6-12.1-1.8-2.8 1.8-4.2 4.6-5.5 7.5 4.2.6 7.4 4.2 7.4 8.6 0 .9-.1 1.7-.4 2.5 1.3.2 2.8.3 3.8.4 2.3.4 4.7 1.3 7.1 1.7 3.2.3 4.7-3 4.8-5.6.3-4.6-1.9-10.1-5.1-13.3z"/>`;
				const fill = isOn ? '#5daeea' : '#9ca2a5';
				return `<svg viewBox="0 0 50 50">
            <style>
              @keyframes fan-rotate-${id} {
                0% { transform: rotate(0deg) translateZ(0); }
                100% { transform: rotate(1080deg) translateZ(0); }
              }
              .fan-spin { animation: fan-rotate-${id} 5.5s linear infinite; transform-origin: center; fill: ${fill}; will-change: transform; }
              .fan-off { fill: #9ca2a5; }
            </style>
            <g class="${isOn ? 'fan-spin' : 'fan-off'}">${path}</g>
          </svg>`;
			}

			case 'closet': {
				const stateClass = (isOn && isRecent) ? 'on' : (isOn ? 'on_timeout' : (!isOn && isRecent ? 'off' : ''));
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes closet-on { 0% { transform: none; fill: #9da0a2; } 100% { transform: skewY(10deg) translate(4.5%, -3.9%) scaleX(0.8); fill: #b68349; } }
              @keyframes closet-off { 0% { transform: skewY(10deg) translate(4.5%, -3.9%) scaleX(0.8); fill: #b68349; } 100% { transform: none; fill: #9da0a2; } }
              .on { animation: closet-on 0.5s forwards; }
              .on_timeout { transform: skewY(10deg) translate(4.5%, -3.9%) scaleX(0.8); fill: #b68349; }
              .off { animation: closet-off 0.4s forwards; }
            </style>
            <path d="M11.4,1.4h27.2v43.1H11.4V1.4z" fill="#bcbcbc" opacity="${isOn ? 1 : 0}" style="transition: opacity 0.5s"/>
            <path class="${stateClass}" fill="#9da0a2" d="M11.4 1.4v43.1h27.2V1.4H11.4zm23 23.4c0 1.1-.9 1.9-1.9 1.9h0c-1.1 0-1.9-.9-1.9-1.9V21c0-1.1.9-1.9 1.9-1.9h0c1.1 0 1.9.9 1.9 1.9v3.8z"/>
          </svg>`;
			}

			case 'away': {
				const active = isOn && isRecent;
				const fill = isOn ? '#516d82' : '#9da0a2';
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes away-on { 10%, 20%, 100% { transform: rotateZ(0deg); } 30%, 50%, 70% { transform: rotateZ(7deg); } 90% { transform: rotateZ(3deg); } 40%, 60%, 80% { transform: rotateZ(-7deg); } }
              .ci-anim { animation: away-on 1.35s cubic-bezier(0.5, 1, 0.89, 1) both; transform-origin: 70% 80%; }
            </style>
            <path class="${active ? 'ci-anim' : ''}" fill="${fill}" d="M32.1 18.4s.3-1.6.7-2.1c.3-.6.9-1.4 1.6-1.8.6-.4 1.1-.7 1.4-.7s.7-.1 1 .1.6.4.8 1.3l.3 2.7.1 2.4.2 4.1c0 .3.2 3.1.2 3.3s.2 2.7.2 3.2l-.1 2.5c.1 1.6.5 3.1-.2 4.6-.6 1.4-1.7 2.7-2.9 3.6-.5.4-1.9 1.3-2.9 1.7-1.1.5-2.2.8-3.3 1.1-.5.1-1.4.4-2.3.3s-1.8-.6-2.1-1l-1.6-2.3c-.6-.8-2.1-2.3-2.3-2.5l-2.7-2.8c-.2-.2-2.7-3.5-2.9-3.8l-3.1-4.7-1.8-3.2-1.5-2.8-.9-1.8c-.1-.2-.3-1.1-.2-1.4.3-1.2 1.4-1.4 2.3-.7.3.2.9 1 1.1 1.3s6.1 8.1 6.1 8.1c.2.3.7.3.9 0s-.1-.7-.2-.9c-.4-.6-8.3-11.5-8.3-11.5s-.6-.9-.7-1.1c-.3-1.1 0-2.3 1.1-2.7s1.9.3 2.6 1.1c.3.3 8.3 11.5 8.3 11.5.2.2.3.3.5.3.3 0 .5-.4.4-.7-.1-.2-.5-.9-.5-.9L11.8 9c-.6-1-.9-2-.1-3 .7-.8 2.2-1.3 3-.2.3.3 10.1 14.3 10.1 14.3.2.2.5.4.7.3.5-.1.3-.7.1-1-.1-.2-8.4-11.8-8.4-11.8-.4-.9-.6-2 .2-2.8 1-1.1 2.5-.5 3.3.5.2.3 1 1.4 1 1.4l2.7 3.7c.1.2 3.4 4.4 3.8 4.8.9 1.1 1.8 2.2 2.7 3.2l.5.5c.1.1.1.4.1.8 0 1.3.1 2.6.1 3.9 0 .2.1.4.2.6.3.3.6.1.7-.2.1-.2 0-2.4 0-2.7-.3-.3-.5-1.3-.4-2.9zM12.2 46.9s-2.8-.8-4.8-2.7-2.6-2.7-2.8-3-1.8-3-2-3.6c-.2-.5-.2-.7.2-1 .4-.4 1-.5 1.3.1.1.2.4 1 .5 1.2s1 1.9 1.7 2.8 1.6 2.2 4.4 3.8c.6.3 1.2.6 1.9.9.3.1.6.2.8.4.1.2.1.6-.1.8-.2.4-.7.4-1.1.3zM7.1 30.7l.9 3.1c.3.7 1.1 2.3 1.9 3.3s2.4 2.6 3.4 3.2 2 1.1 3 1.5c1 .3 1.1.4 1.2.5.3.4.2 1.2-.4 1.3-.2 0-1.2 0-1.8-.3L12 41.7c-.5-.4-3.9-3.1-5.1-6S5.3 31 5.2 30.4s-.2-1.1 0-1.4c.3-.4.9-.8 1.3-.3.2.3.3.6.3.9.1 0 .2.8.3 1.1zm26.8-25s.2-.1.5-.1.8.3 1.4.7 1.9 1 3.6 2.9 2.9 3.9 3.4 5.8c.5 1.8.8 3.1.9 5.5 0 .5.1 1.6 0 1.7-.2.5-.5.7-1 .7-.6 0-.7-.5-.7-1l-.1-2.9c-.1-.6-.3-1.9-.7-2.9-.3-1-.7-2.3-1.7-3.6-.9-1.3-2.1-2.8-3.2-3.5l-2.4-1.5c-.6-.6-.7-1.2 0-1.8zm4.9-2.5s.3-.2.5-.1c.2 0 .7.3.9.4s2.1 1.3 3.6 3c1.5 1.6 3.5 5.1 3.7 7.4.1.4.2.9 0 1-.2.2-.4.4-.7.4-.2 0-.5 0-.7-.1-.1-.2-.4-1.1-.4-1.3s-.6-2-1.1-3.1C44 9.7 43.5 8.5 42 7.1s-2.2-1.9-2.8-2.2-1.1-.6-1.1-1c.1-.3.3-.6.7-.7z"/>
          </svg>`;
			}

			case 'home': {
				const active = isOn && isRecent;
				return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <style>
              @keyframes on {
                0% { transform: scale(0.85); }
                20% { transform: scale(1.1); }
                40% { transform: scale(0.95); }
                60% { transform: scale(1.03); }
                80% { transform: scale(0.97); }
                100% { transform: scale(1); }
              }
              .on { animation: on 0.8s; transform-origin: center; }
            </style>
            <path class="${active ? 'on' : ''}" d="M42.2 28.3c0-.8-.2-1-.2-1L26 12.1s-.5-.4-1-.4-1 .3-1 .3L8.2 27.1c-.4.5-.4.9-.4.9v18.3c0 1.1.9 2 1.9 2h8.2a1.47 1.47 0 0 0 1.5-1.5v-14a1.47 1.47 0 0 1 1.5-1.5h8.4a1.47 1.47 0 0 1 1.5 1.5v14a1.47 1.47 0 0 0 1.5 1.5h8.2c1.1 0 2-.9 2-1.9 0-.2-.3-18.1-.3-18.1zM7.3 25l-1.6 1.5s-.3.3-.5.3-.5 0-.8-.2c-.2-.2-2-2.8-2-2.8s-.1-.4-.1-.7c.1-.3.2-.7.3-.8.4-.1 21.5-20.1 21.5-20.1s.4-.3.9-.3c.4 0 .8.1.9.2s.5.4.5.4l8.9 8.5V6s.1-.4.2-.7c.1-.2.3-.3.4-.3s.3-.1.3-.1h3s.3.1.4.3a1.08 1.08 0 0 1 .3.7v9.8l7.2 6.9s.2.3.3.4c.1.2.1.7.1.7 0 .1-.1.4-.2.5s-1.6 2.5-1.6 2.5-.1.3-.3.3c-.2.1-.4.1-.7 0-.2-.1-.5-.4-.5-.4L26.4 9.4s-.3-.3-.5-.4-.4-.2-.8-.2-.5.1-.8.1c-.1.1-.4.3-.7.5C23.3 9.8 7.3 25 7.3 25z" fill="${isOn ? '#c7983e' : '#9da0a2'}"/>
          </svg>`;
			}

			case 'sleep': {
				const active = isOn && isRecent;
				return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="${active ? 'ci-on' : ''}">
            <style>
              @keyframes ci-bounce { 0% { transform: scale(0.3); } 20% { transform: scale(1.1); } 40% { transform: scale(0.9); } 60% { transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { transform: scale(1); } }
              .ci-on { animation: ci-bounce 1s; transform-origin: center; }
            </style>
            <path fill="${isOn ? '#3b82f6' : '#9da0a2'}" d="M23,12H17V10L20.39,6H17V4H23V6L19.62,10H23V12M15,16H9V14L12.39,10H9V8H15V10L11.62,14H15V16M7,20H1V18L4.39,14H1V12H7V14L3.62,18H7V20Z"/>
          </svg>`;
			}

			default:
				return '';
		}
	});

	const svg = $derived.by(() => scopeInlineSvg(rawSvg, scopeId));
</script>

{#if svg}
	<span class="ci-wrap {className}" aria-hidden="true">{@html svg}</span>
{/if}

<style>
	.ci-wrap {
		display: contents;
	}

	.ci-wrap :global(svg) {
		width: 100%;
		height: auto;
		display: block;
		/* Match HA button-card: SVGs without explicit fills inherit tile color. */
		fill: currentColor;
	}
</style>
