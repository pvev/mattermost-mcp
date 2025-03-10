import { MattermostClient } from '../client.js';
import { Post, Channel, UserProfile } from '../types.js';
import { StateManager } from './persistence.js';
import { MonitoringConfig, LlmConfig } from '../config.js';
import Anthropic from '@anthropic-ai/sdk';

export interface AnalysisResult {
  channelId: string;
  channelName: string;
  posts: Post[];
  relevantTopics: string[];
}

interface LlmAnalysisResult {
  relevantPosts: Post[];
  relevantTopics: string[];
}

export class MessageAnalyzer {
  private client: MattermostClient;
  private stateManager: StateManager;
  private topics: string[];
  private messageLimit: number;
  private llmConfig?: LlmConfig;

  constructor(
    client: MattermostClient,
    stateManager: StateManager,
    topics: string[],
    messageLimit: number,
    llmConfig?: LlmConfig
  ) {
    this.client = client;
    this.stateManager = stateManager;
    this.topics = topics;
    this.messageLimit = messageLimit;
    this.llmConfig = llmConfig;
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
      const unprocessedPosts = Object.values(postsResponse.posts).filter(post => 
        !processedPostIds.includes(post.id)
      );
      
      if (unprocessedPosts.length === 0) {
        console.error(`No new posts to analyze in channel: ${channelName}`);
        return null;
      }
      
      // Enrich posts with user information
      const enrichedPosts = await this.enrichPostsWithUserInfo(unprocessedPosts);
      
      // Analyze all posts in a batch
      const analysisResult = await this.analyzePostsWithLLM(
        enrichedPosts,
        this.topics,
        channelName
      );
      
      // Mark all posts as processed regardless of relevance
      for (const post of unprocessedPosts) {
        this.stateManager.markPostProcessed(channel.id, post.id);
      }
      
      // Save state after processing
      this.stateManager.saveState();
      
      if (analysisResult.relevantPosts.length === 0) {
        console.error(`No relevant posts found in channel: ${channelName}`);
        return null;
      }
      
      return {
        channelId: channel.id,
        channelName: channel.name,
        posts: analysisResult.relevantPosts,
        relevantTopics: analysisResult.relevantTopics
      };
    } catch (error) {
      console.error(`Error analyzing channel ${channelName}:`, error);
      return null;
    }
  }

  // Enrich posts with user information
  private async enrichPostsWithUserInfo(posts: Post[]): Promise<Post[]> {
    const userCache: Record<string, UserProfile> = {};
    
    // Create a copy of the posts to avoid modifying the originals
    const enrichedPosts = [...posts];
    
    for (const post of enrichedPosts) {
      try {
        if (!userCache[post.user_id]) {
          const userProfile = await this.client.getUserProfile(post.user_id);
          userCache[post.user_id] = userProfile;
        }
        
        // Add user info to the post
        (post as any).user_info = {
          username: userCache[post.user_id].username,
          first_name: userCache[post.user_id].first_name,
          last_name: userCache[post.user_id].last_name
        };
      } catch (error) {
        console.error(`Error fetching user info for user ${post.user_id}:`, error);
        // Continue without user info
      }
    }
    
    return enrichedPosts;
  }

  // Analyze posts with LLM
  private async analyzePostsWithLLM(
    posts: Post[],
    topics: string[],
    channelName: string
  ): Promise<LlmAnalysisResult> {
    // If LLM config is not provided or if there are no posts, use fallback
    if (!this.llmConfig || posts.length === 0) {
      console.error('No LLM config provided or no posts to analyze, using fallback analysis');
      return this.fallbackAnalysis(posts, topics);
    }
    
    try {
      // Format posts with metadata for the prompt
      const formattedPosts = posts.map(post => {
        const timestamp = new Date(post.create_at).toISOString();
        const userInfo = (post as any).user_info;
        const username = userInfo ? userInfo.username : post.user_id;
        
        return `[ID: ${post.id}] [${timestamp}] ${username}: "${post.message}"`;
      }).join('\n\n');
      
      // Create Anthropic client
      const anthropic = new Anthropic({
        apiKey: this.llmConfig.apiKey
      });
      
      const prompt = `
You are analyzing messages from a Mattermost channel named "${channelName}".

Your task is to determine which messages are related to any of these topics: ${topics.join(', ')}

Here are the messages:
${formattedPosts}

For each topic, list the IDs of messages that are relevant to that topic.
Format your response as JSON:
{
  "topics": {
    "topic1": ["post_id1", "post_id2"],
    "topic2": ["post_id3"]
  }
}

Only include topics that have at least one relevant message.
If no messages are relevant to any topic, return {"topics": {}}.

Be semantic in your analysis. For example, if the topic is "table tennis" and a message mentions "ping pong equipment" or "butterfly rackets", it should be considered relevant.
`;
      
      console.error('Sending request to Anthropic API...');
      
      const response = await anthropic.messages.create({
        model: this.llmConfig.model,
        max_tokens: this.llmConfig.maxTokens,
        messages: [{ role: "user", content: prompt }]
      });
      
      console.error('Received response from Anthropic API');
      
      // Parse the JSON response
      const contentBlock = response.content[0];
      const content = 'text' in contentBlock ? contentBlock.text : JSON.stringify(contentBlock);
      
      // Try to extract JSON from the response
      let jsonStr = content;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/{[\s\S]*?}/);
                        
      if (jsonMatch) {
        jsonStr = jsonMatch[0].replace(/```json\n/, '').replace(/\n```/, '');
      }
      
      console.error('Extracted JSON:', jsonStr);
      
      let result;
      // Don't try to parse the JSON, just extract the information directly
      console.error('Manually extracting information from response');
      
      // Initialize result structure with proper typing
      result = { topics: {} as Record<string, string[]> };
      
      // Extract all post IDs from the content
      const allPostIds = Array.from(content.matchAll(/"([a-z0-9]{26})"/g)).map(m => m[1]);
      console.error('Found post IDs in response:', allPostIds);
      
      // Try to extract topic-specific post IDs
      for (const topic of topics) {
        const topicRegex = new RegExp(`"${topic}"\\s*:\\s*\\[(.*?)\\]`, 'i');
        const topicMatch = content.match(topicRegex);
        
        if (topicMatch && topicMatch[1]) {
          const topicPostIds = Array.from(topicMatch[1].matchAll(/"([a-z0-9]{26})"/g)).map(m => m[1]);
          
          if (topicPostIds.length > 0) {
            result.topics[topic] = topicPostIds;
            
            // Add topic to each post for later reference
            for (const post of posts) {
              if (topicPostIds.includes(post.id)) {
                if (!(post as any).relevantTopics) {
                  (post as any).relevantTopics = [];
                }
                (post as any).relevantTopics.push(topic);
              }
            }
          }
        }
      }
      
      // Fallback: if no topic-specific matches, use all post IDs for all topics
      if (Object.keys(result.topics).length === 0 && allPostIds.length > 0) {
        for (const post of posts) {
          if (allPostIds.includes(post.id)) {
            // For simplicity, assume all found posts are relevant to all topics
            for (const topic of topics) {
              if (!result.topics[topic]) {
                result.topics[topic] = [];
              }
              result.topics[topic].push(post.id);
              
              // Add topic to post
              if (!(post as any).relevantTopics) {
                (post as any).relevantTopics = [];
              }
              if (!(post as any).relevantTopics.includes(topic)) {
                (post as any).relevantTopics.push(topic);
              }
            }
          }
        }
      }
      
      console.error('Manually extracted result:', JSON.stringify(result));
      
      // Extract relevant posts and topics
      const relevantPostIds = new Set<string>();
      const relevantTopics = new Set<string>();
      
      if (result.topics) {
        for (const [topic, postIds] of Object.entries(result.topics)) {
          if (Array.isArray(postIds) && postIds.length > 0) {
            relevantTopics.add(topic);
            postIds.forEach(id => relevantPostIds.add(id));
          }
        }
      }
      
      const relevantPosts = posts.filter(post => relevantPostIds.has(post.id));
      
      console.error(`Found ${relevantPosts.length} relevant posts for topics: ${Array.from(relevantTopics).join(', ')}`);
      
      return {
        relevantPosts,
        relevantTopics: Array.from(relevantTopics)
      };
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      
      // Fallback to simple keyword matching
      console.error('Falling back to simple keyword matching');
      return this.fallbackAnalysis(posts, topics);
    }
  }

  // Fallback analysis using simple keyword matching
  private fallbackAnalysis(
    posts: Post[],
    topics: string[]
  ): LlmAnalysisResult {
    console.error('Using fallback analysis with simple keyword matching');
    
    const relevantPosts: Post[] = [];
    const relevantTopics = new Set<string>();
    
    for (const post of posts) {
      const message = post.message.toLowerCase();
      
      for (const topic of topics) {
        if (message.includes(topic.toLowerCase())) {
          relevantPosts.push(post);
          relevantTopics.add(topic);
          break;
        }
      }
    }
    
    return {
      relevantPosts,
      relevantTopics: Array.from(relevantTopics)
    };
  }
}
