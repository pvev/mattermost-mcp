import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { 
  listChannelsTool, 
  getChannelHistoryTool,
  handleListChannels,
  handleGetChannelHistory
} from "./channels.js";
import {
  postMessageTool,
  replyToThreadTool,
  addReactionTool,
  getThreadRepliesTool,
  createDirectChannelTool,
  sendDirectMessageTool,
  getDirectChannelPostsTool,
  handlePostMessage,
  handleReplyToThread,
  handleAddReaction,
  handleGetThreadReplies,
  handleCreateDirectChannel,
  handleSendDirectMessage,
  handleGetDirectChannelPosts
} from "./messages.js";
import {
  getUsersTool,
  getUserProfileTool,
  searchUsersTool,
  handleGetUsers,
  handleGetUserProfile,
  handleSearchUsers
} from "./users.js";
import {
  runMonitoringTool,
  handleRunMonitoring,
  setTopicMonitorInstance
} from "./monitoring.js";
import { MattermostClient } from "../client.js";

// Export all tool definitions
export const tools: Tool[] = [
  listChannelsTool,
  getChannelHistoryTool,
  postMessageTool,
  replyToThreadTool,
  addReactionTool,
  getThreadRepliesTool,
  getUsersTool,
  getUserProfileTool,
  searchUsersTool,
  createDirectChannelTool,
  sendDirectMessageTool,
  getDirectChannelPostsTool,
  runMonitoringTool
];

// Export the setTopicMonitorInstance function
export { setTopicMonitorInstance };

// Tool handler map
export const toolHandlers: Record<string, Function> = {
  mattermost_list_channels: handleListChannels,
  mattermost_get_channel_history: handleGetChannelHistory,
  mattermost_post_message: handlePostMessage,
  mattermost_reply_to_thread: handleReplyToThread,
  mattermost_add_reaction: handleAddReaction,
  mattermost_get_thread_replies: handleGetThreadReplies,
  mattermost_get_users: handleGetUsers,
  mattermost_get_user_profile: handleGetUserProfile,
  mattermost_search_users: handleSearchUsers,
  mattermost_create_direct_channel: handleCreateDirectChannel,
  mattermost_send_direct_message: handleSendDirectMessage,
  mattermost_get_direct_channel_posts: handleGetDirectChannelPosts,
  mattermost_run_monitoring: handleRunMonitoring
};

// Execute a tool with the given name and arguments
export async function executeTool(
  client: MattermostClient,
  toolName: string,
  args: any
) {
  const handler = toolHandlers[toolName];
  
  if (!handler) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: `Unknown tool: ${toolName}`,
          }),
        },
      ],
      isError: true,
    };
  }
  
  try {
    return await handler(client, args);
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
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
