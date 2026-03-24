import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeToolCall } from './agent-tools';
import * as fs from 'node:fs/promises';
import * as git from './git';

vi.mock('node:fs/promises');
vi.mock('./git');

const REPO = '/data/pagu-db';

describe('executeToolCall', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('list_ingredients returns sorted file names', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      'SOY_SAUCE.json', 'APPLE.json', 'README.md',
    ] as any);

    const result = await executeToolCall(REPO, 'list_ingredients', {});
    const parsed = JSON.parse(result);

    expect(parsed).toEqual(['APPLE.json', 'SOY_SAUCE.json']);
    expect(fs.readdir).toHaveBeenCalledWith('/data/pagu-db/ingredients');
  });

  it('read_ingredient returns file content', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{"id":"APPLE","production_type":"purchasable"}');

    const result = await executeToolCall(REPO, 'read_ingredient', { id: 'APPLE' });

    expect(result).toBe('{"id":"APPLE","production_type":"purchasable"}');
    expect(fs.readFile).toHaveBeenCalledWith('/data/pagu-db/ingredients/APPLE.json', 'utf-8');
  });

  it('write_ingredient writes file and commits', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue();
    vi.mocked(git.gitCommitAndPush).mockResolvedValue();

    const result = await executeToolCall(REPO, 'write_ingredient', {
      id: 'NEW',
      content: '{"id":"NEW","production_type":"purchasable"}',
      message: 'Add new ingredient',
    });

    expect(result).toContain('Successfully wrote');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/data/pagu-db/ingredients/NEW.json',
      '{"id":"NEW","production_type":"purchasable"}',
      'utf-8',
    );
    expect(git.gitCommitAndPush).toHaveBeenCalledWith(
      '/data/pagu-db',
      'ingredients/NEW.json',
      'Add new ingredient',
    );
  });
});
