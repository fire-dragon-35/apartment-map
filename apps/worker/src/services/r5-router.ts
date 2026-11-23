/** TravelRouter on r5py: runs apps/worker/router/matrix.py as a subprocess (Python venv, Java 21). */
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { LatLon } from '@lk/shared';
import { run } from './exec.ts';
import type { RouterInputs } from './router-inputs.ts';
import type { TravelRouter } from './matrix.ts';

export interface R5Options {
  /** apps/worker/router: matrix.py and .venv */
  routerDir: string;
  /** apps/worker/cache: the JDK installed by setup.sh lives in cache/jdk/current */
  cacheDir: string;
  maxMemory?: string;
  log?: (m: string) => void;
}

export class R5Router implements TravelRouter {
  constructor(private readonly inputs: RouterInputs, private readonly options: R5Options) {}

  async prepare(): Promise<string> {
    const files = await this.inputs.ensure();
    return (await this.#python(['hash', '--gtfs', files.gtfs])).trim();
  }

  async transit(origins: LatLon[], cells: LatLon[], date: string): Promise<Int16Array> {
    const files = await this.inputs.ensure();
    const dir = await mkdtemp(`${tmpdir()}/matrix-`);
    try {
      const point = (p: LatLon) => ({ lat: p.lat, lon: p.lon });
      await writeFile(`${dir}/origins.json`, JSON.stringify(origins.map(point)));
      await writeFile(`${dir}/cells.json`, JSON.stringify(cells.map(point)));
      await this.#python(['build', '--gtfs', files.gtfs, '--osm', files.osm, '--origins', `${dir}/origins.json`, '--cells', `${dir}/cells.json`,
        '--date', date, '--out', `${dir}/matrix.i16`, '--max-memory', this.options.maxMemory ?? '3G']);
      const bytes = await readFile(`${dir}/matrix.i16`);
      const out = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
      if (out.length !== origins.length * cells.length) throw new Error(`router returned ${out.length} values, expected ${origins.length * cells.length}`);
      return Int16Array.from(out);   // copy: the Buffer's memory may be pooled and not 2-byte aligned
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  #python(args: string[]): Promise<string> {
    const { routerDir, cacheDir, log } = this.options;
    const python = `${routerDir}/.venv/bin/python`;
    const javaHome = process.env.JAVA_HOME ?? `${cacheDir}/jdk/current`;
    if (!existsSync(python) || !existsSync(`${javaHome}/bin/java`)) throw new Error('router is not set up: run apps/worker/router/setup.sh');
    return run(python, [`${routerDir}/matrix.py`, ...args], {
      env: { JAVA_HOME: javaHome, PATH: `${javaHome}/bin:${process.env.PATH}` },
      onStderr: line => log?.(`r5: ${line}`),
    });
  }
}
