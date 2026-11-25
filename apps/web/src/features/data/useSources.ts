import { useEffect, useState } from 'react';
import { rest } from '../../app/api.ts';
import type { SourceStatus } from './status.ts';

const fetchStatus = () => rest<SourceStatus[]>('source_status?select=*&order=source');

/** Started when the module loads, next to the listings request. One retry. */
const request = fetchStatus().catch(fetchStatus);

/** The latest scrape of every source (view `source_status`). */
export function useSources() {
  const [rows, setRows] = useState<SourceStatus[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => { request.then(setRows, (e: unknown) => setError(e instanceof Error ? e : new Error(String(e)))); }, []);
  return { rows, error };
}
