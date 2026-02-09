import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { MattermostClient } from "../client.js";
import { GetUsersArgs, GetUserProfileArgs, SearchUsersArgs } from "../types.js";

// Tool definition for getting users
export const getUsersTool: Tool = {
  name: "mattermost_get_users",
  description: "Get a list of users in the Mattermost workspace with pagination",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of users to return (default 100, max 200)",
        default: 100,
      },
      page: {
        type: "number",
        description: "Page number for pagination (starting from 0)",
        default: 0,
      },
    },
  },
};

// Tool definition for getting user profile
export const getUserProfileTool: Tool = {
  name: "mattermost_get_user_profile",
  description: "Get detailed profile information for a specific user",
  inputSchema: {
    type: "object",
    properties: {
      user_id: {
        type: "string",
        description: "The ID of the user",
      },
    },
    required: ["user_id"],
  },
};

// Tool definition for searching users
export const searchUsersTool: Tool = {
  name: "mattermost_search_users",
  description: "Search for users by username, first name, last name, or email",
  inputSchema: {
    type: "object",
    properties: {
      term: {
        type: "string",
        description: "The search term to match against username, first name, last name, or email",
      },
    },
    required: ["term"],
  },
};

// Tool handler for searching users
export async function handleSearchUsers(
  client: MattermostClient,
  args: SearchUsersArgs
) {
  const { term } = args;

  try {
    const users = await client.searchUsers(term);

    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formattedUsers, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error searching users:", error);
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

// Tool handler for getting users
export async function handleGetUsers(
  client: MattermostClient,
  args: GetUsersArgs
) {
  const limit = args.limit || 100;
  const page = args.page || 0;
  
  try {
    const response = await client.getUsers(limit, page);
    
    // Format the response for better readability
    const formattedUsers = response.users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      nickname: user.nickname,
      position: user.position,
      roles: user.roles,
      is_bot: user.is_bot,
    }));
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            users: formattedUsers,
            total_count: response.total_count,
            page: page,
            per_page: limit,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting users:", error);
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

// Tool handler for getting user profile
export async function handleGetUserProfile(
  client: MattermostClient,
  args: GetUserProfileArgs
) {
  const { user_id } = args;
  
  try {
    const user = await client.getUserProfile(user_id);
    
    // Format the response for better readability
    const formattedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      nickname: user.nickname,
      position: user.position,
      roles: user.roles,
      locale: user.locale,
      timezone: user.timezone,
      is_bot: user.is_bot,
      bot_description: user.bot_description,
      last_picture_update: user.last_picture_update,
      create_at: new Date(user.create_at).toISOString(),
      update_at: new Date(user.update_at).toISOString(),
    };
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(formattedUser, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
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
