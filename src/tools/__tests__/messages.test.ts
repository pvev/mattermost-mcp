import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleCreateDirectChannel,
  handleSendDirectMessage,
  handleGetDirectChannelPosts,
} from '../messages.js';
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

describe('handleCreateDirectChannel', () => {
  let client: MattermostClient;

  beforeEach(() => {
    client = new MattermostClient();
    vi.restoreAllMocks();
  });

  it('should return channel info on success', async () => {
    client.createDirectMessageChannel = vi.fn().mockResolvedValue({
      id: 'channel-123',
      type: 'D',
      name: 'user1__user2',
      display_name: 'user1, user2',
    });

    const result = await handleCreateDirectChannel(client, { user_id: 'user-456' });

    expect(client.createDirectMessageChannel).toHaveBeenCalledWith('user-456');
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe('channel-123');
    expect(parsed.type).toBe('D');
    expect(parsed.name).toBe('user1__user2');
    expect(parsed.display_name).toBe('user1, user2');
  });

  it('should return error on failure', async () => {
    client.createDirectMessageChannel = vi.fn().mockRejectedValue(
      new Error('Failed to create direct message channel: 403 Forbidden')
    );

    const result = await handleCreateDirectChannel(client, { user_id: 'user-456' });

    expect((result as any).isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('403 Forbidden');
  });
});

describe('handleSendDirectMessage', () => {
  let client: MattermostClient;

  beforeEach(() => {
    client = new MattermostClient();
    vi.restoreAllMocks();
  });

  it('should create DM channel and post message', async () => {
    client.createDirectMessageChannel = vi.fn().mockResolvedValue({
      id: 'channel-123',
      type: 'D',
      name: 'user1__user2',
      display_name: 'user1, user2',
    });
    client.createPost = vi.fn().mockResolvedValue({
      id: 'post-789',
      channel_id: 'channel-123',
      message: 'Hello!',
      root_id: '',
      create_at: 1700000000000,
    });

    const result = await handleSendDirectMessage(client, {
      user_id: 'user-456',
      message: 'Hello!',
    });

    expect(client.createDirectMessageChannel).toHaveBeenCalledWith('user-456');
    expect(client.createPost).toHaveBeenCalledWith('channel-123', 'Hello!', undefined);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe('post-789');
    expect(parsed.channel_id).toBe('channel-123');
    expect(parsed.message).toBe('Hello!');
    expect(parsed.dm_with_user).toBe('user-456');
  });

  it('should support threaded replies with root_id', async () => {
    client.createDirectMessageChannel = vi.fn().mockResolvedValue({
      id: 'channel-123',
      type: 'D',
      name: 'user1__user2',
      display_name: 'user1, user2',
    });
    client.createPost = vi.fn().mockResolvedValue({
      id: 'post-790',
      channel_id: 'channel-123',
      message: 'Reply!',
      root_id: 'post-789',
      create_at: 1700000001000,
    });

    const result = await handleSendDirectMessage(client, {
      user_id: 'user-456',
      message: 'Reply!',
      root_id: 'post-789',
    });

    expect(client.createPost).toHaveBeenCalledWith('channel-123', 'Reply!', 'post-789');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.root_id).toBe('post-789');
  });

  it('should return error on failure', async () => {
    client.createDirectMessageChannel = vi.fn().mockRejectedValue(
      new Error('Failed to create direct message channel: 500 Internal Server Error')
    );

    const result = await handleSendDirectMessage(client, {
      user_id: 'user-456',
      message: 'Hello!',
    });

    expect((result as any).isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('500 Internal Server Error');
  });
});

describe('handleGetDirectChannelPosts', () => {
  let client: MattermostClient;

  beforeEach(() => {
    client = new MattermostClient();
    vi.restoreAllMocks();
  });

  it('should create DM channel and get posts', async () => {
    client.createDirectMessageChannel = vi.fn().mockResolvedValue({
      id: 'channel-123',
      type: 'D',
      name: 'user1__user2',
      display_name: 'user1, user2',
    });
    const postsResponse = {
      posts: {
        'post-1': {
          id: 'post-1',
          user_id: 'user-456',
          channel_id: 'channel-123',
          message: 'Hi there',
          create_at: 1700000000000,
        },
      },
      order: ['post-1'],
      next_post_id: '',
      prev_post_id: '',
    };
    client.getPostsForChannel = vi.fn().mockResolvedValue(postsResponse);

    const result = await handleGetDirectChannelPosts(client, { user_id: 'user-456' });

    expect(client.createDirectMessageChannel).toHaveBeenCalledWith('user-456');
    expect(client.getPostsForChannel).toHaveBeenCalledWith('channel-123', 30);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.order).toEqual(['post-1']);
    expect(parsed.posts['post-1'].message).toBe('Hi there');
  });

  it('should respect per_page parameter', async () => {
    client.createDirectMessageChannel = vi.fn().mockResolvedValue({
      id: 'channel-123',
      type: 'D',
      name: 'user1__user2',
      display_name: 'user1, user2',
    });
    client.getPostsForChannel = vi.fn().mockResolvedValue({
      posts: {},
      order: [],
      next_post_id: '',
      prev_post_id: '',
    });

    await handleGetDirectChannelPosts(client, { user_id: 'user-456', per_page: 10 });

    expect(client.getPostsForChannel).toHaveBeenCalledWith('channel-123', 10);
  });

  it('should return error on failure', async () => {
    client.createDirectMessageChannel = vi.fn().mockRejectedValue(
      new Error('Failed to create direct message channel: 404 Not Found')
    );

    const result = await handleGetDirectChannelPosts(client, { user_id: 'user-456' });

    expect((result as any).isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error).toContain('404 Not Found');
  });
});
