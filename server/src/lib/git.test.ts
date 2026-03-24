import { describe, it, expect, vi } from 'vitest';
import { gitCommitAndPush } from './git';
import { execFile } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

describe('gitCommitAndPush', () => {
  it('runs git add, commit, and push in sequence', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(null, '', '');
      return {} as any;
    });

    await gitCommitAndPush('/data/pagu-db', 'ingredients/NEW.json', 'Add new ingredient');

    expect(mockExecFile).toHaveBeenCalledTimes(3);
    expect(mockExecFile.mock.calls[0][1]).toEqual(['add', 'ingredients/NEW.json']);
    expect(mockExecFile.mock.calls[1][1]).toEqual(['commit', '-m', 'Add new ingredient']);
    expect(mockExecFile.mock.calls[2][1]).toEqual(['push', 'origin', 'main']);
  });
});
