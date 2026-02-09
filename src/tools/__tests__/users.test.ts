import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSearchUsers } from '../users.js';
import { MattermostClient } from '../../client.js';

// Mock the client
vi.mock('../../client.js');
vi.mock('../../config.js', () => ({
  loadConfig: () => ({
    mattermostUrl: 'http://localhost:8065/api/v4',
    token: 'test-token',
    teamId: 'test-team-id',
  }),
}));

describe('handleSearchUsers', () => {
  let client: MattermostClient;

  beforeEach(() => {
    client = new MattermostClient();
    vi.restoreAllMocks();
  });

  it('should return formatted users on success', async () => {
    client.searchUsers = vi.fn().mockResolvedValue([
      {
        id: 'user-1',
        username: 'john.doe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        nickname: 'johnd',
        position: 'Developer',
        roles: 'system_user',
        is_bot: false,
      },
      {
        id: 'user-2',
        username: 'jane.doe',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        nickname: 'janed',
        position: 'Manager',
        roles: 'system_user',
        is_bot: false,
      },
    ]);

    const result = await handleSearchUsers(client, { term: 'doe' });

    expect(client.searchUsers).toHaveBeenCalledWith('doe');
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      id: 'user-1',
      username: 'john.doe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    });
    expect(parsed[1]).toEqual({
      id: 'user-2',
      username: 'jane.doe',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    });
  });

  it('should return empty array when no users found', async () => {
    client.searchUsers = vi.fn().mockResolvedValue([]);

    const result = await handleSearchUsers(client, { term: 'nonexistent' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual([]);
  });

  it('should return error on failure', async () => {
    client.searchUsers = vi.fn().mockRejectedValue(
      new Error('Failed to search users: 500 Internal Server Error')
    );

    const result = await handleSearchUsers(client, { term: 'doe' });

    expect((result as any).isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('500 Internal Server Error');
  });

  it('should only return id, username, first_name, last_name, email fields', async () => {
    client.searchUsers = vi.fn().mockResolvedValue([
      {
        id: 'user-1',
        username: 'john.doe',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        nickname: 'johnd',
        position: 'Developer',
        roles: 'system_admin',
        locale: 'en',
        timezone: {},
        is_bot: false,
        bot_description: '',
        create_at: 1700000000000,
        update_at: 1700000000000,
        delete_at: 0,
      },
    ]);

    const result = await handleSearchUsers(client, { term: 'john' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0]).toEqual({
      id: 'user-1',
      username: 'john.doe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    });
    // Ensure extra fields are not included
    expect(parsed[0].nickname).toBeUndefined();
    expect(parsed[0].roles).toBeUndefined();
    expect(parsed[0].is_bot).toBeUndefined();
  });
});
