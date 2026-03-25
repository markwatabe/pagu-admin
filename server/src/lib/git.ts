import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

export async function gitCommit(
  repoPath: string,
  filePath: string,
  message: string,
): Promise<void> {
  const opts = { cwd: repoPath };
  await execFile('git', ['add', filePath], opts);
  await execFile('git', ['commit', '-m', message], opts);
}
