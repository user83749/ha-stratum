// ── Alert Index Store ─────────────────────────────────────────────────────────

// ── Imports ──────────────────────────────────────────────────────────────────
import { readable, get } from 'svelte/store';
import { dashboardStore } from '$lib/stores/dashboard';
import { entities, entitiesDelta, connectionStatus } from '$lib/ha/websocket';
import type { HassEntities } from 'home-assistant-js-websocket';
import type { NotificationAlertDomain, NotificationConfig } from '$lib/types/dashboard';
import { dev } from '$app/environment';

// ── Types ────────────────────────────────────────────────────────────────────
export type AlertSource =
	| 'alert-domain'
	| 'update-domain'
	| 'binary-sensor-domain'
	| 'alarm-panel-domain'
	| 'tracked';

interface EntityFlags {
	persistent: boolean;
	domainActive: boolean;
	trackedActive: boolean;
}

interface DomainStateSets {
	alert: Set<string>;
	update: Set<string>;
	binary_sensor: Set<string>;
	alarm_control_panel: Set<string>;
}

export interface AlertIndexSnapshot {
	persistentCount: number;
	persistentIds: Set<string>;
	activeDomainAlertIds: Set<string>;
	trackedActiveAlertIds: Set<string>;
	activeAlertIds: Set<string>;
	alertSourceById: Map<string, AlertSource>;
}

