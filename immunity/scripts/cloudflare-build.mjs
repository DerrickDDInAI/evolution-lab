import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const config = JSON.parse(readFileSync(new URL("wrangler.cloudflare.json", root), "utf8"));
const database = config.d1_databases?.find((binding) => binding.binding === "DB");
if (!database || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(database.database_id)
    || database.database_id === "00000000-0000-4000-8000-000000000000") {
  throw new Error("Set the real Cloudflare D1 database ID in wrangler.cloudflare.json before building. Existing Sites data must be migrated separately.");
}
const result = spawnSync(process.execPath, [fileURLToPath(new URL("run-framework.mjs", import.meta.url)), "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, EVOGOO_HOSTING: "cloudflare" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
