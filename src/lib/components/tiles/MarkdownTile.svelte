<script lang="ts">
  // ── MarkdownTile ──────────────────────────────────────────────────────────

  // ── Imports ───────────────────────────────────────────────────────────────
  import type { Tile } from '$lib/types/dashboard';
  import { getTileSizePreset } from '$lib/layout/tileSizing';

  // ── Props ─────────────────────────────────────────────────────────────────
  let { tile }: { tile: Tile } = $props();

  // ── Derived State ─────────────────────────────────────────────────────────
  const config = $derived(tile.config ?? {});
  const sizePreset = $derived(getTileSizePreset(tile));
  const content = $derived(config.content as string ?? '');
  const visibleContent = $derived(sizePreset === 'sm' ? content.slice(0, 180) : content);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function renderMarkdown(md: string): string {
    return md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  const html = $derived(renderMarkdown(visibleContent));
</script>

<div class="md-tile" data-size={sizePreset}>
  {#if visibleContent}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
  {:else}
    <span class="empty">No content</span>
  {/if}
  {#if sizePreset === 'sm' && content.length > visibleContent.length}
    <span class="empty">More…</span>
  {/if}
</div>

<style>
  .md-tile {
    display: block;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    color: var(--fg);
    font-size: 0.82rem;
    line-height: 1.5;
  }

  .md-tile :global(h1) { font-size: 1.2rem; font-weight: 500; margin: 0 0 6px; color: var(--fg); }
  .md-tile :global(h2) { font-size: 1rem; font-weight: 500; margin: 0 0 5px; color: var(--fg); }
  .md-tile :global(h3) { font-size: 0.88rem; font-weight: 500; margin: 0 0 4px; color: var(--fg-muted); }
  .md-tile :global(strong) { font-weight: 500; }
  .md-tile :global(em) { font-style: italic; color: var(--fg-muted); }
  .md-tile :global(code) { font-family: monospace; background: var(--hover); border: 1px solid var(--border); border-radius: 3px; padding: 1px 4px; font-size: 0.8em; }
  .md-tile :global(a) { color: var(--accent); text-decoration: none; }
  .md-tile :global(a):hover { text-decoration: underline; }
  .md-tile :global(ul) { margin: 4px 0; padding-left: 16px; }
  .md-tile :global(li) { margin: 2px 0; }
  .md-tile :global(p) { margin: 0 0 6px; }

  .empty { color: var(--fg-subtle); font-size: 0.78rem; }
</style>
