// Type definitions for Mattermost API responses and MCP tool arguments

// Tool argument types
export interface ListChannelsArgs {
  limit?: number;
  page?: number;
}

export interface PostMessageArgs {
  channel_id: string;
  message: string;
}

export interface ReplyToThreadArgs {
  channel_id: string;
  post_id: string;
  message: string;
}

export interface AddReactionArgs {
  channel_id: string;
  post_id: string;
  emoji_name: string;
}

export interface GetChannelHistoryArgs {
  channel_id: string;
  limit?: number;
  page?: number;
}

export interface GetThreadRepliesArgs {
  channel_id: string;
  post_id: string;
}

export interface GetUsersArgs {
  page?: number;
  limit?: number;
}

export interface GetUserProfileArgs {
  user_id: string;
}

export interface CreateDirectChannelArgs {
  user_id: string;
}

export interface SendDirectMessageArgs {
  user_id: string;
  message: string;
  root_id?: string;
}

export interface GetDirectChannelPostsArgs {
  user_id: string;
  per_page?: number;
}

export interface SearchUsersArgs {
  term: string;
}

// Mattermost API response types
export interface Channel {
  id: string;
  team_id: string;
  display_name: string;
  name: string;
  type: string;
  header: string;
  purpose: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  total_msg_count: number;
  creator_id: string;
}

export interface Post {
  id: string;
  create_at: number;
  update_at: number;
  delete_at: number;
  edit_at: number;
  user_id: string;
  channel_id: string;
  root_id: string;
  original_id: string;
  message: string;
  type: string;
  props: Record<string, any>;
  hashtags: string;
  pending_post_id: string;
  reply_count: number;
  metadata: Record<string, any>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string;
  position: string;
  roles: string;
  locale: string;
  timezone: Record<string, any>;
  is_bot: boolean;
  bot_description: string;
  create_at: number;
  update_at: number;
  delete_at: number;
}

export interface UserProfile extends User {
  last_picture_update: number;
  auth_service: string;
  email_verified: boolean;
  notify_props: Record<string, any>;
  props: Record<string, any>;
  terms_of_service_id: string;
  terms_of_service_create_at: number;
}

export interface Reaction {
  user_id: string;
  post_id: string;
  emoji_name: string;
  create_at: number;
}

export interface PostsResponse {
  posts: Record<string, Post>;
  order: string[];
  next_post_id: string;
  prev_post_id: string;
}

export interface ChannelsResponse {
  channels: Channel[];
  total_count: number;
}

export interface UsersResponse {
  users: User[];
  total_count: number;
}
