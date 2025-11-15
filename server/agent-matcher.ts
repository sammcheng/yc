import Anthropic from "@anthropic-ai/sdk";
import type { Agent } from "@shared/schema";
import { anthropicRateLimiter } from "./rate-limiter";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

async function callAnthropicWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Wait if needed to respect rate limits
      await anthropicRateLimiter.waitIfNeeded();
      
      return await apiCall();
    } catch (error: any) {
      // Check if it's a rate limit error (Anthropic SDK error structure)
      const errorMessage = error.message || String(error);
      const isRateLimit = error.status === 429 || 
                         error.statusCode === 429 ||
                         errorMessage.includes('rate_limit') || 
                         errorMessage.includes('429') ||
                         errorMessage.includes('rate limit');
      
      if (isRateLimit) {
        // Calculate retry delay
        const retryAfter = error.headers?.['retry-after'] || 
                         error.response?.headers?.['retry-after']
          ? parseInt(error.headers?.['retry-after'] || error.response?.headers?.['retry-after']) * 1000 
          : Math.min((attempt + 1) * 20 * 1000, 60 * 1000); // Default: 20s, 40s, 60s (max 1 min)
        
        if (attempt < maxRetries - 1) {
          console.log(`[Anthropic] Rate limited. Retrying after ${Math.ceil(retryAfter / 1000)}s... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          continue;
        }
        
        // On final retry failure, throw a clear error
        const retryAfterSeconds = error.headers?.['retry-after'] || error.response?.headers?.['retry-after'] || 60;
        throw new Error(`API rate limit exceeded. Please wait ${retryAfterSeconds} seconds before submitting another task.`);
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw new Error("Failed after multiple retry attempts");
}

function safeParseJSON(text: string, functionName: string): any {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`[${functionName}] No JSON found in response:`, text);
    throw new Error(`${functionName}: No JSON object found in AI response`);
  }
  
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error(`[${functionName}] JSON parse error:`, error.message);
    console.error(`[${functionName}] Raw text:`, text);
    console.error(`[${functionName}] Attempted to parse:`, jsonMatch[0]);
    throw new Error(`${functionName}: Failed to parse JSON - ${error.message}`);
  }
}

export interface AgentMatch {
  agentId: string;
  confidence: number;
  reasoning: string;
}

export async function matchAgentToRequest(
  userRequest: string,
  availableAgents: Agent[],
  priority: 'cost-saver' | 'balanced' | 'max-quality' = 'balanced'
): Promise<AgentMatch> {
  const agentList = availableAgents.map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    capabilities: agent.capabilities,
    pricePerCall: parseFloat(agent.pricePerCall),
    reputationScore: parseFloat(agent.reputationScore),
    jobsCompleted: parseInt(agent.jobsCompleted),
  }));

  // Build priority-specific instructions
  let priorityInstructions = '';
  switch (priority) {
    case 'cost-saver':
      priorityInstructions = 'PRIORITY: Cost optimization. Prefer the cheapest agent that can handle the task, even if slightly less specialized. Minimize cost while maintaining acceptable quality.';
      break;
    case 'max-quality':
      priorityInstructions = 'PRIORITY: Maximum quality. Prefer the most capable and specialized agent, even if more expensive. Prioritize expertise and reputation over cost.';
      break;
    case 'balanced':
    default:
      priorityInstructions = 'PRIORITY: Balanced approach. Find the best balance between cost and quality. Consider both price and agent capabilities/reputation.';
      break;
  }

  const message = await callAnthropicWithRetry(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      system: `You are an AI agent marketplace coordinator. Match user requests to the most suitable agent.

${priorityInstructions}

Analyze the user's request and available agents. Consider:
1. Agent capabilities and how well they match the request
2. Agent reputation and past performance
3. Price vs. quality balance (weighted by user priority)
4. Agent specialization vs. generalization

Return JSON: {
  "agentId": "selected-agent-id",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this agent is the best match"
}

Always return a match with confidence >= 0.5. If no agent is perfect, choose the best available option (usually Quick Assistant for general questions, or the most relevant specialist). Never return confidence < 0.5.`,
      messages: [
        {
          role: "user",
          content: `User Request: ${userRequest}\n\nAvailable Agents:\n${JSON.stringify(agentList, null, 2)}`,
        },
      ],
    })
  );

  const content = message.content[0];
  if (content.type === "text") {
    return safeParseJSON(content.text, "matchAgentToRequest");
  }
  throw new Error("matchAgentToRequest: Non-text response from AI");
}

export async function executeAgentTask(
  agent: Agent,
  userRequest: string
): Promise<any> {
  // If agent has custom API endpoint, call it
  if (agent.apiEndpoint) {
    try {
      const response = await fetch(agent.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(agent.apiKey ? { "Authorization": `Bearer ${agent.apiKey}` } : {}),
        },
        body: JSON.stringify({ request: userRequest }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`[AgentExecution] API call failed:`, error.message);
      throw error;
    }
  }

  // Default: Use Claude AI to execute the task
  const message = await callAnthropicWithRetry(() =>
    anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: `You are "${agent.name}". ${agent.description}

Your capabilities: ${agent.capabilities.join(", ")}

Execute the user's request to the best of your abilities. Return a comprehensive, helpful response.
If the request is outside your capabilities, explain what you can and cannot do.`,
      messages: [
        {
          role: "user",
          content: userRequest,
        },
      ],
    })
  );

  const content = message.content[0];
  if (content.type === "text") {
    return {
      response: content.text,
      agentName: agent.name,
      capabilities: agent.capabilities,
    };
  }
  throw new Error("executeAgentTask: Non-text response from AI");
}
