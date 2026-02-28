<script lang="ts">
	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { getDomain, getEntityName } from '$lib/ha/entities';
	import { getAllowedPresets } from '$lib/layout/tileSizing';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { Tile, Action } from '$lib/types/dashboard';

	interface Props {
		open: boolean;
		tile: Tile | null;
		pageId: string;
		sectionId: string;
		onclose: () => void;
		onDelete: () => void;
		onDuplicate: () => void;
	}

	const { open, tile, pageId, sectionId, onclose, onDelete, onDuplicate }: Props = $props();

	let name = $state('');
	let icon = $state('');

	const domain = $derived(
		tile?.entity_id ? getDomain(tile.entity_id) : (tile?.type ?? '')
	);
	const entity = $derived(
		tile?.entity_id ? ($entities[tile.entity_id] ?? null) : null
	);
	const entityName = $derived(
		entity ? getEntityName(entity) : (tile?.entity_id ?? tile?.type ?? 'Tile')
	);
	const allowedPresets = $derived(tile ? getAllowedPresets(tile.type) : []);

	$effect(() => {
		if (!tile) return;
		name = (tile.config.name as string | undefined) ?? '';
		icon = (tile.config.icon as string | undefined) ?? '';
	});

	let _saveTimer: ReturnType<typeof setTimeout> | null = null;

	function save(patch: Record<string, unknown>) {
		if (!tile) return;
		if (_saveTimer) clearTimeout(_saveTimer);
		_saveTimer = setTimeout(() => {
			dashboardStore.updateTile(pageId, sectionId, tile!.id, {
				config: { ...tile!.config, ...patch }
			});
		}, 300);
	}

	function setSizePreset(sizePreset: NonNullable<Tile['sizePreset']>) {
		if (!tile) return;
		dashboardStore.setTileSizePreset(pageId, sectionId, tile.id, sizePreset);
	}

	const ACTION_TYPES = ['none', 'more-info', 'toggle', 'navigate', 'call-service'];
	const tileDefaults = $derived($dashboardStore.tileDefaults);

	function actionType(key: string): string {
		const a = tile?.config[key] as Action | undefined;
		if (a?.type) return a.type;
		const def = tileDefaults?.[key as keyof typeof tileDefaults] as Action | undefined;
		return def?.type ?? 'none';
	}

	function setAction(key: string, type: string) {
		if (type === 'none') { save({ [key]: undefined }); return; }
		const action: Action =
			type === 'more-info'    ? { type: 'more-info' } :
			type === 'toggle'       ? { type: 'toggle' } :
			type === 'navigate'     ? { type: 'navigate', path: '/' } :
			type === 'call-service' ? { type: 'call-service', service: '', data: {} } :
			{ type: 'none' };
		save({ [key]: action });
	}

	const LIGHT_TOGGLES = [
		['show_brightness_slider',  'Brightness slider'],
		['show_color_temp_slider',  'Color temp slider'],
		['show_color_picker',       'Color picker'],
		['show_effect_list',        'Effect list']
	] as const;
	const CLIMATE_TOGGLES = [
		['show_current_temp',  'Current temperature'],
		['show_humidity',      'Humidity'],
		['show_fan_mode',      'Fan mode'],
		['show_hvac_modes',    'HVAC modes'],
		['show_preset_modes',  'Preset modes'],
		['show_swing_mode',    'Swing mode']
	] as const;
	const COVER_TOGGLES = [
		['show_position_slider', 'Position slider'],
		['show_tilt',            'Tilt'],
		['show_tilt_slider',     'Tilt slider']
	] as const;
	const MEDIA_TOGGLES = [
		['show_artwork',    'Album artwork'],
		['show_progress',   'Progress bar'],
		['show_volume',     'Volume'],
		['show_source',     'Source selector'],
		['show_sound_mode', 'Sound mode']
	] as const;
	const FAN_TOGGLES = [
		['show_speed_slider', 'Speed slider'],
		['show_oscillate',    'Oscillate'],
		['show_direction',    'Direction'],
		['show_preset_modes_fan', 'Preset modes']
	] as const;
	const WEATHER_TOGGLES = [
		['weather_show_humidity',      'Humidity'],
		['weather_show_wind',          'Wind'],
		['weather_show_precipitation', 'Precipitation'],
		['weather_show_uv_index',      'UV index']
	] as const;
	const SHOW_TOGGLES = [
		['show_name',         'Name'],
		['show_state',        'State'],
		['show_icon',         'Icon'],
		['show_last_changed', 'Last changed']
	] as const;
</script>

