import { describe, it, expect } from 'vitest';
import { MattermostClient } from '../../client.js';

/**
 * Integration test — hits the real Mattermost server.
 * Run with: npx vitest run src/tools/__tests__/send-dm.integration.test.ts
 */
describe('send DM to patrick (integration)', () => {
  const PATRICK_USER_ID = 'kkh8ibpnftnp3f1q1tbb9b669y';

  it('creates a DM channel with patrick', async () => {
    const client = new MattermostClient();
    const channel = await client.createDirectMessageChannel(PATRICK_USER_ID);

    expect(channel).toBeDefined();
    expect(channel.id).toBeTruthy();
    expect(channel.type).toBe('D');
  });

  it('sends a DM to patrick and receives a valid post response', async () => {
    const client = new MattermostClient();
    const channel = await client.createDirectMessageChannel(PATRICK_USER_ID);
    const post = await client.createPost(channel.id, 'Hello from TDD integration test!');

    expect(post).toBeDefined();
    expect(post.id).toBeTruthy();
    expect(post.channel_id).toBe(channel.id);
    expect(post.message).toBe('Hello from TDD integration test!');
  });
});
