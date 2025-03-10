import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { MattermostClient } from '../client.js';
import { TopicMonitor } from '../monitor/index.js';

// Global instance of the TopicMonitor
let topicMonitorInstance: TopicMonitor | null = null;

// Set the TopicMonitor instance
export function setTopicMonitorInstance(monitor: TopicMonitor): void {
  topicMonitorInstance = monitor;
}

// Get the TopicMonitor instance
export function getTopicMonitorInstance(): TopicMonitor | null {
  return topicMonitorInstance;
}

// Tool definitions
export const runMonitoringTool: Tool = {
  name: 'mattermost_run_monitoring',
  description: 'Run the Mattermost topic monitoring process immediately',
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const getMonitoringStatusTool: Tool = {
  name: 'mattermost_get_monitoring_status',
  description: 'Get the status of the Mattermost topic monitoring process',
  inputSchema: {
    type: "object",
    properties: {},
  },
};

// Tool handlers
export async function handleRunMonitoring(client: MattermostClient, args: any) {
  if (!topicMonitorInstance) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Monitoring is not enabled or initialized',
          }),
        },
      ],
      isError: true,
    };
  }

  try {
    await topicMonitorInstance.runNow();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Monitoring process completed successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
}

export async function handleGetMonitoringStatus(client: MattermostClient, args: any) {
  const status = {
    enabled: !!topicMonitorInstance,
    running: topicMonitorInstance ? topicMonitorInstance.isRunning() : false,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(status),
      },
    ],
  };
}
