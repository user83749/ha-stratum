import { K as store_get, E as attr, F as escape_html, M as unsubscribe_stores } from './exports-DN21j1G3.js';
import './state.svelte-CVrpdDpz.js';
import { h as configStore, i as error } from './entities-BORCzbLn.js';
import 'clsx';
import './dashboard-D8zqAuB8.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let hassUrl = store_get($$store_subs ??= {}, "$configStore", configStore).hassUrl || "http://homeassistant.local:8123";
    let token = "";
    let isLoading = false;
    $$renderer2.push(`<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4"><div class="pointer-events-none absolute inset-0" style="background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 40px 40px;"></div> <div class="pointer-events-none absolute inset-0 flex items-center justify-center"><div class="h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]"></div></div> <div class="relative z-10 w-full max-w-md"><div class="mb-8 text-center"><div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 ring-1 ring-indigo-500/30"><svg class="h-7 w-7 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"></path></svg></div> <h1 class="text-2xl font-semibold tracking-tight text-white">Stratum</h1> <p class="mt-1 text-sm text-zinc-500">Connect to your Home Assistant instance</p></div> <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm"><div class="space-y-4"><div class="space-y-1.5"><label for="hassUrl" class="block text-xs font-medium text-zinc-400">Home Assistant URL</label> <input id="hassUrl" type="url"${attr("value", hassUrl)} placeholder="http://homeassistant.local:8123" class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/20" autocomplete="off" spellcheck="false"/></div> <div class="space-y-1.5"><label for="token" class="block text-xs font-medium text-zinc-400">Long-Lived Access Token</label> <input id="token" type="password"${attr("value", token)} placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9…" class="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-indigo-500/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/20" autocomplete="off" spellcheck="false"/> <p class="text-xs text-zinc-600">Generate one in HA → Profile → Security → Long-Lived Access Tokens</p></div> `);
    if (store_get($$store_subs ??= {}, "$wsError", error)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5"><svg class="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <p class="text-xs text-red-400">${escape_html(store_get($$store_subs ??= {}, "$wsError", error))}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <button${attr("disabled", isLoading, true)} class="group relative w-full overflow-hidden rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-60">`);
    {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Connect`);
    }
    $$renderer2.push(`<!--]--></button> <div class="relative flex items-center gap-3 py-1"><div class="h-px flex-1 bg-white/[0.06]"></div> <span class="text-xs text-zinc-600">or</span> <div class="h-px flex-1 bg-white/[0.06]"></div></div> <button class="w-full rounded-lg border border-white/[0.08] bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-400 transition hover:border-white/[0.15] hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-white/20">Try Demo — no HA required</button></div></div> <p class="mt-4 text-center text-xs text-zinc-700">Credentials are stored locally in your browser only</p></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C--5FUop.js.map
