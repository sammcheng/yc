// Simple rate limiter for Anthropic API calls
// Very conservative: Only 2 requests per minute (3 buffer)
// Each task uses 2 API calls (matching + execution), so we can handle 1 task/min max

class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 2; // Very conservative - only 2/min
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly minDelayBetweenRequests = 30000; // Minimum 30 seconds between ANY requests

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
    
    // Always wait at least 30 seconds since the last request
    if (this.requests.length > 0) {
      const lastRequest = this.requests[this.requests.length - 1];
      const timeSinceLastRequest = now - lastRequest;
      
      if (timeSinceLastRequest < this.minDelayBetweenRequests) {
        const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
        console.log(`[RateLimiter] Waiting ${Math.ceil(waitTime / 1000)}s before next API call...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // If we're at the limit, wait until the oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (Date.now() - oldestRequest) + 2000; // Add 2s buffer
      
      if (waitTime > 0) {
        console.log(`[RateLimiter] At limit. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Clean up again after waiting
        this.requests = this.requests.filter(timestamp => Date.now() - timestamp < this.windowMs);
      }
    }
    
    // Record this request
    this.requests.push(Date.now());
    console.log(`[RateLimiter] Request recorded. Queue: ${this.requests.length}/${this.maxRequests}`);
  }
}

export const anthropicRateLimiter = new RateLimiter();

