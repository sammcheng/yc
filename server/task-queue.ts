// Task queue to handle rate-limited API calls
// Processes tasks sequentially to respect API rate limits

interface QueuedTask {
  jobId: string;
  agentId: string;
  userRequest: string;
  agent: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

class TaskQueue {
  private queue: QueuedTask[] = [];
  private processing = false;
  private lastProcessedTime = 0;
  private readonly minDelayBetweenTasks = 35000; // 35 seconds between tasks (very conservative)

  async enqueue(task: QueuedTask): Promise<void> {
    this.queue.push(task);
    console.log(`[TaskQueue] Task ${task.jobId} queued. Queue length: ${this.queue.length}`);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) break;

      try {
        // Wait if needed to respect rate limits
        const timeSinceLastProcess = Date.now() - this.lastProcessedTime;
        if (timeSinceLastProcess < this.minDelayBetweenTasks) {
          const waitTime = this.minDelayBetweenTasks - timeSinceLastProcess;
          console.log(`[TaskQueue] Waiting ${Math.ceil(waitTime / 1000)}s before processing task ${task.jobId}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        console.log(`[TaskQueue] Processing task ${task.jobId}...`);
        this.lastProcessedTime = Date.now();

        // Import here to avoid circular dependency
        const { executeAgentTask } = await import('./agent-matcher');
        const result = await executeAgentTask(task.agent, task.userRequest);
        
        task.resolve(result);
        console.log(`[TaskQueue] Task ${task.jobId} completed successfully`);
      } catch (error: any) {
        console.error(`[TaskQueue] Task ${task.jobId} failed:`, error.message);
        task.reject(error);
      }
    }

    this.processing = false;
    console.log(`[TaskQueue] Queue processing complete. Remaining: ${this.queue.length}`);
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

export const taskQueue = new TaskQueue();

