<script lang="ts">
	// ── Icon ──────────────────────────────────────────────────────────────────

	// ── Imports ─────────────────────────────────────────────────────────────
	import { icons } from 'lucide-svelte';
	import Iconify from '@iconify/svelte';
	import type { HassEntity } from 'home-assistant-js-websocket';
	import type { IconProps } from 'lucide-svelte';
	import type { Component } from 'svelte';
	import CustomIcon from './CustomIcon.svelte';
	import { isCustomIcon, getCustomIconMeta } from '$lib/icons/customIcons';

	// ── Props ───────────────────────────────────────────────────────────────
	interface Props {
		/** Icon name — either:
		 *  • Iconify format: "mdi:home", "mdi:lightbulb-on", "ph:gear-bold"
		 *  • Lucide kebab-case: "house", "wifi-off", "chevron-right" */
		name: string | undefined | null;
		size?: number | string;
		strokeWidth?: number;
		fill?: string;
		class?: string;
		/** Optional CSS color value — sets `color` on a wrapper span */
		color?: string;
		/** Optional live entity context so special icons can render dynamically. */
		entity?: HassEntity | null;
	}

	let { name: rawName, size, strokeWidth = 1.75, fill = 'none', class: className = '', color, entity = null }: Props = $props();
	const name = $derived(rawName ?? '');

	// ── Name Normalization ─────────────────────────────────────────────────
	const normName = $derived.by(() => {
		switch (name) {
			case 'arrow-up-circle': return 'circle-arrow-up';
			case 'check-circle': return 'circle-check';
			case 'check-circle-2': return 'circle-check';
			default: return name;
		}
	});

	// ── Icon Type Derivation ───────────────────────────────────────────────
	const isIconify = $derived(normName.includes(':'));

	const isHueLight = $derived(normName === 'hue-light');
	const isAirplay = $derived(normName === 'airplay');
	const isCustom = $derived(isCustomIcon(normName));
	const customMeta = $derived(getCustomIconMeta(normName));

	// ── Color Helpers ──────────────────────────────────────────────────────
	function mixChannel(a: number, b: number, t: number): number {
		return Math.round(a + (b - a) * t);
	}

	function colorTempTint(temp: number, min: number, max: number): string {
		const span = Math.max(1, max - min);
		const ratio = Math.max(0, Math.min(1, (temp - min) / span));
		const warm = [165, 77, 35];
		const cool = [238, 244, 255];
		const r = mixChannel(cool[0], warm[0], ratio);
		const g = mixChannel(cool[1], warm[1], ratio);
		const b = mixChannel(cool[2], warm[2], ratio);
		return `rgb(${r}, ${g}, ${b})`;
	}
	function kelvinToMired(kelvin: number): number {
		return Math.round(1_000_000 / Math.max(kelvin, 1));
	}

	// ── Icon Map Helpers ───────────────────────────────────────────────────
	function toKey(raw: string): string {
		return raw
			.split('-')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join('');
	}

	// ── Dynamic Icon Selection ─────────────────────────────────────────────
	const DynIcon = $derived(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(!isIconify && !isHueLight && !isAirplay && !isCustom)
			? (icons[toKey(normName) as keyof typeof icons] ?? null) as unknown as Component<IconProps> | null
			: null
	);

	const resolvedSize = $derived((size ?? '1em') as IconProps['size']);
	const cssSize = $derived(typeof resolvedSize === 'number' ? `${resolvedSize}px` : String(resolvedSize));
	// ── Size Handling ──────────────────────────────────────────────────────
	// Treat size="100%" as implicit sizing for custom icons.
	const hasExplicitSize = $derived(
		size !== undefined &&
		!(isCustom && String(size).trim() === '100%')
	);
	const iconProps: IconProps = $derived({ size: resolvedSize, strokeWidth, fill, class: className });
	// ── Hue Light State ────────────────────────────────────────────────────
	const hueLightState = $derived.by(() => {
		if (!isHueLight || !entity || !entity.entity_id.startsWith('light.')) {
			return {
				isOn: false,
				base: 'currentColor',
				glass: 'currentColor'
			};
		}

		const attrs = entity.attributes ?? {};
		const isOn = entity.state === 'on';
		const rgbColor = attrs.rgb_color as [number, number, number] | undefined;
		const colorTempMired = attrs.color_temp as number | undefined;
		const colorTempKelvin = attrs.color_temp_kelvin as number | undefined;
		const minMireds = (attrs.min_mireds as number | undefined) ?? 153;
		const maxMireds = (attrs.max_mireds as number | undefined) ?? 500;
		const minKelvin = attrs.min_color_temp_kelvin as number | undefined;
		const maxKelvin = attrs.max_color_temp_kelvin as number | undefined;

		let glass = 'currentColor';
		if (rgbColor) glass = `rgb(${rgbColor[0]}, ${rgbColor[1]}, ${rgbColor[2]})`;
		else if (isOn && (colorTempMired !== undefined || colorTempKelvin !== undefined)) {
			glass = colorTempTint(
				colorTempMired ?? kelvinToMired(colorTempKelvin ?? 4000),
				minKelvin ? kelvinToMired(minKelvin) : minMireds,
				maxKelvin ? kelvinToMired(maxKelvin) : maxMireds
			);
		}
		else if (isOn) glass = 'var(--fg)';

		return {
			isOn,
			base: isOn ? '#8a9096' : '#91989e',
			glass
		};
	});
