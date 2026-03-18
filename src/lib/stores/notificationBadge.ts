// ── Notification Badge Store ───────────────────────────────────────────────

// ── Imports ────────────────────────────────────────────────────────────────
import { derived } from 'svelte/store';
import { dashboardStore } from '$lib/stores/dashboard';
import { alertIndex } from '$lib/stores/alertIndex';

export const notificationBadgeCount = derived(
	[dashboardStore, alertIndex],
	([$dashboardStore, $alertIndex]) => {
		const cfg = $dashboardStore.notifications;
		if (!cfg.enabled) return 0;
		const persistentCount = cfg.showPersistent ? $alertIndex.persistentCount : 0;
		const alertCount = cfg.showAlerts ? $alertIndex.activeAlertIds.size : 0;
		return persistentCount + alertCount;
	}
);

