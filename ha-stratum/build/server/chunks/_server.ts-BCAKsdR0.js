import { j as json, e as error } from './index-CoD1IJuy.js';
import { existsSync, writeFileSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { d as defaultConfig, m as migrateConfig } from './dashboard-D8zqAuB8.js';

const DATA_DIR = process.env.ADDON === "true" ? "/data" : join(process.cwd(), "data");
const CONFIG_PATH = join(DATA_DIR, "dashboard.json");
function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}
const GET = () => {
  ensureDir();
  if (!existsSync(CONFIG_PATH)) {
    const fresh = defaultConfig();
    writeFileSync(CONFIG_PATH, JSON.stringify(fresh, null, 2), "utf-8");
    return json(fresh);
  }
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    return json(migrateConfig(raw));
  } catch {
    error(500, "Failed to read dashboard config");
  }
};
const POST = async ({ request }) => {
  ensureDir();
  let body;
  try {
    body = await request.json();
  } catch {
    error(400, "Invalid JSON body");
  }
  try {
    const config = migrateConfig(body);
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
    return json({ ok: true });
  } catch {
    error(500, "Failed to write dashboard config");
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-BCAKsdR0.js.map
