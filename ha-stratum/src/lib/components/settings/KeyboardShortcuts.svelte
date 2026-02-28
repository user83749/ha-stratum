<script lang="ts">
	// ─────────────────────────────────────────────────────────────────────────
	// Stratum — KeyboardShortcuts.svelte
	// Static reference table of keyboard shortcuts.
	// ─────────────────────────────────────────────────────────────────────────

	const SHORTCUTS: { category: string; items: { keys: string[]; desc: string }[] }[] = [
		{
			category: 'General',
			items: [
				{ keys: ['Esc'],            desc: 'Close overlays / deselect' },
				{ keys: ['Ctrl', 'E'],      desc: 'Toggle edit mode'          },
				{ keys: ['Ctrl', ','],      desc: 'Open settings'             },
			]
		},
		{
			category: 'Edit mode',
			items: [
				{ keys: ['Ctrl', 'Z'],            desc: 'Undo'                  },
				{ keys: ['Ctrl', 'Shift', 'Z'],   desc: 'Redo'                  },
				{ keys: ['Delete'],               desc: 'Delete selected tile'  },
				{ keys: ['Backspace'],            desc: 'Delete selected tile'  },
				{ keys: ['Ctrl', 'D'],            desc: 'Duplicate tile'        },
			]
		},
		{
			category: 'Tile nudge (edit mode)',
			items: [
				{ keys: ['↑'],                    desc: 'Nudge tile up'         },
				{ keys: ['↓'],                    desc: 'Nudge tile down'       },
				{ keys: ['←'],                    desc: 'Nudge tile left'       },
				{ keys: ['→'],                    desc: 'Nudge tile right'      },
				{ keys: ['Shift', '↑'],           desc: 'Grow tile height'      },
				{ keys: ['Shift', '↓'],           desc: 'Shrink tile height'    },
				{ keys: ['Shift', '←'],           desc: 'Shrink tile width'     },
				{ keys: ['Shift', '→'],           desc: 'Grow tile width'       },
			]
		},
	];
</script>

<div class="ks">
	{#each SHORTCUTS as section}
		<div class="ks__section">
			<span class="s-label">{section.category}</span>
			<table class="ks__table">
				<tbody>
					{#each section.items as item}
						<tr class="ks__row">
							<td class="ks__keys">
								{#each item.keys as key, i}
									{#if i > 0}<span class="ks__plus">+</span>{/if}
									<kbd class="ks__kbd">{key}</kbd>
								{/each}
							</td>
							<td class="ks__desc">{item.desc}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/each}

	<div class="ks__footer">
		<span>Shortcuts use Cmd on macOS and Ctrl on Windows/Linux.</span>
	</div>
</div>

<style>
	.ks {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.ks__section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ks__table {
		width: 100%;
		border-collapse: collapse;
	}

	.ks__row {
		border-bottom: 1px solid var(--border);
	}

	.ks__row:last-child {
		border-bottom: none;
	}

	.ks__keys {
		padding: 8px 0;
		white-space: nowrap;
		width: 1px; /* shrink to content */
		padding-right: 16px;
	}

	.ks__kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 7px;
		border-radius: 4px;
		background: var(--surface);
		border: 1px solid var(--border-strong);
		border-bottom-width: 2px;
		color: var(--fg);
		font-size: 0.72rem;
		font-weight: 600;
		font-family: var(--font-family), monospace;
		box-shadow: 0 1px 0 var(--border-strong);
		line-height: 1.6;
	}

	.ks__plus {
		display: inline-block;
		margin: 0 3px;
		font-size: 0.7rem;
		color: var(--fg-subtle);
	}

	.ks__desc {
		padding: 8px 0;
		font-size: 0.83rem;
		color: var(--fg-muted);
		line-height: 1.4;
	}

	.ks__footer {
		padding: 12px;
		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1px solid var(--border);
		font-size: 0.75rem;
		color: var(--fg-subtle);
		line-height: 1.5;
	}
</style>
