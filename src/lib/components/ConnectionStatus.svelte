<script lang="ts">
	import { connectionStatus } from '$lib/ha/websocket';

	const statusConfig = {
		connected: { label: 'Connected', color: 'bg-emerald-500', pulse: false },
		connecting: { label: 'Connecting…', color: 'bg-amber-400', pulse: true },
		disconnected: { label: 'Disconnected', color: 'bg-zinc-500', pulse: false },
		error: { label: 'Error', color: 'bg-red-500', pulse: false }
	} as const;

	const current = $derived(statusConfig[$connectionStatus]);
</script>

<div class="flex items-center gap-2">
	<span class="relative flex h-2 w-2">
		{#if current.pulse}
			<span class="absolute inline-flex h-full w-full animate-ping rounded-full {current.color} opacity-75"></span>
		{/if}
		<span class="relative inline-flex h-2 w-2 rounded-full {current.color}"></span>
	</span>
	<span class="text-xs font-medium text-zinc-400">{current.label}</span>
</div>
