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

  it('list_recipes returns sorted file names', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      'SOY_SAUCE.json', 'APPLE.json', 'README.md',
    ] as any);

    const result = await executeToolCall(REPO, 'list_recipes', {});
    const parsed = JSON.parse(result);

    expect(parsed).toEqual(['APPLE.json', 'SOY_SAUCE.json']);
    expect(fs.readdir).toHaveBeenCalledWith('/data/pagu-db/recipes');
  });

  it('read_recipe returns file content', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{"id":"APPLE","production_type":"purchasable"}');

    const result = await executeToolCall(REPO, 'read_recipe', { id: 'APPLE' });

    expect(result).toBe('{"id":"APPLE","production_type":"purchasable"}');
    expect(fs.readFile).toHaveBeenCalledWith('/data/pagu-db/recipes/APPLE.json', 'utf-8');
  });

  it('write_recipe writes file and commits', async () => {
    vi.mocked(fs.writeFile).mockResolvedValue();
    vi.mocked(git.gitCommit).mockResolvedValue();

    const result = await executeToolCall(REPO, 'write_recipe', {
      id: 'NEW',
      content: '{"id":"NEW","production_type":"purchasable"}',
      message: 'Add new recipe',
    });

    expect(result).toContain('Successfully wrote');
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/data/pagu-db/recipes/NEW.json',
      '{"id":"NEW","production_type":"purchasable"}',
      'utf-8',
    );
    expect(git.gitCommit).toHaveBeenCalledWith(
      '/data/pagu-db',
      'recipes/NEW.json',
      'Add new recipe',
    );
  });

  it('read_recipe rejects path traversal', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));
    const result = await executeToolCall(REPO, 'read_recipe', { id: '../../.env' });
    expect(result).toContain('Error');
    // Verify the path was sanitized — traversal was stripped to just the basename
    expect(fs.readFile).toHaveBeenCalledWith('/data/pagu-db/recipes/.env.json', 'utf-8');
  });
});
