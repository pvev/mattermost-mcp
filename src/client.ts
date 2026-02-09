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
  private myUserId: string | null = null;

  constructor() {
    const config = loadConfig();
    this.baseUrl = config.mattermostUrl;
    this.teamId = config.teamId;
    this.headers = {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getMyUserId(): Promise<string> {
    if (this.myUserId) return this.myUserId;
    const url = `${this.baseUrl}/users/me`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) {
      throw new Error(`Failed to get authenticated user: ${response.status} ${response.statusText}`);
    }
    const user = await response.json() as User;
    this.myUserId = user.id;
    return user.id;
  }

  // Channel-related methods
  async getChannels(limit: number = 100, page: number = 0): Promise<ChannelsResponse> {
    const url = new URL(`${this.baseUrl}/teams/${this.teamId}/channels`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', limit.toString());
    
    console.error(`Fetching channels from URL: ${url.toString()}`);
    console.error(`Using headers: ${JSON.stringify(this.headers)}`);
    
    try {
      const response = await fetch(url.toString(), { headers: this.headers });
      
      console.error(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response body: ${errorText}`);
        throw new Error(`Failed to get channels: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // The API returns an array of channels, but our ChannelsResponse type expects an object
      // with a channels property, so we need to transform the response
      const channelsArray = await response.json();
      
      console.error(`Response data type: ${typeof channelsArray}, isArray: ${Array.isArray(channelsArray)}`);
      
      // Check if the response is an array (as expected from the API)
      if (Array.isArray(channelsArray)) {
        return {
          channels: channelsArray,
          total_count: channelsArray.length
        };
      }
      
      // If it's already in the expected format, return it as is
      return channelsArray as ChannelsResponse;
    } catch (error) {
      console.error(`Error fetching channels: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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
  
  async searchUsers(term: string): Promise<User[]> {
    const url = `${this.baseUrl}/users/search`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ term }),
    });
    if (!response.ok) {
      throw new Error(`Failed to search users: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<User[]>;
  }

  // Direct message channel methods
  async createDirectMessageChannel(userId: string): Promise<Channel> {
    const myId = await this.getMyUserId();
    const url = `${this.baseUrl}/channels/direct`;
    const body = [myId, userId];

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create direct message channel: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<Channel>;
  }
}
