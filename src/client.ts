import fetch from 'node-fetch';
import { loadConfig } from './config.js';
import {
  Channel,
  Post,
  User,
  UserProfile,
  Reaction,
  PostsResponse,
  ChannelsResponse,
  UsersResponse
} from './types.js';

export class MattermostClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private teamId: string;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.mattermostUrl;
    this.teamId = config.teamId;
    this.headers = {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // Channel-related methods
  async getChannels(limit: number = 100, page: number = 0): Promise<ChannelsResponse> {
    const url = new URL(`${this.baseUrl}/teams/${this.teamId}/channels`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', limit.toString());
    
    const response = await fetch(url.toString(), { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get channels: ${response.status} ${response.statusText}`);
    }
    
    // The API returns an array of channels, but our ChannelsResponse type expects an object
    // with a channels property, so we need to transform the response
    const channelsArray = await response.json();
    
    // Check if the response is an array (as expected from the API)
    if (Array.isArray(channelsArray)) {
      return {
        channels: channelsArray,
        total_count: channelsArray.length
      };
    }
    
    // If it's already in the expected format, return it as is
    return channelsArray as ChannelsResponse;
  }

  async getChannel(channelId: string): Promise<Channel> {
    const url = `${this.baseUrl}/channels/${channelId}`;
    const response = await fetch(url, { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get channel: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<Channel>;
  }

  // Post-related methods
  async createPost(channelId: string, message: string, rootId?: string): Promise<Post> {
    const url = `${this.baseUrl}/posts`;
    const body = {
      channel_id: channelId,
      message,
      root_id: rootId || ''
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<Post>;
  }

  async getPostsForChannel(channelId: string, limit: number = 30, page: number = 0): Promise<PostsResponse> {
    const url = new URL(`${this.baseUrl}/channels/${channelId}/posts`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', limit.toString());
    
    const response = await fetch(url.toString(), { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get posts: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<PostsResponse>;
  }

  async getPost(postId: string): Promise<Post> {
    const url = `${this.baseUrl}/posts/${postId}`;
    const response = await fetch(url, { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get post: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<Post>;
  }

  async getPostThread(postId: string): Promise<PostsResponse> {
    const url = `${this.baseUrl}/posts/${postId}/thread`;
    const response = await fetch(url, { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get post thread: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<PostsResponse>;
  }

  // Reaction-related methods
  async addReaction(postId: string, emojiName: string): Promise<Reaction> {
    const url = `${this.baseUrl}/reactions`;
    const body = {
      post_id: postId,
      emoji_name: emojiName
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add reaction: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<Reaction>;
  }

  // User-related methods
  async getUsers(limit: number = 100, page: number = 0): Promise<UsersResponse> {
    const url = new URL(`${this.baseUrl}/users`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', limit.toString());
    
    const response = await fetch(url.toString(), { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get users: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<UsersResponse>;
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    const url = `${this.baseUrl}/users/${userId}`;
    const response = await fetch(url, { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<UserProfile>;
  }
  
  // Get the current user's profile (the bot/integration itself)
  async getMe(): Promise<UserProfile> {
    const url = `${this.baseUrl}/users/me`;
    const response = await fetch(url, { headers: this.headers });
    
    if (!response.ok) {
      throw new Error(`Failed to get own user profile: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<UserProfile>;
  }
  
  // Create a direct message channel between two users
  async createDirectChannel(userId1: string, userId2: string): Promise<Channel> {
    const url = `${this.baseUrl}/channels/direct`;
    const body = [userId1, userId2];
    
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create direct channel: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<Channel>;
  }
}