</script>

<span style={color ? `color: ${color}; display: contents;` : 'display: contents;'} aria-hidden="true">
	{#if isHueLight}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={resolvedSize}
			height={resolvedSize}
			viewBox="0 0 50 50"
			fill="none"
			class={className}
			aria-hidden="true"
		>
			<path
				d="M27.4 47.3h-4.9s-.7.1-.7.8.4.9.7.9h4.9c.3 0 .7-.1.7-.9s-.7-.8-.7-.8zm3.3-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-3H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9-.1-.8-.9-.8-.9-.8zm0-2.9H19.3s-.8 0-.8.8.6.9.8.9h11.5c.2 0 .8-.1.8-.9s-.9-.8-.9-.8zm5.2-23.2c-3.3-5.3-7-5.6-10.9-5.6-3.8 0-8.4.4-10.9 5.6-.1.1-.1.3.1.7.4.8 3.3 7.2 3.2 18.8 0 1.1-.1 1.6 0 1.7 0 .1 0 .7 1.1.7h13c1 0 1-.5 1.1-.7v-1.7c-.1-11.6 2.8-18 3.2-18.8.1-.4.1-.5.1-.7"
				fill={hueLightState.base}
			/>
			<path
				d="M14.1 15.3c3.4-.3 7-.4 10.9-.4 3.8 0 7.5.2 10.9.4.4-.4.7-.8.9-1.1C39 8.5 38.9 6.5 38.9 6c-.2-4.4-8.4-5-12.1-5h0-3.4c-3.7 0-12 .5-12.1 5 0 .5-.1 2.5 2.1 8.2 0 .3.3.8.7 1.1z"
				fill={hueLightState.glass}
			/>
		</svg>
	{:else if isCustom && customMeta}
		<!-- Custom built-in icon -->
		{@const extraStyle =
			`${customMeta.position ? `position:${customMeta.position};` : ''}` +
			`${customMeta.left ? `left:${customMeta.left};` : ''}` +
			`${customMeta.right ? `right:${customMeta.right};` : ''}` +
			`${customMeta.top ? `top:${customMeta.top};` : ''}` +
			`${customMeta.bottom ? `bottom:${customMeta.bottom};` : ''}` +
			`${customMeta.overflow ? `overflow:${customMeta.overflow};` : ''}`
		}
		{#if hasExplicitSize}
			<span
				class="ci-box"
				style="width:{cssSize};height:{cssSize};display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;overflow:hidden;"
				aria-hidden="true"
			>
				<span
					class="ci-sizer"
					style="width:{customMeta.width};height:100%;margin-left:{customMeta.marginLeft};margin-top:{customMeta.marginTop};display:block;{extraStyle}"
					aria-hidden="true"
				>
					<CustomIcon name={normName} {entity} />
				</span>
			</span>
		{:else}
			<span
				class="ci-sizer"
				style="width:{customMeta.width};margin-left:{customMeta.marginLeft};margin-top:{customMeta.marginTop};display:block;flex-shrink:0;{extraStyle}"
				aria-hidden="true"
			>
				<CustomIcon name={normName} {entity} />
			</span>
		{/if}
	{:else if isAirplay}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={resolvedSize}
			height={resolvedSize}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class={className}
			aria-hidden="true"
		>
			<path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
			<path d="m12 15 5 6H7l5-6z" fill="currentColor" stroke="none" />
		</svg>
	{:else if isIconify}
		<!-- Iconify icon -->
		<Iconify
			icon={normName}
			width={resolvedSize}
			height={resolvedSize}
			class={className}
		/>
	{:else if DynIcon}
		<DynIcon {...iconProps} />
	{:else if normName}
		<!-- Fallback icon -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={resolvedSize}
			height={resolvedSize}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-linejoin="round"
			class="shrink-0 {className}"
			aria-hidden="true"
		>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
			<circle cx="12" cy="17" r=".5" fill="currentColor" />
		</svg>
	{/if}
</span>
