import { describe, it, expect, vi } from 'vitest';
import { gitCommit } from './git';
import { execFile } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

describe('gitCommit', () => {
  it('runs git add and commit in sequence', async () => {
    const mockExecFile = vi.mocked(execFile);
    mockExecFile.mockImplementation((_cmd, _args, _opts, cb: any) => {
      cb(null, '', '');
      return {} as any;
    });

    await gitCommit('/data/pagu-db', 'recipes/NEW.json', 'Add new recipe');

    expect(mockExecFile).toHaveBeenCalledTimes(2);
    expect(mockExecFile.mock.calls[0][1]).toEqual(['add', 'recipes/NEW.json']);
    expect(mockExecFile.mock.calls[1][1]).toEqual(['commit', '-m', 'Add new recipe']);
  });
});
