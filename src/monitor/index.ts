import { MattermostClient } from '../client.js';
import { MonitoringConfig } from '../config.js';
import { StateManager } from './persistence.js';
import { MessageAnalyzer, AnalysisResult } from './analyzer.js';
import { MonitoringScheduler } from './scheduler.js';

export class TopicMonitor {
  private client: MattermostClient;
  private config: MonitoringConfig;
  private stateManager: StateManager;
  private analyzer: MessageAnalyzer;
  private scheduler: MonitoringScheduler;
  private sysadminUserId: string | null = null;
  private dmChannelId: string | null = null;

  constructor(client: MattermostClient, config: MonitoringConfig) {
    this.client = client;
    this.config = config;
    this.stateManager = new StateManager(config.stateFilePath);
    this.analyzer = new MessageAnalyzer(
      client,
      this.stateManager,
      config.topics,
      config.messageLimit
    );
    this.scheduler = new MonitoringScheduler(
      config.schedule,
      this.runMonitoring.bind(this)
    );
  }

  // Start the monitoring process
  public async start(): Promise<boolean> {
    try {
      // Find the sysadmin user for notifications
      await this.findSysadminUser();
      
      // Create a DM channel with the sysadmin user
      await this.createDmChannel();
      
      // Start the scheduler
      return this.scheduler.start();
    } catch (error) {
      console.error('Error starting topic monitor:', error);
      return false;
    }
  }

  // Stop the monitoring process
  public stop(): boolean {
    return this.scheduler.stop();
  }

  // Run the monitoring process immediately
  public async runNow(): Promise<void> {
    await this.scheduler.runNow();
  }

  // Check if the monitoring process is running
  public isRunning(): boolean {
    return this.scheduler.isTaskRunning();
  }

  // Find a suitable user for notifications
  private async findSysadminUser(): Promise<void> {
    try {
      const usersResponse = await this.client.getUsers();
      
      // Handle both array and object responses
      const users = Array.isArray(usersResponse) 
        ? usersResponse 
        : (usersResponse.users || []);
      
      if (!users || !Array.isArray(users) || users.length === 0) {
        console.error('No users found in response:', usersResponse);
        throw new Error('No users found in Mattermost');
      }
      
      // First try to find a user with admin privileges
      let targetUser = users.find(user => 
        user.roles && user.roles.includes('system_admin')
      );
      
      // If no admin user found, try to find a regular user
      if (!targetUser) {
        targetUser = users.find(user => 
          user.roles && !user.is_bot && user.roles.includes('system_user')
        );
      }
      
      // If still no user found, use the first non-bot user
      if (!targetUser) {
        targetUser = users.find(user => !user.is_bot);
      }
      
      // If still no user found, use the first user
      if (!targetUser && users.length > 0) {
        targetUser = users[0];
      }
      
      if (targetUser) {
        this.sysadminUserId = targetUser.id;
        console.error(`Found user for notifications: ${targetUser.username} (${targetUser.id})`);
      } else {
        throw new Error('No suitable user found for notifications');
      }
    } catch (error) {
      console.error('Error finding sysadmin user:', error);
      throw error;
    }
  }

