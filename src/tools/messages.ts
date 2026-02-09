import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { MattermostClient } from "../client.js";
import {
  PostMessageArgs,
  ReplyToThreadArgs,
  AddReactionArgs,
  GetThreadRepliesArgs,
  CreateDirectChannelArgs,
  SendDirectMessageArgs,
  GetDirectChannelPostsArgs
} from "../types.js";

// Tool definition for posting a message
export const postMessageTool: Tool = {
  name: "mattermost_post_message",
  description: "Post a new message to a Mattermost channel",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel to post to",
      },
      message: {
        type: "string",
        description: "The message text to post",
      },
    },
    required: ["channel_id", "message"],
  },
};

// Tool definition for replying to a thread
export const replyToThreadTool: Tool = {
  name: "mattermost_reply_to_thread",
  description: "Reply to a specific message thread in Mattermost",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      post_id: {
        type: "string",
        description: "The ID of the parent message to reply to",
      },
      message: {
        type: "string",
        description: "The reply text",
      },
    },
    required: ["channel_id", "post_id", "message"],
  },
};

// Tool definition for adding a reaction
export const addReactionTool: Tool = {
  name: "mattermost_add_reaction",
  description: "Add a reaction emoji to a message",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the message",
      },
      post_id: {
        type: "string",
        description: "The ID of the message to react to",
      },
      emoji_name: {
        type: "string",
        description: "The name of the emoji reaction (without colons)",
      },
    },
    required: ["channel_id", "post_id", "emoji_name"],
  },
};

// Tool definition for getting thread replies
export const getThreadRepliesTool: Tool = {
  name: "mattermost_get_thread_replies",
  description: "Get all replies in a message thread",
  inputSchema: {
    type: "object",
    properties: {
      channel_id: {
        type: "string",
        description: "The ID of the channel containing the thread",
      },
      post_id: {
        type: "string",
        description: "The ID of the parent message",
      },
    },
    required: ["channel_id", "post_id"],
  },
};

// Tool handler for posting a message
export async function handlePostMessage(
  client: MattermostClient,
  args: PostMessageArgs
) {
  const { channel_id, message } = args;
  
  try {
    const response = await client.createPost(channel_id, message);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: response.id,
            channel_id: response.channel_id,
            message: response.message,
            create_at: new Date(response.create_at).toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error posting message:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for replying to a thread
export async function handleReplyToThread(
  client: MattermostClient,
  args: ReplyToThreadArgs
) {
  const { channel_id, post_id, message } = args;
  
  try {
    const response = await client.createPost(channel_id, message, post_id);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: response.id,
            channel_id: response.channel_id,
            root_id: response.root_id,
            message: response.message,
            create_at: new Date(response.create_at).toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error replying to thread:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for adding a reaction
export async function handleAddReaction(
  client: MattermostClient,
  args: AddReactionArgs
) {
  const { post_id, emoji_name } = args;
  
  try {
    const response = await client.addReaction(post_id, emoji_name);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            post_id: response.post_id,
            user_id: response.user_id,
            emoji_name: response.emoji_name,
            create_at: new Date(response.create_at).toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error adding reaction:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool definition for creating a direct message channel
export const createDirectChannelTool: Tool = {
  name: "mattermost_create_direct_channel",
  description: "Create or get an existing direct message channel with a user",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user to create a DM channel with",
      },
    },
    required: ["user_id"],
  },
};

// Tool definition for sending a direct message
export const sendDirectMessageTool: Tool = {
  name: "mattermost_send_direct_message",
  description: "Send a direct message to a user (creates DM channel if needed)",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user to send a DM to",
      },
      message: {
        type: "string",
        description: "The message text to send",
      },
      root_id: {
        type: "string",
        description: "The ID of the root post for threaded replies (optional)",
      },
    },
    required: ["user_id", "message"],
  },
};

// Tool definition for getting direct channel posts
export const getDirectChannelPostsTool: Tool = {
  name: "mattermost_get_direct_channel_posts",
  description: "Get recent posts from a direct message conversation with a user",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user whose DM conversation to read",
      },
      per_page: {
        type: "number",
        description: "Number of posts to return (default 30)",
        default: 30,
      },
    },
    required: ["user_id"],
  },
};

// Tool handler for creating a direct message channel
export async function handleCreateDirectChannel(
  client: MattermostClient,
  args: CreateDirectChannelArgs
) {
  const { user_id } = args;

  try {
    const channel = await client.createDirectMessageChannel(user_id);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: channel.id,
            type: channel.type,
            name: channel.name,
            display_name: channel.display_name,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error creating direct channel:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for sending a direct message
export async function handleSendDirectMessage(
  client: MattermostClient,
  args: SendDirectMessageArgs
) {
  const { user_id, message, root_id } = args;

  try {
    const channel = await client.createDirectMessageChannel(user_id);
    const post = await client.createPost(channel.id, message, root_id);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            id: post.id,
            channel_id: post.channel_id,
            message: post.message,
            root_id: post.root_id || null,
            create_at: new Date(post.create_at).toISOString(),
            dm_with_user: user_id,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error sending direct message:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for getting direct channel posts
export async function handleGetDirectChannelPosts(
  client: MattermostClient,
  args: GetDirectChannelPostsArgs
) {
  const { user_id, per_page } = args;
  const limit = per_page || 30;

  try {
    const channel = await client.createDirectMessageChannel(user_id);
    const response = await client.getPostsForChannel(channel.id, limit);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting direct channel posts:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

// Tool handler for getting thread replies
export async function handleGetThreadReplies(
  client: MattermostClient,
  args: GetThreadRepliesArgs
) {
  const { post_id } = args;
  
  try {
    const response = await client.getPostThread(post_id);
    
    // Format the posts for better readability
    const formattedPosts = response.order.map(postId => {
      const post = response.posts[postId];
      return {
        id: post.id,
        user_id: post.user_id,
        message: post.message,
        create_at: new Date(post.create_at).toISOString(),
        root_id: post.root_id || null,
      };
    });
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            posts: formattedPosts,
            root_post: response.posts[post_id] ? {
              id: response.posts[post_id].id,
              user_id: response.posts[post_id].user_id,
              message: response.posts[post_id].message,
              create_at: new Date(response.posts[post_id].create_at).toISOString(),
            } : null,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting thread replies:", error);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}
