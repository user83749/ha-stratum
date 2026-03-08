<script lang="ts">
	import { dashboardStore } from '$lib/stores/dashboard';
	import { entities } from '$lib/ha/websocket';
	import { getDomain, getEntityName } from '$lib/ha/entities';
	import { getAllowedPresets } from '$lib/layout/tileSizing';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { CUSTOM_ICON_NAMES } from '$lib/icons/customIcons';
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
	let builtinOpen = $state(false);

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
	// ── Player map helpers (media_hero) ──────────────────────────────────────

	interface PlayerMapEntry { state: string; entity_id: string; picture_entity: string; name: string; icon: string; }

	function addPlayerEntry() {
		if (!tile) return;
		const map: PlayerMapEntry[] = [...((tile.config.player_map ?? []) as PlayerMapEntry[])];
		map.push({ state: '', entity_id: '', picture_entity: '', name: '', icon: '' });
		save({ player_map: map });
	}

	function removePlayerEntry(i: number) {
		if (!tile) return;
		const map: PlayerMapEntry[] = [...((tile.config.player_map ?? []) as PlayerMapEntry[])];
		map.splice(i, 1);
		save({ player_map: map });
	}

	function updatePlayerEntry(i: number, patch: Partial<PlayerMapEntry>) {
		if (!tile) return;
		const map: PlayerMapEntry[] = [...((tile.config.player_map ?? []) as PlayerMapEntry[])];
		map[i] = { ...map[i], ...patch };
		save({ player_map: map });
	}

	const SHOW_TOGGLES = [
		['show_name',         'Name'],
		['show_state',        'State'],
		['show_icon',         'Icon'],
		['show_last_changed', 'Last changed']
	] as const;


	const TILE_TYPES = [
		'entity', 'light', 'climate', 'cover', 'media_player', 'media_hero', 'camera', 'alarm_panel',
		'fan', 'lock', 'vacuum', 'humidifier', 'person', 'button', 'slider', 'input_select',
		'remote', 'timer', 'weather', 'history', 'gauge', 'markdown', 'iframe', 'image',
		'todo', 'update'
	];

	const TILE_TYPE_LABELS: Record<string, string> = {
		entity: 'Entity', light: 'Light', climate: 'Climate', cover: 'Cover',
		media_player: 'Media Player', media_hero: 'Custom Player', camera: 'Camera',
		alarm_panel: 'Alarm Panel', fan: 'Fan', lock: 'Lock', vacuum: 'Vacuum',
		humidifier: 'Humidifier', person: 'Person', button: 'Button',
		slider: 'Slider', input_select: 'Input Select', remote: 'Remote',
		timer: 'Timer', weather: 'Weather', history: 'History Graph',
		gauge: 'Gauge', markdown: 'Markdown', iframe: 'iFrame',
		image: 'Image', todo: 'To-do', update: 'Update'
	};

	function changeTileType(newType: string) {
		if (!tile || newType === tile.type) return;
		dashboardStore.updateTile(pageId, sectionId, tile.id, { type: newType as Tile['type'] });
	}
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
				<span class="te__section-title">Tile type</span>
				<select
					class="te__select"
					value={tile.type}
					onchange={(e) => changeTileType((e.target as HTMLSelectElement).value)}
				>
					{#each TILE_TYPES as t}
						<option value={t}>{TILE_TYPE_LABELS[t] ?? t}</option>
					{/each}
				</select>
			</div>

			<div class="te__group">
				<span class="te__section-title">Identity</span>
				<span class="te__label">Name override</span>
				<input class="te__input" type="text" placeholder="Entity name" bind:value={name} oninput={() => save({ name: name || undefined })} />
				<span class="te__label">Icon override</span>
				<input class="te__input" type="text" placeholder="e.g. mdi:lightbulb or floorlamp" bind:value={icon} oninput={() => save({ icon: icon || undefined })} />
				<div class="te__icon-links">
					<a class="te__icon-finder" href="https://icon-sets.iconify.design/" target="_blank" rel="noopener noreferrer">Icon Finder ↗</a>
					<button class="te__icon-finder te__builtin-btn" onclick={() => builtinOpen = !builtinOpen} type="button">
						Built-in icons {builtinOpen ? '▲' : '▼'}
					</button>
				</div>
				{#if builtinOpen}
					<div class="te__builtin-list">
						{#each CUSTOM_ICON_NAMES as n}
							<button
								class="te__builtin-item-box"
								class:te__builtin-item-box--active={icon === n}
								onclick={() => { icon = n; save({ icon: n }); }}
								title={n}
								type="button"
							>
								<div class="te__builtin-preview">
									<Icon name={n} size={20} />
								</div>
								<span class="te__builtin-name">{n}</span>
							</button>
						{/each}
					</div>
				{/if}
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

				{#if tile.type === 'media_hero'}
					<div class="te__row te__row--gap">
						<label class="te__check">
							<input type="checkbox" checked={tile.config.show_artwork !== false} onchange={(e) => save({ show_artwork: (e.target as HTMLInputElement).checked })} />
							Show artwork
						</label>
						<label class="te__check">
							<input type="checkbox" checked={tile.config.show_progress !== false} onchange={(e) => save({ show_progress: (e.target as HTMLInputElement).checked })} />
							Progress bar
						</label>
					</div>

					<span class="te__label">Switcher Entity (optional)</span>
					<div class="te__row te__row--gap te__mb4">
						<input
							class="te__input"
							type="text"
							placeholder="select.conditional_media"
							value={(tile.config.switcher_entity_id as string) ?? ''}
							oninput={(e) => save({ switcher_entity_id: (e.target as HTMLInputElement).value || undefined })}
						/>
					</div>
					<p class="te__hint">
						Selecting an entity here (like <code>select.conditional_media</code>) enables dynamic player switching.
						The tile will show its main entity as a fallback when no player is active.
					</p>

					<span class="te__label te__mt12">Aggregator sensor (optional)</span>
					<input
						class="te__input"
						type="text"
						placeholder="sensor.active_media_players"
						value={(tile.config.sensor_entity as string) ?? ''}
						oninput={(e) => save({ sensor_entity: (e.target as HTMLInputElement).value || undefined })}
					/>
					<p class="te__hint">
						Optional sensor whose attributes supply <code>media_title</code>, <code>media_artist</code>,
						<code>entity_picture</code>. Leave blank to read directly from each media player.
					</p>

					<span class="te__section-title te__mt12">Player map</span>
					<p class="te__hint">
						Configure which states of the Switcher Entity (or the main entity if no switcher is set) map to which media players.
					</p>

					{@const switchId = (tile.config.switcher_entity_id as string) || tile.entity_id}
					{@const selectEntity = switchId ? ($entities[switchId] ?? null) : null}
					{@const selectOptions = (selectEntity?.attributes?.options as string[] | undefined) ?? []}
					{@const usedStates = new Set(((tile.config.player_map ?? []) as PlayerMapEntry[]).map(e => e.state).filter(Boolean))}

					{#if switchId && selectOptions.length === 0}
						<p class="te__hint te__hint--warn">
							⚠ Entity <code>{tile.entity_id}</code> has no <code>options</code> attribute.
							Make sure it's a <code>select.*</code> or <code>input_select.*</code> entity.
						</p>
					{/if}

					<div class="te__player-map">
						{#each ((tile.config.player_map ?? []) as PlayerMapEntry[]) as entry, i}
							<div class="te__pm-row">
								<div class="te__pm-header">
									<span class="te__pm-index">#{i + 1}</span>
									{#if i > 0}
										<button
											class="te__icon-btn te__pm-move"
											onclick={() => { const map = [...((tile.config.player_map ?? []) as PlayerMapEntry[])]; if (i > 0) { [map[i-1], map[i]] = [map[i], map[i-1]]; save({ player_map: map }); } }}
											title="Move up (higher priority)"
											aria-label="Move up"
										>
											<Icon name="chevron-up" size={12} />
										</button>
									{/if}
									{#if i < ((tile.config.player_map ?? []) as PlayerMapEntry[]).length - 1}
										<button
											class="te__icon-btn te__pm-move"
											onclick={() => { const map = [...((tile.config.player_map ?? []) as PlayerMapEntry[])]; [map[i], map[i+1]] = [map[i+1], map[i]]; save({ player_map: map }); }}
											title="Move down (lower priority)"
											aria-label="Move down"
										>
											<Icon name="chevron-down" size={12} />
										</button>
									{/if}
									<button class="te__icon-btn te__icon-btn--danger te__pm-del" onclick={() => removePlayerEntry(i)}>
										<Icon name="trash-2" size={13} />
									</button>
								</div>
								<div class="te__pm-grid">
									<div>
										<span class="te__label">When select =</span>
										{#if selectOptions.length > 0}
											<select
												class="te__select te__select--sm"
												value={entry.state}
												onchange={(e) => updatePlayerEntry(i, { state: (e.target as HTMLSelectElement).value })}
											>
												<option value="">— Pick an option —</option>
												{#each selectOptions as opt}
													<option
														value={opt}
														disabled={usedStates.has(opt) && opt !== entry.state}
													>{opt}{usedStates.has(opt) && opt !== entry.state ? ' (used)' : ''}</option>
												{/each}
											</select>
										{:else}
											<input
												class="te__input te__input--sm"
												placeholder="e.g. CoreELEC"
												value={entry.state}
												oninput={(e) => updatePlayerEntry(i, { state: (e.target as HTMLInputElement).value })}
											/>
										{/if}
									</div>
									<div>
										<span class="te__label">Media player entity</span>
										<input
											class="te__input te__input--sm"
											placeholder="media_player.xyz"
											value={entry.entity_id}
											oninput={(e) => updatePlayerEntry(i, { entity_id: (e.target as HTMLInputElement).value })}
										/>
									</div>
									<div>
										<span class="te__label">Artwork entity (optional)</span>
										<input
											class="te__input te__input--sm"
											placeholder="sensor.kodi_poster"
											value={entry.picture_entity ?? ''}
											oninput={(e) => updatePlayerEntry(i, { picture_entity: (e.target as HTMLInputElement).value })}
										/>
									</div>
									<div>
										<span class="te__label">Display name</span>
										<input
											class="te__input te__input--sm"
											placeholder="e.g. Now Playing"
											value={entry.name}
											oninput={(e) => updatePlayerEntry(i, { name: (e.target as HTMLInputElement).value })}
										/>
									</div>
									<div>
										<span class="te__label">Icon</span>
										<input
											class="te__input te__input--sm"
											placeholder="e.g. tv-2, speaker"
											value={entry.icon}
											oninput={(e) => updatePlayerEntry(i, { icon: (e.target as HTMLInputElement).value })}
										/>
									</div>
								</div>
							</div>
						{/each}
						<button class="te__add-btn te__add-btn--large" onclick={addPlayerEntry}>
							<Icon name="plus" size={14} /> <span>Add player mapping</span>
						</button>
					</div>
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

	.te__icon-links {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.te__icon-finder {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--accent);
		text-decoration: none;
		opacity: 0.8;
		transition: opacity var(--transition);
	}
	.te__icon-finder:hover { opacity: 1; }

	.te__builtin-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.te__builtin-list {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		padding: 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		max-height: 240px;
		overflow-y: auto;
	}

	.te__builtin-item-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 8px 4px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-muted);
		cursor: pointer;
		font: inherit;
		transition: all var(--transition);
	}

	.te__builtin-item-box:hover {
		background: var(--hover);
		color: var(--fg);
		border-color: var(--fg-subtle);
	}

	.te__builtin-item-box--active {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.te__builtin-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		position: relative;
		overflow: hidden;
		isolation: isolate;
		transition: transform var(--transition);
	}

	.te__builtin-item-box:hover .te__builtin-preview {
		transform: scale(1.1);
	}

	.te__builtin-name {
		font-size: 0.62rem;
		font-weight: 600;
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
		opacity: 0.8;
	}

		.te__check {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 0.84rem;
			color: var(--fg);
			cursor: pointer;
		}
		.te__check input { margin: 0; }

		.te__row { display: flex; align-items: center; }

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

	.te__input--sm, .te__select--sm {
		padding: 6px 8px;
		font-size: 0.75rem;
	}

	.te__icon-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--fg-muted);
		border-radius: 4px;
		cursor: pointer;
	}
	.te__icon-btn:hover { background: var(--hover); color: var(--fg); }
	.te__icon-btn--danger:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, transparent); }

	.te__add-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 0;
		background: none;
		border: none;
		color: var(--accent);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		opacity: 0.8;
	}
	.te__add-btn:hover { opacity: 1; }

		.te__add-btn--large {
			justify-content: center;
			padding: 10px;
			border: 1px dashed var(--border);
			border-radius: var(--radius-sm);
			font-size: 0.78rem;
		}

		/* ── Player map (media_hero) ─────────────────────────────────────────────── */

	.te__mt12 { margin-top: 12px; }

	.te__hint {
		font-size: 0.72rem;
		color: var(--fg-subtle);
		line-height: 1.5;
		margin: 0;
	}
	.te__hint code {
		font-family: monospace;
		background: var(--hover);
		padding: 1px 4px;
		border-radius: 3px;
	}
	.te__hint--warn { color: #d4a04a; }

	.te__player-map {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.te__pm-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--surface) 50%, transparent);
	}

	.te__pm-header {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.te__pm-index {
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--fg-subtle);
		min-width: 20px;
		flex: 1;
	}

	.te__pm-move {
		width: 22px;
		height: 22px;
		color: var(--fg-subtle);
	}
	.te__pm-move:hover { color: var(--fg); }

	.te__pm-grid {
		flex: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.te__row--gap { gap: 16px; }

	.te__pm-del {
		flex-shrink: 0;
		margin-left: auto;
	}
</style>
