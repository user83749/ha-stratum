// ── Notification Badge Store ───────────────────────────────────────────────

// ── Imports ────────────────────────────────────────────────────────────────
import { derived } from 'svelte/store';
import { dashboardStore } from '$lib/stores/dashboard';
import { entities } from '$lib/ha/websocket';
import type { NotificationAlertDomain } from '$lib/types/dashboard';

function normalizedDomainStates(
	alertStateMap: Record<NotificationAlertDomain, string[]>,
	domain: NotificationAlertDomain
): Set<string> {
	return new Set(
		(alertStateMap?.[domain] ?? [])
			.map((value) => String(value).trim().toLowerCase())
			.filter((value) => value.length > 0)
	);
}

function resolveAlertDomain(entityId: string): NotificationAlertDomain | null {
	if (entityId.startsWith('alert.')) return 'alert';
	if (entityId.startsWith('update.')) return 'update';
	if (entityId.startsWith('binary_sensor.')) return 'binary_sensor';
	if (entityId.startsWith('alarm_control_panel.')) return 'alarm_control_panel';
	return null;
}

function isEntityActiveForDomain(
	entity: { state: string },
	states: Set<string>
): boolean {
	const value = String(entity.state ?? '').trim().toLowerCase();
	if (!value || value === 'unavailable' || value === 'unknown') return false;
	return states.has(value);
}

export const notificationBadgeCount = derived([dashboardStore, entities], ([$dashboardStore, $entities]) => {
	const notifCfg = $dashboardStore.notifications;
	if (!notifCfg.enabled) return 0;

	const all = Object.values($entities);
	let persistentCount = 0;
	if (notifCfg.showPersistent) {
		persistentCount = all.filter((entity) => entity.entity_id.startsWith('persistent_notification.')).length;
	}

	let alertCount = 0;
	if (notifCfg.showAlerts) {
		const alertStates = normalizedDomainStates(notifCfg.alertStateMap, 'alert');
		const updateStates = normalizedDomainStates(notifCfg.alertStateMap, 'update');
		const binarySensorStates = normalizedDomainStates(notifCfg.alertStateMap, 'binary_sensor');
		const alarmPanelStates = normalizedDomainStates(notifCfg.alertStateMap, 'alarm_control_panel');

		const activeAlertIds = new Set<string>();

		if (notifCfg.includeAlertDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('alert.')) continue;
				if (isEntityActiveForDomain(entity, alertStates)) activeAlertIds.add(entity.entity_id);
			}
		}

		if (notifCfg.includeUpdateDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('update.')) continue;
				if (isEntityActiveForDomain(entity, updateStates)) activeAlertIds.add(entity.entity_id);
			}
		}

		if (notifCfg.includeBinarySensorDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('binary_sensor.')) continue;
				if (isEntityActiveForDomain(entity, binarySensorStates)) activeAlertIds.add(entity.entity_id);
			}
		}

		if (notifCfg.includeAlarmControlPanelDomainEntities) {
			for (const entity of all) {
				if (!entity.entity_id.startsWith('alarm_control_panel.')) continue;
				if (isEntityActiveForDomain(entity, alarmPanelStates)) activeAlertIds.add(entity.entity_id);
			}
		}

		for (const id of notifCfg.alertEntityIds ?? []) {
			const entity = $entities[id];
			if (!entity) continue;
			const domain = resolveAlertDomain(entity.entity_id);
			if (!domain) continue;
			const states =
				domain === 'alert'
					? alertStates
					: domain === 'update'
						? updateStates
						: domain === 'binary_sensor'
							? binarySensorStates
							: alarmPanelStates;
			if (isEntityActiveForDomain(entity, states)) activeAlertIds.add(entity.entity_id);
		}

		alertCount = activeAlertIds.size;
	}

	return persistentCount + alertCount;
});