{#if open && tile}
	<div class="te__backdrop" onclick={onclose} aria-hidden="true"></div>

	<aside class="te" aria-label="Tile editor">
		<div class="te__header">
			<button class="te__hbtn" onclick={onclose} title="Close" aria-label="Close tile editor">
				<Icon name="x" size={17} />
			</button>
			<div class="te__title">
				<span class="te__badge">{tile.type}</span>
				<span class="te__name">{entityName}</span>
			</div>
			<div class="te__header-btns">
				<button class="te__hbtn" onclick={onDuplicate} title="Duplicate tile" aria-label="Duplicate">
					<Icon name="copy" size={15} />
				</button>
				<button class="te__hbtn te__hbtn--danger" onclick={onDelete} title="Delete tile" aria-label="Delete">
					<Icon name="trash-2" size={15} />
				</button>
			</div>
		</div>

		<div class="te__body">
			<div class="te__group">
				<span class="te__section-title">Identity</span>
				<span class="te__label">Name override</span>
				<input class="te__input" type="text" placeholder="Entity name" bind:value={name} oninput={() => save({ name: name || undefined })} />
				<span class="te__label">Icon override</span>
				<input class="te__input" type="text" placeholder="e.g. lightbulb" bind:value={icon} oninput={() => save({ icon: icon || undefined })} />
			</div>

			<div class="te__group">
				<span class="te__section-title">Tile size</span>
				<div class="te__preset-row">
					{#each allowedPresets as preset}
						<button
							class="te__preset"
							class:te__preset--active={(tile.sizePreset ?? 'md') === preset}
							onclick={() => setSizePreset(preset)}
						>
							{preset === 'sm' ? 'Small' : preset === 'md' ? 'Medium' : preset === 'lg' ? 'Large' : 'XL'}
						</button>
					{/each}
				</div>
			</div>

			<div class="te__group">
				<span class="te__section-title">Visibility</span>
				{#each SHOW_TOGGLES as [key, label]}
					<label class="te__check">
						<input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />
						{label}
					</label>
				{/each}
			</div>

			<div class="te__group">
				<span class="te__section-title">Interactions</span>
				{#each [['tap_action','Tap'],['hold_action','Hold'],['double_tap_action','Double tap']] as [key, label]}
					<div class="te__action-row">
						<span class="te__label">{label} action</span>
						<select class="te__select" value={actionType(key)} onchange={(e) => setAction(key, (e.target as HTMLSelectElement).value)}>
							{#each ACTION_TYPES as t}
								<option value={t}>{t === 'none' ? 'None' : t === 'more-info' ? 'More info' : t === 'call-service' ? 'Call service' : t.charAt(0).toUpperCase() + t.slice(1)}</option>
							{/each}
						</select>
						{#if actionType(key) === 'navigate'}
							<input
								class="te__input"
								type="text"
								placeholder="/page-path"
								value={(tile.config[key] as Action & { path?: string })?.path ?? ''}
								oninput={(e) => save({ [key]: { ...(tile.config[key] as Action), path: (e.target as HTMLInputElement).value } })}
							/>
						{/if}
					</div>
				{/each}
				<label class="te__check">
					<input type="checkbox" checked={!!tile.config.confirm_action} onchange={(e) => save({ confirm_action: (e.target as HTMLInputElement).checked || undefined })} />
					Confirm before action
				</label>
			</div>

			<div class="te__group">
				<span class="te__section-title">Tile-specific settings</span>

				{#if domain === 'light' || tile.type === 'light'}
					{#each LIGHT_TOGGLES as [key, label]}
						<label class="te__check"><input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />{label}</label>
					{/each}
				{/if}

				{#if domain === 'climate' || tile.type === 'climate'}
					{#each CLIMATE_TOGGLES as [key, label]}
						<label class="te__check"><input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />{label}</label>
					{/each}
				{/if}

				{#if domain === 'cover' || tile.type === 'cover'}
					{#each COVER_TOGGLES as [key, label]}
						<label class="te__check"><input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />{label}</label>
					{/each}
				{/if}

				{#if domain === 'media_player' || tile.type === 'media_player'}
					{#each MEDIA_TOGGLES as [key, label]}
						<label class="te__check"><input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />{label}</label>
					{/each}
				{/if}

				{#if domain === 'weather' || tile.type === 'weather'}
					{#each WEATHER_TOGGLES as [key, label]}
						<label class="te__check"><input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />{label}</label>
					{/each}
					<span class="te__label">Forecast days</span>
					<input class="te__input te__input--num" type="number" min="1" max="7" value={(tile.config.weather_forecast_days as number) ?? 5} oninput={(e) => save({ weather_forecast_days: parseInt((e.target as HTMLInputElement).value) || 5 })} />
				{/if}

				{#if domain === 'fan' || tile.type === 'fan'}
					{#each FAN_TOGGLES as [key, label]}
						<label class="te__check"><input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />{label}</label>
					{/each}
				{/if}

				{#if domain === 'camera' || tile.type === 'camera'}
					<span class="te__label">Stream type</span>
					<select class="te__select" value={(tile.config.stream_type as string) ?? 'auto'} onchange={(e) => save({ stream_type: (e.target as HTMLSelectElement).value })}>
						<option value="auto">Auto</option>
						<option value="hls">HLS</option>
						<option value="webrtc">WebRTC</option>
						<option value="mjpeg">MJPEG</option>
					</select>
					<label class="te__check"><input type="checkbox" checked={!!tile.config.ptz} onchange={(e) => save({ ptz: (e.target as HTMLInputElement).checked || undefined })} />PTZ controls</label>
				{/if}

				{#if tile.type === 'clock'}
					<span class="te__label">Style</span>
					<select class="te__select" value={(tile.config.clock_style as string) ?? 'digital'} onchange={(e) => save({ clock_style: (e.target as HTMLSelectElement).value })}>
						<option value="digital">Digital</option>
						<option value="analog">Analog</option>
					</select>
					{#each [['show_date','Show date'],['show_seconds','Show seconds']] as [key, label]}
						<label class="te__check"><input type="checkbox" checked={tile.config[key] !== false} onchange={(e) => save({ [key]: (e.target as HTMLInputElement).checked })} />{label}</label>
					{/each}
				{/if}

				{#if tile.type === 'gauge'}
					<div class="te__grid3">
						{#each [['min','Min'],['max','Max']] as [key, label]}
							<div>
								<span class="te__label">{label}</span>
								<input class="te__input te__input--num" type="number" value={(tile.config[key] as number) ?? (key === 'min' ? 0 : 100)} oninput={(e) => save({ [key]: parseFloat((e.target as HTMLInputElement).value) })} />
							</div>
						{/each}
					</div>
				{/if}

				{#if tile.type === 'slider'}
					<div class="te__grid3">
						{#each [['slider_min','Min'],['slider_max','Max'],['slider_step','Step']] as [key, label]}
							<div>
								<span class="te__label">{label}</span>
								<input class="te__input te__input--num" type="number" value={(tile.config[key] as number) ?? (key === 'slider_min' ? 0 : key === 'slider_max' ? 100 : 1)} oninput={(e) => save({ [key]: parseFloat((e.target as HTMLInputElement).value) })} />
							</div>
						{/each}
					</div>
				{/if}

				{#if tile.type === 'markdown'}
					<span class="te__label">Content</span>
					<textarea class="te__textarea" rows={8} value={(tile.config.content as string) ?? ''} oninput={(e) => save({ content: (e.target as HTMLTextAreaElement).value })}></textarea>
				{/if}

				{#if tile.type === 'iframe'}
					<span class="te__label">URL</span>
					<input class="te__input" type="url" placeholder="https://…" value={(tile.config.url as string) ?? ''} oninput={(e) => save({ url: (e.target as HTMLInputElement).value })} />
				{/if}

				{#if tile.type === 'image'}
					<span class="te__label">Image URL</span>
					<input class="te__input" type="url" placeholder="https://…" value={(tile.config.url as string) ?? ''} oninput={(e) => save({ url: (e.target as HTMLInputElement).value })} />
				{/if}
			</div>
		</div>
	</aside>
{/if}

<style>
	.te__backdrop {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 349;
		background: transparent;
	}
	@media (max-width: 639px) {
		.te__backdrop { display: block; }
	}

	.te {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(390px, 95dvw);
		z-index: 350;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}

	.te__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		gap: 8px;
	}

	.te__title {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.te__badge {
		flex-shrink: 0;
		font-size: 0.6rem;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--accent) 15%, transparent);
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.te__name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--fg);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.te__header-btns {
		display: flex;
		gap: 2px;
		flex-shrink: 0;
	}

	.te__hbtn {
		width: 30px;
		height: 30px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--fg-muted);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.te__hbtn:hover { background: var(--hover); color: var(--fg); }
	.te__hbtn--danger { color: var(--color-danger); }

	.te__body {
		flex: 1;
		overflow: auto;
		padding: 16px 14px 20px;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.te__group {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 2px;
	}

	.te__section-title {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--fg-subtle);
	}

	.te__label {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--fg-subtle);
	}

	.te__input,
	.te__select,
	.te__textarea {
		width: 100%;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg);
		border-radius: var(--radius-sm);
		padding: 10px 12px;
		font: inherit;
	}

	.te__textarea {
		resize: vertical;
		min-height: 120px;
	}

	.te__input--num { padding-right: 8px; }

	.te__check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.84rem;
		color: var(--fg);
	}

	.te__preset-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.te__preset {
		height: 38px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-muted);
		font: inherit;
		cursor: pointer;
	}

	.te__preset--active {
		border-color: var(--accent);
		color: var(--fg);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.te__action-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.te__grid3 {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}
</style>
