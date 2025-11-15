// Queue for agent matching to handle rate limits
// Processes matching requests sequentially

interface QueuedMatching {
  request: string;
  availableAgents: any[];
  priority: 'cost-saver' | 'balanced' | 'max-quality';
  resolve: (match: any) => void;
  reject: (error: any) => void;
}

class MatchingQueue {
  private queue: QueuedMatching[] = [];
  private processing = false;
  private lastProcessedTime = 0;
  private readonly minDelayBetweenMatches = 45000; // 45 seconds between matches

  async enqueue(matching: QueuedMatching): Promise<void> {
    this.queue.push(matching);
    console.log(`[MatchingQueue] Matching request queued. Queue length: ${this.queue.length}`);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const matching = this.queue.shift();
      if (!matching) break;

      try {
        // Wait if needed to respect rate limits
        const timeSinceLastProcess = Date.now() - this.lastProcessedTime;
        if (timeSinceLastProcess < this.minDelayBetweenMatches) {
          const waitTime = this.minDelayBetweenMatches - timeSinceLastProcess;
          console.log(`[MatchingQueue] Waiting ${Math.ceil(waitTime / 1000)}s before matching...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        console.log(`[MatchingQueue] Processing matching request...`);
        this.lastProcessedTime = Date.now();

        // Import here to avoid circular dependency
        const { matchAgentToRequest } = await import('./agent-matcher');
        const match = await matchAgentToRequest(matching.request, matching.availableAgents, matching.priority);
        
        matching.resolve(match);
        console.log(`[MatchingQueue] Matching completed successfully`);
      } catch (error: any) {
        console.error(`[MatchingQueue] Matching failed:`, error.message);
        
        // Always use fallback instead of rejecting - never fail
        console.log(`[MatchingQueue] Using fallback agent due to error`);
        const cheapestAgent = matching.availableAgents.sort((a, b) => 
          parseFloat(a.pricePerCall) - parseFloat(b.pricePerCall)
        )[0];
        
        matching.resolve({
          agentId: cheapestAgent.id,
          confidence: 0.8,
          reasoning: error.message?.includes('rate limit') 
            ? `Rate limit reached. Assigned to ${cheapestAgent.name} as fallback.`
            : `Matching error occurred. Assigned to ${cheapestAgent.name} as fallback.`,
        });
      }
    }

    this.processing = false;
    console.log(`[MatchingQueue] Queue processing complete. Remaining: ${this.queue.length}`);
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const matchingQueue = new MatchingQueue();

