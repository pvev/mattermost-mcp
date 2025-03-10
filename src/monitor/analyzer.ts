import { MattermostClient } from '../client.js';
import { Post, Channel } from '../types.js';
import { StateManager } from './persistence.js';

export interface AnalysisResult {
  channelId: string;
  channelName: string;
  posts: Post[];
  relevantTopics: string[];
}

export class MessageAnalyzer {
  private client: MattermostClient;
  private stateManager: StateManager;
  private topics: string[];
  private messageLimit: number;

  constructor(
    client: MattermostClient,
    stateManager: StateManager,
    topics: string[],
    messageLimit: number
  ) {
    this.client = client;
    this.stateManager = stateManager;
    this.topics = topics;
    this.messageLimit = messageLimit;
  }

  // Analyze messages in a channel for relevant topics
  public async analyzeChannel(
    channelName: string,
    firstRun: boolean = false,
    firstRunLimit?: number
  ): Promise<AnalysisResult | null> {
    try {
      console.error(`Analyzing channel: ${channelName}`);
      
      // Get all channels
      const channelsResponse = await this.client.getChannels();
      
      // Handle both array and object responses
      const channels = Array.isArray(channelsResponse) 
        ? channelsResponse 
        : (channelsResponse.channels || []);
      
      if (!channels || !Array.isArray(channels) || channels.length === 0) {
        console.error('No channels found in response:', channelsResponse);
        return null;
      }
      
      const channel = channels.find(c => c.name === channelName);
      
      if (!channel) {
        console.error(`Channel not found: ${channelName}`);
        return null;
      }
      
      // Get posts for the channel
      const limit = firstRun && firstRunLimit ? firstRunLimit : this.messageLimit;
      const postsResponse = await this.client.getPostsForChannel(channel.id, limit);
      
      // Filter out already processed posts
      const processedPostIds = this.stateManager.getProcessedPostIds(channel.id);
      const posts = Object.values(postsResponse.posts).filter(post => 
        !processedPostIds.includes(post.id)
      );
      
      if (posts.length === 0) {
        console.error(`No new posts to analyze in channel: ${channelName}`);
        return null;
      }
      
      // Analyze posts for relevant topics
      const relevantPosts: Post[] = [];
      const relevantTopics: Set<string> = new Set();
      
      for (const post of posts) {
        const matchedTopics = this.findRelevantTopics(post.message);
        
        if (matchedTopics.length > 0) {
          relevantPosts.push(post);
          matchedTopics.forEach(topic => relevantTopics.add(topic));
        }
        
        // Mark post as processed regardless of relevance
        this.stateManager.markPostProcessed(channel.id, post.id);
      }
      
      // Save state after processing
      this.stateManager.saveState();
      
      if (relevantPosts.length === 0) {
        console.error(`No relevant posts found in channel: ${channelName}`);
        return null;
      }
      
      return {
        channelId: channel.id,
        channelName: channel.name,
        posts: relevantPosts,
        relevantTopics: Array.from(relevantTopics)
      };
    } catch (error) {
      console.error(`Error analyzing channel ${channelName}:`, error);
      return null;
    }
  }

  // Find relevant topics in a message
  private findRelevantTopics(message: string): string[] {
    // Use the more sophisticated LLM-like analysis
    return this.analyzeWithLLM(message, this.topics);
  }

  // More sophisticated LLM-like analysis
  private analyzeWithLLM(message: string, topics: string[]): string[] {
    const lowerMessage = message.toLowerCase();
    const matchedTopics: string[] = [];
    
    // Dictionary of topic-related terms
    const topicDictionary: Record<string, string[]> = {
      'table tennis': [
        'ping pong', 'paddle', 'racket', 'ball', 'net', 'table', 
        'butterfly', 'stiga', 'donic', 'yasaka', 'tibhar', 'joola',
        'rubbers', 'blade', 'backhand', 'forehand', 'spin', 'serve',
        'timo boll', 'ma long', 'zhang jike', 'wang liqin', 'liu shiwen',
        'dignics', 'tenergy', 'tournament', 'championship', 'ittf'
      ],
      // Add more topics and related terms as needed
    };
    
    // Check each topic
    for (const topic of topics) {
      // Direct match
      if (lowerMessage.includes(topic.toLowerCase())) {
        matchedTopics.push(topic);
        continue;
      }
      
      // Check related terms
      const relatedTerms = topicDictionary[topic.toLowerCase()] || [];
      for (const term of relatedTerms) {
        if (lowerMessage.includes(term.toLowerCase())) {
          matchedTopics.push(topic);
          break; // Found a match for this topic, move to next topic
        }
      }
      
      // Semantic analysis (simplified)
      // In a real implementation, this would use an actual LLM API
      // Here we're doing some basic contextual analysis
      if (topic.toLowerCase() === 'table tennis') {
        // Check for equipment discussions
        if (
          (lowerMessage.includes('rubber') || lowerMessage.includes('blade')) &&
          (lowerMessage.includes('butterfly') || lowerMessage.includes('stiga') || 
           lowerMessage.includes('donic') || lowerMessage.includes('yasaka') ||
           lowerMessage.includes('tibhar') || lowerMessage.includes('joola'))
        ) {
          matchedTopics.push(topic);
        }
        
        // Check for player discussions
        if (
          lowerMessage.includes('player') || 
          lowerMessage.includes('championship') ||
          lowerMessage.includes('tournament') ||
          lowerMessage.includes('match') ||
          lowerMessage.includes('game')
        ) {
          matchedTopics.push(topic);
        }
      }
    }
    
    // Remove duplicates
    return [...new Set(matchedTopics)];
  }
}
