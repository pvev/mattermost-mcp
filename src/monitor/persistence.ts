import * as fs from 'fs';
import * as path from 'path';

// Interface for the state data
export interface MonitorState {
  lastRun: string; // ISO date string
  processedPosts: Record<string, string[]>; // channelId -> array of postIds
}

// Default state
const DEFAULT_STATE: MonitorState = {
  lastRun: new Date().toISOString(),
  processedPosts: {}
};

export class StateManager {
  private stateFilePath: string;
  private state: MonitorState;

  constructor(stateFilePath: string) {
    this.stateFilePath = path.resolve(stateFilePath);
    this.state = this.loadState();
  }

  // Load state from file or create default state
  private loadState(): MonitorState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf8');
        return JSON.parse(data) as MonitorState;
      }
    } catch (error) {
      console.error(`Error loading state from ${this.stateFilePath}:`, error);
    }

    // Return default state if file doesn't exist or there's an error
    return { ...DEFAULT_STATE };
  }

  // Save state to file
  public saveState(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Update last run timestamp
      this.state.lastRun = new Date().toISOString();

      // Write state to file
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving state to ${this.stateFilePath}:`, error);
    }
  }

  // Check if a post has been processed
  public isPostProcessed(channelId: string, postId: string): boolean {
    const channelPosts = this.state.processedPosts[channelId] || [];
    return channelPosts.includes(postId);
  }

  // Mark a post as processed
  public markPostProcessed(channelId: string, postId: string): void {
    if (!this.state.processedPosts[channelId]) {
      this.state.processedPosts[channelId] = [];
    }
    
    if (!this.isPostProcessed(channelId, postId)) {
      this.state.processedPosts[channelId].push(postId);
    }
  }

  // Mark multiple posts as processed
  public markPostsProcessed(channelId: string, postIds: string[]): void {
    for (const postId of postIds) {
      this.markPostProcessed(channelId, postId);
    }
  }

  // Get the last run timestamp
  public getLastRun(): Date {
    return new Date(this.state.lastRun);
  }

  // Get all processed post IDs for a channel
  public getProcessedPostIds(channelId: string): string[] {
    return this.state.processedPosts[channelId] || [];
  }

  // Get all processed posts
  public getAllProcessedPosts(): Record<string, string[]> {
    return { ...this.state.processedPosts };
  }
}
