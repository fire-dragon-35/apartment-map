/**
 * The daily worker run: fetch every source, write to Supabase, record the run (ARCHITECTURE.md §6).
 *
 *   npm run worker                 all sources
 *   npm run worker -- qasa homeq   some sources (a source left out is not touched, nothing of it is removed)
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_KEY, from the environment or a .env file at the repo root.
 * Facebook also needs APIFY_TOKEN and ANTHROPIC_API_KEY; without them it is left out (and nothing of it is removed).
 * Exit code 0 only when the run is ok; the systemd unit shows anything else as failed.
 */
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { HttpClient } from './http.ts';
import { MatrixService } from './services/matrix.ts';
import { R5Router } from './services/r5-router.ts';
import { RouterInputs } from './services/router-inputs.ts';
import { SupabaseMatrixRepository } from './store/matrix.ts';
import { Pipeline } from './services/pipeline.ts';
import { systemClock } from './services/clock.ts';
import { ADAPTERS } from './sources/index.ts';
import { Facebook } from './sources/facebook.ts';
import { ClaudeExtractor } from './sources/facebook/extract.ts';
import { NominatimGeocoder } from './sources/facebook/geocode.ts';
import { SupabaseFbPosts } from './store/fb-posts.ts';
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

const store = SupabaseStore.fromEnv();
const log = (m: string) => console.log(`${new Date().toISOString()} ${m}`);

const facebook = () => {
  const { APIFY_TOKEN, ANTHROPIC_API_KEY } = process.env;
  if (!APIFY_TOKEN || !ANTHROPIC_API_KEY) { log('facebook: left out (APIFY_TOKEN or ANTHROPIC_API_KEY missing)'); return []; }
  const groups = readFileSync(new URL('../facebook-groups.txt', import.meta.url), 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  return [new Facebook({
    apifyToken: APIFY_TOKEN, groups, posts: new SupabaseFbPosts(store.client), today: systemClock.today(),
    extractor: new ClaudeExtractor(new HttpClient({ timeoutMs: 60_000, retries: 3, gapMs: 200 }), ANTHROPIC_API_KEY),
    geocoder: new NominatimGeocoder(new HttpClient({ timeoutMs: 20_000, retries: 2, gapMs: 1100 }), 'EnkelLGH worker (https://enkellgh.se)'),
    apifyHttp: new HttpClient({ timeoutMs: 300_000, retries: 1, gapMs: 0 }),
  })];
};
const all = [...ADAPTERS, ...facebook()];
const wanted = process.argv.slice(2);
const fetchers = wanted.length ? all.filter(a => wanted.includes(a.source)) : all;
const cacheDir = fileURLToPath(new URL('../cache', import.meta.url));
const routerDir = fileURLToPath(new URL('../router', import.meta.url));
const router = new R5Router(new RouterInputs({ cacheDir, gtfsKey: process.env.TRAFIKLAB_GTFS_KEY, log }), { routerDir, cacheDir, log });
const summary = await new Pipeline({
  fetchers, http: new HttpClient(), store, clock: systemClock,
  matrix: new MatrixService({ router, repo: new SupabaseMatrixRepository(store.client), now: () => new Date() }),
  log,
}).run();

console.table(summary.sources);
if (summary.matrix) console.log(`travel matrix: ${summary.matrix.full ? 'full rebuild' : 'incremental'}, ${summary.matrix.cells} cells, ${summary.matrix.computed} places computed, ${summary.matrix.seconds} s`);
console.log(`run ${summary.runId}: ${summary.ok ? 'ok' : 'NOT OK'}, ${summary.linked} duplicate links changed`);
for (const p of summary.problems) console.error(`problem: ${p}`);
process.exitCode = summary.ok ? 0 : 1;
