/**
 * The daily worker run: fetch every source, write to Supabase, record the run (ARCHITECTURE.md §6).
 *
 *   npm run worker                 all sources
 *   npm run worker -- qasa homeq   some sources (a source left out is not touched, nothing of it is removed)
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_KEY, from the environment or a .env file at the repo root.
 * Exit code 0 only when the run is ok; the systemd unit shows anything else as failed.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { KARLAPLAN, SupabaseTravelCache, TravelTimeService } from '@lk/shared';
import { HttpClient } from './http.ts';
import { Pipeline } from './services/pipeline.ts';
import { systemClock } from './services/clock.ts';
import { ADAPTERS } from './sources/index.ts';
import { SupabaseStore } from './store/supabase.ts';

const envFile = new URL('../../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

// One run at a time: a second start while the first lives exits at once. A dead process leaves a stale lock; pid check clears it.
const lock = new URL('../out/worker.lock', import.meta.url);
mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
if (existsSync(lock)) {
  const pid = Number(readFileSync(lock, 'utf8'));
  let alive = true;
  try { process.kill(pid, 0); } catch { alive = false; }
  if (alive) { console.error(`another run is active (pid ${pid})`); process.exit(2); }
}
writeFileSync(lock, String(process.pid));
process.on('exit', () => rmSync(lock, { force: true }));

const wanted = process.argv.slice(2);
const fetchers = wanted.length ? ADAPTERS.filter(a => wanted.includes(a.source)) : ADAPTERS;

const store = SupabaseStore.fromEnv();
const summary = await new Pipeline({
  fetchers, http: new HttpClient(), store, clock: systemClock,
  travel: { service: new TravelTimeService({ fetch, cache: new SupabaseTravelCache(store.client), now: () => new Date() }), destination: KARLAPLAN },
  log: m => console.log(`${new Date().toISOString()} ${m}`),
}).run();

console.table(summary.sources);
if (summary.travel) console.log(`travel times to Karlaplan: computed ${summary.travel.computed}, reused ${summary.travel.reused}, failed ${summary.travel.failed}`);
console.log(`run ${summary.runId}: ${summary.ok ? 'ok' : 'NOT OK'}, ${summary.linked} duplicate links changed`);
for (const p of summary.problems) console.error(`problem: ${p}`);
process.exitCode = summary.ok ? 0 : 1;
