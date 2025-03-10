# Mattermost MCP Server

MCP Server for the Mattermost API, enabling Claude and other MCP clients to interact with Mattermost workspaces.

## Features

This MCP server provides tools for interacting with Mattermost, including:

### Topic Monitoring with LLM

The server includes an intelligent topic monitoring system that uses Claude AI to analyze messages and identify relevant content. The monitoring system:

- Periodically checks channels for new messages
- Uses Claude to semantically analyze message content
- Identifies messages related to configured topics
- Sends notifications with relevant messages
- Supports batch processing of messages for efficiency

### Channel Tools
- `mattermost_list_channels`: List public channels in the workspace
- `mattermost_get_channel_history`: Get recent messages from a channel

### Message Tools
- `mattermost_post_message`: Post a new message to a channel
- `mattermost_reply_to_thread`: Reply to a specific message thread
- `mattermost_add_reaction`: Add an emoji reaction to a message
- `mattermost_get_thread_replies`: Get all replies in a thread

### User Tools
- `mattermost_get_users`: Get a list of users in the workspace
- `mattermost_get_user_profile`: Get detailed profile information for a user

## Setup

1. Clone this repository:
```bash
git clone https://github.com/yourusername/mattermost-mcp.git
cd mattermost-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure the server:
   
   The repository includes a `config.json` file with placeholder values. For your actual configuration, create a `config.local.json` file (which is gitignored) with your real credentials:

   ```json
   {
     "mattermostUrl": "https://your-mattermost-instance.com/api/v4",
     "token": "your-personal-access-token",
     "teamId": "your-team-id",
     "monitoring": {
       "enabled": true,
       "schedule": "*/5 * * * *",
       "channels": ["channel-name-1", "channel-name-2"],
       "topics": ["topic1", "topic2"],
       "messageLimit": 50,
       "stateFilePath": "./monitor-state.json",
       "processExistingOnFirstRun": false,
       "firstRunLimit": 10,
       "llm": {
         "provider": "anthropic",
         "apiKey": "your-anthropic-api-key",
         "model": "claude-3-sonnet-20240229",
         "maxTokens": 1000
       }
     }
   }
   ```

   This approach keeps your real credentials out of the repository while maintaining the template for others.

   ### Monitoring Configuration Options

   - `enabled`: Enable or disable the monitoring system
   - `schedule`: Cron expression for when to run the monitoring (e.g., "*/5 * * * *" for every 5 minutes)
   - `channels`: Array of channel names to monitor
   - `topics`: Array of topics to monitor for
   - `messageLimit`: Maximum number of messages to analyze per channel
   - `stateFilePath`: Path to store the monitoring state (this file is gitignored and should not be version controlled)
   - `processExistingOnFirstRun`: Whether to process existing messages on first run
   - `firstRunLimit`: Number of messages to process on first run
   - `llm`: Configuration for the LLM (Claude) integration
     - `provider`: LLM provider (currently only "anthropic" is supported)
     - `apiKey`: Your Anthropic API key
     - `model`: Claude model to use
     - `maxTokens`: Maximum tokens for the LLM response

4. Build the server:
```bash
npm run build
```

5. Run the server:
```bash
npm start
```

## Running the Monitoring System

The monitoring system can be run in several ways:

### Continuous Monitoring

To run the monitoring system continuously according to the schedule in your config:

```bash
./run-monitoring.sh
```

This will start the monitoring process and keep it running in the background, checking for new messages according to the configured schedule.

### One-time Monitoring

To run the monitoring process once and then exit:

```bash
./run-monitoring-now.sh
```

This is useful for testing or for running the monitoring process manually.

### HTTP Server Mode

To run the monitoring system with an HTTP server that exposes the MCP tools:

```bash
./run-monitoring-http.sh
```

This mode allows you to interact with the monitoring system via HTTP requests, in addition to the scheduled monitoring.

## Tool Details

### Channel Tools

#### `mattermost_list_channels`
- List public channels in the workspace
- Optional inputs:
  - `limit` (number, default: 100, max: 200): Maximum number of channels to return
  - `page` (number, default: 0): Page number for pagination
- Returns: List of channels with their IDs and information

#### `mattermost_get_channel_history`
- Get recent messages from a channel
- Required inputs:
  - `channel_id` (string): The ID of the channel
- Optional inputs:
  - `limit` (number, default: 30): Number of messages to retrieve
  - `page` (number, default: 0): Page number for pagination
- Returns: List of messages with their content and metadata

### Message Tools

#### `mattermost_post_message`
- Post a new message to a Mattermost channel
- Required inputs:
  - `channel_id` (string): The ID of the channel to post to
  - `message` (string): The message text to post
- Returns: Message posting confirmation and ID

#### `mattermost_reply_to_thread`
- Reply to a specific message thread
- Required inputs:
  - `channel_id` (string): The channel containing the thread
  - `post_id` (string): ID of the parent message
  - `message` (string): The reply text
- Returns: Reply confirmation and ID

#### `mattermost_add_reaction`
- Add an emoji reaction to a message
- Required inputs:
  - `channel_id` (string): The channel containing the message
  - `post_id` (string): Message ID to react to
  - `emoji_name` (string): Emoji name without colons
- Returns: Reaction confirmation

#### `mattermost_get_thread_replies`
- Get all replies in a message thread
- Required inputs:
  - `channel_id` (string): The channel containing the thread
  - `post_id` (string): ID of the parent message
- Returns: List of replies with their content and metadata

### Monitoring Tools

#### `mattermost_get_monitoring_status`
- Get the current status of the monitoring system
- No inputs required
- Returns: Object with monitoring status information
  - `enabled`: Whether monitoring is enabled
  - `running`: Whether monitoring is currently running

#### `mattermost_run_monitoring`
- Run the monitoring process immediately
- No inputs required
- Returns: Object with monitoring result information
  - `success`: Whether the monitoring process completed successfully
  - `message`: Status message

### User Tools

#### `mattermost_get_users`
- Get list of workspace users with basic profile information
- Optional inputs:
  - `limit` (number, default: 100, max: 200): Maximum users to return
  - `page` (number, default: 0): Page number for pagination
- Returns: List of users with their basic profiles

#### `mattermost_get_user_profile`
- Get detailed profile information for a specific user
- Required inputs:
  - `user_id` (string): The user's ID
- Returns: Detailed user profile information

## Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mattermost": {
      "command": "node",
      "args": [
        "/path/to/mattermost-mcp/build/index.js"
      ]
    }
  }
}
```

## Troubleshooting

If you encounter permission errors, verify that:
1. Your personal access token has the necessary permissions
2. The token is correctly copied to your configuration
3. The Mattermost URL and team ID are correct

## License

This MCP server is licensed under the MIT License.