const EMPTY_SNAPSHOT: AlertIndexSnapshot = {
	persistentCount: 0,
	persistentIds: new Set<string>(),
	activeDomainAlertIds: new Set<string>(),
	trackedActiveAlertIds: new Set<string>(),
	activeAlertIds: new Set<string>(),
	alertSourceById: new Map<string, AlertSource>()
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function normalizedDomainStates(config: NotificationConfig): DomainStateSets {
	const map = config.alertStateMap;
	const norm = (domain: NotificationAlertDomain) =>
		new Set(
			(map?.[domain] ?? [])
				.map((value) => String(value).trim().toLowerCase())
				.filter((value) => value.length > 0)
		);

	return {
		alert: norm('alert'),
		update: norm('update'),
		binary_sensor: norm('binary_sensor'),
		alarm_control_panel: norm('alarm_control_panel')
	};
}

function resolveAlertDomain(entityId: string): NotificationAlertDomain | null {
	if (entityId.startsWith('alert.')) return 'alert';
	if (entityId.startsWith('update.')) return 'update';
	if (entityId.startsWith('binary_sensor.')) return 'binary_sensor';
	if (entityId.startsWith('alarm_control_panel.')) return 'alarm_control_panel';
	return null;
}

function sourceFromDomain(domain: NotificationAlertDomain): AlertSource {
	if (domain === 'alert') return 'alert-domain';
	if (domain === 'update') return 'update-domain';
	if (domain === 'binary_sensor') return 'binary-sensor-domain';
	return 'alarm-panel-domain';
}

function domainEnabled(config: NotificationConfig, domain: NotificationAlertDomain): boolean {
	if (domain === 'alert') return config.includeAlertDomainEntities;
	if (domain === 'update') return config.includeUpdateDomainEntities;
	if (domain === 'binary_sensor') return config.includeBinarySensorDomainEntities;
	return config.includeAlarmControlPanelDomainEntities;
}

function isStateActive(state: string, set: Set<string>): boolean {
	const value = String(state ?? '').trim().toLowerCase();
	if (!value || value === 'unavailable' || value === 'unknown') return false;
	return set.has(value);
}

function notificationsSignature(config: NotificationConfig): string {
	const ids = [...(config.alertEntityIds ?? [])].sort();
	const map = config.alertStateMap ?? {
		alert: [],
		update: [],
		binary_sensor: [],
		alarm_control_panel: []
	};
	const states = {
		alert: [...(map.alert ?? [])].map((v) => String(v).trim().toLowerCase()).sort(),
		update: [...(map.update ?? [])].map((v) => String(v).trim().toLowerCase()).sort(),
		binary_sensor: [...(map.binary_sensor ?? [])].map((v) => String(v).trim().toLowerCase()).sort(),
		alarm_control_panel: [...(map.alarm_control_panel ?? [])].map((v) => String(v).trim().toLowerCase()).sort()
	};
	return JSON.stringify({
		enabled: config.enabled,
		showPersistent: config.showPersistent,
		showAlerts: config.showAlerts,
		includeAlertDomainEntities: config.includeAlertDomainEntities,
		includeUpdateDomainEntities: config.includeUpdateDomainEntities,
		includeBinarySensorDomainEntities: config.includeBinarySensorDomainEntities,
		includeAlarmControlPanelDomainEntities: config.includeAlarmControlPanelDomainEntities,
		alertEntityIds: ids,
		alertStateMap: states
	});
}

// ── Store ────────────────────────────────────────────────────────────────────
export const alertIndex = readable<AlertIndexSnapshot>(EMPTY_SNAPSHOT, (set) => {
	let notifConfig = get(dashboardStore).notifications;
	let notifSignature = notificationsSignature(notifConfig);
	let domainStates = normalizedDomainStates(notifConfig);
	let trackedIds = new Set<string>(notifConfig.alertEntityIds ?? []);
	let currentEntities: HassEntities = get(entities);
	let entityFlags = new Map<string, EntityFlags>();
	let persistentIds = new Set<string>();
	let activeDomainAlertIds = new Set<string>();
	let trackedActiveAlertIds = new Set<string>();

	const emit = () => {
		const activeAlertIds = new Set<string>(activeDomainAlertIds);
		for (const id of trackedActiveAlertIds) activeAlertIds.add(id);

		const alertSourceById = new Map<string, AlertSource>();
		for (const id of activeDomainAlertIds) {
			const domain = resolveAlertDomain(id);
			if (!domain) continue;
			alertSourceById.set(id, sourceFromDomain(domain));
		}
		for (const id of trackedActiveAlertIds) {
			if (!alertSourceById.has(id)) alertSourceById.set(id, 'tracked');
		}

		if (dev) {
			for (const id of activeAlertIds) {
				if (!(id in currentEntities)) {
					console.warn('[alerts-index] Active alert id missing from entity map', id);
				}
			}
			if (activeAlertIds.size !== alertSourceById.size) {
				console.warn('[alerts-index] Active id/source map size mismatch', {
					activeIds: activeAlertIds.size,
					sources: alertSourceById.size
				});
			}
		}

		set({
			persistentCount: persistentIds.size,
			persistentIds: new Set(persistentIds),
			activeDomainAlertIds: new Set(activeDomainAlertIds),
			trackedActiveAlertIds: new Set(trackedActiveAlertIds),
			activeAlertIds,
			alertSourceById
		});
	};

	const resetIndex = () => {
		entityFlags = new Map();
		persistentIds = new Set();
		activeDomainAlertIds = new Set();
		trackedActiveAlertIds = new Set();
	};

	const processEntity = (entityId: string, entity: HassEntities[string] | null) => {
		const prev = entityFlags.get(entityId) ?? {
			persistent: false,
			domainActive: false,
			trackedActive: false
		};
		const next: EntityFlags = { persistent: false, domainActive: false, trackedActive: false };

		if (notifConfig.enabled && entity && notifConfig.showPersistent && entityId.startsWith('persistent_notification.')) {
			next.persistent = true;
		}

		const domain = resolveAlertDomain(entityId);
		if (notifConfig.enabled && entity && notifConfig.showAlerts && domain) {
			const stateSet =
				domain === 'alert'
					? domainStates.alert
					: domain === 'update'
						? domainStates.update
						: domain === 'binary_sensor'
							? domainStates.binary_sensor
							: domainStates.alarm_control_panel;

			const active = isStateActive(entity.state, stateSet);
			if (domainEnabled(notifConfig, domain) && active) next.domainActive = true;
			if (trackedIds.has(entityId) && active) next.trackedActive = true;
		}

		if (prev.persistent !== next.persistent) {
			if (next.persistent) persistentIds.add(entityId);
			else persistentIds.delete(entityId);
		}
		if (prev.domainActive !== next.domainActive) {
			if (next.domainActive) activeDomainAlertIds.add(entityId);
			else activeDomainAlertIds.delete(entityId);
		}
		if (prev.trackedActive !== next.trackedActive) {
			if (next.trackedActive) trackedActiveAlertIds.add(entityId);
			else trackedActiveAlertIds.delete(entityId);
		}

		if (!next.persistent && !next.domainActive && !next.trackedActive && !entity) {
			entityFlags.delete(entityId);
		} else {
			entityFlags.set(entityId, next);
		}
	};

	const rebuild = (entitiesMap: HassEntities) => {
		currentEntities = entitiesMap;
		resetIndex();

		for (const [entityId, entity] of Object.entries(entitiesMap)) {
			processEntity(entityId, entity);
		}
		emit();
	};

	const dashboardUnsub = dashboardStore.subscribe(($dashboard) => {
		const nextCfg = $dashboard.notifications;
		const nextSig = notificationsSignature(nextCfg);
		if (nextSig === notifSignature) return;
		notifConfig = nextCfg;
		notifSignature = nextSig;
		domainStates = normalizedDomainStates(notifConfig);
		trackedIds = new Set(notifConfig.alertEntityIds ?? []);
		rebuild(currentEntities);
	});

	const statusUnsub = connectionStatus.subscribe((status) => {
		if (status !== 'connected') {
			resetIndex();
			emit();
			return;
		}
		rebuild(currentEntities);
	});

	const entitiesUnsub = entities.subscribe(($entities) => {
		currentEntities = $entities;
	});
	const entityDeltaUnsub = entitiesDelta.subscribe((delta) => {
		if (delta.full) {
			rebuild(currentEntities);
			return;
		}
		let changed = false;
		for (const id of delta.added) {
			processEntity(id, currentEntities[id] ?? null);
			changed = true;
		}
		for (const id of delta.changed) {
			processEntity(id, currentEntities[id] ?? null);
			changed = true;
		}
		for (const id of delta.removed) {
			processEntity(id, null);
			changed = true;
		}
		if (changed) emit();
	});

	rebuild(currentEntities);

	return () => {
		dashboardUnsub();
		statusUnsub();
		entitiesUnsub();
		entityDeltaUnsub();
	};
});
