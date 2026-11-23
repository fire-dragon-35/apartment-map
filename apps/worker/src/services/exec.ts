import { spawn } from 'node:child_process';

/** Run a command; stdout is returned, stderr goes line by line to `onStderr`. Rejects on a non-zero exit. */
export function run(command: string, args: string[], options: { env?: NodeJS.ProcessEnv; onStderr?: (line: string) => void } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...options.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', tail = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => {
      tail = (tail + d).slice(-4000);
      for (const line of String(d).split('\n')) if (line.trim()) options.onStderr?.(line);
    });
    child.on('error', reject);
    child.on('close', code => (code === 0 ? resolve(stdout) : reject(new Error(`${command} exited with ${code}: ${tail.trim().split('\n').slice(-3).join(' | ')}`))));
  });
}

export const commandExists = (command: string) => run('which', [command]).then(() => true, () => false);