  // Create or find a DM channel with the target user
  private async createDmChannel(): Promise<void> {
    if (!this.sysadminUserId) {
      throw new Error('No target user found for notifications');
    }
    
    try {
      // Get the bot's own user ID
      const me = await this.client.getMe();
      console.error(`MCP server running as user: ${me.username} (${me.id})`);
      
      // Get all channels
      const channelsResponse = await this.client.getChannels();
      
      // Handle both array and object responses
      let channels = Array.isArray(channelsResponse) 
        ? channelsResponse 
        : (channelsResponse.channels || []);
      
      if (!channels || !Array.isArray(channels)) {
        console.error('Invalid channels response:', channelsResponse);
        channels = [];
      }
      
      // Look for an existing DM channel with the target user
      const dmChannel = channels.find(channel => 
        channel.type === 'D' && 
        channel.name.includes(this.sysadminUserId!) && 
        channel.name.includes(me.id)
      );
      
      if (dmChannel) {
        this.dmChannelId = dmChannel.id;
        console.error(`Found existing DM channel: ${dmChannel.id}`);
        return;
      }
      
      // Create a new DM channel with the target user
      console.error(`Creating new DM channel between ${me.username} and target user...`);
      try {
        const newDmChannel = await this.client.createDirectChannel(me.id, this.sysadminUserId);
        this.dmChannelId = newDmChannel.id;
        console.error(`Created new DM channel: ${newDmChannel.id}`);
        return;
      } catch (error) {
        console.error('Error creating DM channel:', error);
      }
      
      // If DM channel creation fails, fall back to town-square
      console.error('Falling back to public channel for notifications...');
      
      // Try to find town-square channel (exists in most Mattermost instances)
      let fallbackChannel = channels.find(channel => 
        channel.name === 'town-square'
      );
      
      // If town-square not found, use the first public channel
      if (!fallbackChannel) {
        fallbackChannel = channels.find(channel => 
          channel.type === 'O' // Open/public channel
        );
      }
      
      // If still no channel found, use the first channel
      if (!fallbackChannel && channels.length > 0) {
        fallbackChannel = channels[0];
      }
      
      if (fallbackChannel) {
        this.dmChannelId = fallbackChannel.id;
        console.error(`Using fallback channel for notifications: ${fallbackChannel.name} (${fallbackChannel.id})`);
        return;
      }
      
      throw new Error('No suitable channel found for notifications');
    } catch (error) {
      console.error('Error creating DM channel:', error);
      throw error;
    }
  }

  // Run the monitoring process
  private async runMonitoring(): Promise<void> {
    try {
      const results: AnalysisResult[] = [];
      const isFirstRun = !this.stateManager.getLastRun();
      
      // Analyze each channel
      for (const channelName of this.config.channels) {
        const result = await this.analyzer.analyzeChannel(
          channelName,
          isFirstRun,
          this.config.firstRunLimit
        );
        
        if (result) {
          results.push(result);
        }
      }
      
      // Send notifications for relevant results
      for (const result of results) {
        await this.sendNotification(result);
      }
    } catch (error) {
      console.error('Error running monitoring:', error);
    }
  }

  // Send a notification for relevant messages
  private async sendNotification(result: AnalysisResult): Promise<void> {
    if (!this.dmChannelId) {
      console.error('No channel found for notifications');
      return;
    }
    
    if (!this.sysadminUserId) {
      console.error('No target user found for notifications');
      return;
    }
    
    try {
      const { channelName, posts, relevantTopics } = result;
      
      // Get user info to include in the notification
      let username = 'user';
      try {
        const userProfile = await this.client.getUserProfile(this.sysadminUserId);
        username = userProfile.username || 'user';
      } catch (error) {
        console.error('Error getting user profile:', error);
      }
      
      // Create a notification message
      let message = `@${username} **Topic Monitor Alert**\n\n`;
      message += `Found ${posts.length} relevant posts in channel: **${channelName}**\n`;
      message += `Topics: ${relevantTopics.join(', ')}\n\n`;
      
      // Add post details
      message += `**Recent Messages:**\n`;
      for (const post of posts.slice(0, 5)) { // Limit to 5 posts
        // Try to get the username of the post author
        let postAuthor = post.user_id;
        try {
          const authorProfile = await this.client.getUserProfile(post.user_id);
          postAuthor = authorProfile.username || post.user_id;
        } catch (error) {
          // Ignore errors and use the user ID
        }
        
        const timestamp = new Date(post.create_at).toLocaleString();
        message += `- ${timestamp} (${postAuthor}): "${post.message}"\n`;
      }
      
      if (posts.length > 5) {
        message += `... and ${posts.length - 5} more\n`;
      }
      
      // Send the notification
      await this.client.createPost(this.dmChannelId, message);
      console.error(`Sent notification for channel: ${channelName}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}
