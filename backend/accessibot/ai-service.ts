import { secret } from "encore.dev/config";
import { cacheFix, getCachedFix, generateIssueHash } from "./cache";
import { openAIRateLimiter, BatchProcessor, BatchProcessorConfig } from "./rate-limiter";
import { aiProviderManager } from "./ai-providers";
import type { AccessibilityIssue } from "./analyze";

const openAIKey = secret("OpenAIKey");
const anthropicKey = secret("AnthropicKey");
const googleKey = secret("GoogleKey");

interface BatchAIRequest {
  issue: AccessibilityIssue;
  issueHash: string;
}

interface BatchAIResponse {
  issueHash: string;
  fixedCode: string;
  provider?: string;
  cost?: number;
}

const DEMO_FIX = "💡 Demo Suggestion: Add descriptive alt text or labels.";

// Indicates whether the service is running in demo mode (no AI providers configured).
export function isDemoMode(): boolean {
  try {
    const openai = openAIKey();
    const anthropic = anthropicKey();
    const google = googleKey();
    
    return (!openai || openai.trim() === "") && 
           (!anthropic || anthropic.trim() === "") && 
           (!google || google.trim() === "");
  } catch {
    return true;
  }
}

// Enhanced batch processor configuration with dynamic sizing
const batchProcessorConfig: BatchProcessorConfig = {
  initialBatchSize: 3,
  minBatchSize: 1,
  maxBatchSize: 8,
  initialDelayMs: 2000,
  minDelayMs: 1000,
  maxDelayMs: 5000,
  targetResponseTimeMs: 15000, // 15 seconds target
  maxErrorRate: 0.2, // 20% max error rate
  adjustmentInterval: 3, // Adjust every 3 batches
};

// Enhanced batch processor with priority queuing and dynamic sizing
const aiBatchProcessor = new BatchProcessor<BatchAIRequest, BatchAIResponse>(
  batchProcessorConfig,
  processBatchAIRequests
);

export async function getAIFixForIssue(issue: AccessibilityIssue): Promise<string | null> {
  const issueHash = generateIssueHash(issue);

  // Check cache first
  const cachedFix = await getCachedFix(issueHash);
  if (cachedFix) {
    console.log(`Cache hit for issue: ${issue.type}`);
    return cachedFix;
  }

  // Demo mode: return a mock suggestion without calling AI providers
  if (isDemoMode()) {
    console.log("Demo mode active - returning mock AI fix");
    const mock = DEMO_FIX;
    await cacheFix(issueHash, mock);
    return mock;
  }

  // Check if any AI providers are available
  if (!aiProviderManager.hasAvailableProviders()) {
    console.warn("No AI providers available");
    const mock = DEMO_FIX;
    await cacheFix(issueHash, mock);
    return mock;
  }

  // Check rate limit (keeping for backward compatibility)
  const rateLimitResult = await openAIRateLimiter.checkLimit();
  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for AI API. Reset time: ${rateLimitResult.resetTime}`);
    return null;
  }

  console.log(`AI API requests remaining: ${rateLimitResult.remaining}`);

  try {
    // Determine priority and complexity based on severity
    const priority = getPriorityFromSeverity(issue.severity);
    const complexity = getComplexityFromIssue(issue);
    
    // Add to batch processor with priority
    const result = await aiBatchProcessor.add(
      {
        issue,
        issueHash,
      },
      priority
    );

    // Cache the result
    await cacheFix(issueHash, result.fixedCode);

    return result.fixedCode;
  } catch (error) {
    console.error(`Failed to get AI fix for issue ${issue.type}:`, error);
    return null;
  }
}

function getPriorityFromSeverity(severity: AccessibilityIssue["severity"]): number {
  switch (severity) {
    case "high":
      return 10;
    case "medium":
      return 5;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function getComplexityFromIssue(issue: AccessibilityIssue): "simple" | "medium" | "complex" {
  // Simple issues: missing alt text, labels
  if (issue.type.includes("alt") || issue.type.includes("label")) {
    return "simple";
  }
  
  // Complex issues: heading hierarchy, form structure
  if (issue.type.includes("hierarchy") || issue.type.includes("form") || issue.type.includes("structure")) {
    return "complex";
  }
  
  // Everything else is medium complexity
  return "medium";
}

async function processBatchAIRequests(requests: BatchAIRequest[]): Promise<BatchAIResponse[]> {
  if (requests.length === 0) {
    return [];
  }

  // Demo mode: return mock fixes for all requests
  if (isDemoMode()) {
    console.log("Demo mode active - returning mock batch AI fixes");
    return requests.map((r) => ({
      issueHash: r.issueHash,
      fixedCode: DEMO_FIX,
      provider: "Demo",
      cost: 0,
    }));
  }

  if (!aiProviderManager.hasAvailableProviders()) {
    console.log("No AI providers available - returning mock batch AI fixes");
    return requests.map((r) => ({
      issueHash: r.issueHash,
      fixedCode: DEMO_FIX,
      provider: "Demo",
      cost: 0,
    }));
  }

  console.log(`Processing prioritized batch of ${requests.length} AI requests`);
  console.log(
    `Request priorities: ${requests
      .map((r) => `${r.issue.severity}(${getPriorityFromSeverity(r.issue.severity)})`)
      .join(", ")}`
  );

  // Create a combined prompt for all issues in the batch
  const batchPrompt = createBatchPrompt(requests.map((r) => r.issue));
  
  // Estimate tokens and determine complexity
  const estimatedTokens = Math.ceil(batchPrompt.length / 4) + (200 * requests.length); // Input + estimated output
  const maxComplexity = requests.reduce((max, r) => {
    const complexity = getComplexityFromIssue(r.issue);
    if (complexity === "complex") return "complex";
    if (complexity === "medium" && max !== "complex") return "medium";
    return max;
  }, "simple" as "simple" | "medium" | "complex");

  try {
    const result = await aiProviderManager.executeWithFallback(
      "batch",
      batchPrompt,
      200 * requests.length, // Max tokens for output
      maxComplexity
    );

    console.log(`Batch AI request completed with ${result.provider} (cost: $${result.cost.toFixed(6)})`);

    // Parse the batch response
    const fixes = parseBatchResponse(result.text, requests, result.provider, result.cost);

    return fixes;
  } catch (error) {
    console.error("Batch AI request failed:", error);

    // Fall back to individual requests if batch fails
    return await fallbackIndividualRequests(requests);
  }
}

function createBatchPrompt(issues: AccessibilityIssue[]): string {
  // Sort issues by severity for better prompt organization
  const sortedIssues = [...issues].sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 } as const;
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  const prompt = `You are an accessibility expert. I will provide you with ${sortedIssues.length} accessibility issues sorted by severity (high to low). For each issue, provide ONLY the corrected HTML code snippet, no explanations. Format your response as follows:

ISSUE_1:
[corrected HTML for issue 1]

ISSUE_2:
[corrected HTML for issue 2]

And so on...

Here are the issues in order of severity:

${sortedIssues
  .map(
    (issue, index) => `
ISSUE_${index + 1}:
Type: ${issue.type}
Severity: ${issue.severity.toUpperCase()}
Description: ${issue.description}
Current Element: ${issue.element}
`
  )
  .join("\n")}

Provide the corrected HTML for each issue in the format specified above.`;

  return prompt;
}

function parseBatchResponse(
  response: string, 
  requests: BatchAIRequest[], 
  provider: string, 
  totalCost: number
): BatchAIResponse[] {
  const results: BatchAIResponse[] = [];
  const costPerRequest = totalCost / requests.length;

  try {
    // Split response by ISSUE_ markers
    const sections = response.split(/ISSUE_\d+:/).slice(1); // Remove empty first element

    for (let i = 0; i < Math.min(sections.length, requests.length); i++) {
      const fixedCode = sections[i].trim();
      if (fixedCode) {
        results.push({
          issueHash: requests[i].issueHash,
          fixedCode,
          provider,
          cost: costPerRequest,
        });
      } else {
        // Fallback to original code snippet if AI didn't provide a fix
        results.push({
          issueHash: requests[i].issueHash,
          fixedCode: requests[i].issue.codeSnippet,
          provider,
          cost: costPerRequest,
        });
      }
    }

    // Handle remaining requests if response was shorter than expected
    for (let i = sections.length; i < requests.length; i++) {
      results.push({
        issueHash: requests[i].issueHash,
        fixedCode: requests[i].issue.codeSnippet,
        provider,
        cost: costPerRequest,
      });
    }
  } catch (error) {
    console.error("Failed to parse batch response:", error);

    // Fallback to original code snippets
    return requests.map((req) => ({
      issueHash: req.issueHash,
      fixedCode: req.issue.codeSnippet,
      provider,
      cost: costPerRequest,
    }));
  }

  return results;
}

async function fallbackIndividualRequests(requests: BatchAIRequest[]): Promise<BatchAIResponse[]> {
  console.log("Falling back to individual AI requests");

  // Demo mode: return mock fixes quickly
  if (isDemoMode() || !aiProviderManager.hasAvailableProviders()) {
    console.log("Demo mode or no providers - returning mock individual AI fixes");
    return requests.map((r) => ({
      issueHash: r.issueHash,
      fixedCode: DEMO_FIX,
      provider: "Demo",
      cost: 0,
    }));
  }

  const results: BatchAIResponse[] = [];

  // Process in priority order (high severity first)
  const sortedRequests = [...requests].sort((a, b) => {
    return getPriorityFromSeverity(b.issue.severity) - getPriorityFromSeverity(a.issue.severity);
  });

  for (const request of sortedRequests) {
    try {
      // Add delay between individual requests to avoid overwhelming the API
      if (results.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const prompt = `You are an accessibility expert. For the following accessibility issue, provide a specific, improved code snippet that fixes the problem:

Issue Type: ${request.issue.type}
Severity: ${request.issue.severity.toUpperCase()}
Description: ${request.issue.description}
Current Element: ${request.issue.element}

Provide only the corrected HTML code snippet, no explanations.`;

      const complexity = getComplexityFromIssue(request.issue);
      const estimatedTokens = Math.ceil(prompt.length / 4) + 200;

      const result = await aiProviderManager.executeWithFallback(
        "individual",
        prompt,
        200,
        complexity
      );

      results.push({
        issueHash: request.issueHash,
        fixedCode: result.text.trim() || request.issue.codeSnippet,
        provider: result.provider,
        cost: result.cost,
      });
    } catch (error) {
      console.error(`Individual AI request failed for ${request.issue.type}:`, error);
      results.push({
        issueHash: request.issueHash,
        fixedCode: request.issue.codeSnippet,
        provider: "Fallback",
        cost: 0,
      });
    }
  }

  return results;
}

// Enhanced AI fix with better error handling and multi-provider support
export async function enhanceIssuesWithAI(issues: AccessibilityIssue[]): Promise<void> {
  if (issues.length === 0) return;

  console.log(`Enhancing ${issues.length} issues with AI fixes using multi-provider processing`);

  // Demo mode: set mock suggestions and return
  if (isDemoMode()) {
    console.log("Demo mode active - setting mock AI suggestions for all issues");
    for (const issue of issues) {
      issue.codeSnippet = DEMO_FIX;
    }
    return;
  }

  if (!aiProviderManager.hasAvailableProviders()) {
    console.warn("No AI providers configured or available, using demo mode");
    for (const issue of issues) {
      issue.codeSnippet = DEMO_FIX;
    }
    return;
  }

  // Log provider stats
  const providerStats = aiProviderManager.getProviderStats();
  console.log("Available AI providers:", providerStats.filter(p => p.isAvailable).map(p => p.name));

  // Log batch processor stats
  const stats = aiBatchProcessor.getStats();
  const queueSummary = aiBatchProcessor.getQueueSummary();
  console.log("Batch processor stats:", stats);
  console.log("Queue summary by priority:", queueSummary);

  // Sort issues by severity for processing
  const sortedIssues = [...issues].sort((a, b) => {
    return getPriorityFromSeverity(b.severity) - getPriorityFromSeverity(a.severity);
  });

  // Process all issues through the AI service
  const promises = sortedIssues.map(async (issue) => {
    try {
      const aiFixedCode = await getAIFixForIssue(issue);
      if (aiFixedCode && aiFixedCode.trim() !== "") {
        issue.codeSnippet = aiFixedCode;
      }
    } catch (error) {
      console.warn(`Failed to enhance issue ${issue.type} with AI:`, error);
      // Keep the original code snippet as fallback
    }
  });

  // Wait for all AI enhancements to complete
  await Promise.allSettled(promises);

  // Log final stats after processing
  const finalStats = aiBatchProcessor.getStats();
  const finalProviderStats = aiProviderManager.getProviderStats();
  console.log("AI enhancement completed. Final batch processor stats:", finalStats);
  console.log("Final provider stats:", finalProviderStats);
}

// Export batch processor stats for monitoring
export function getBatchProcessorStats() {
  return {
    stats: aiBatchProcessor.getStats(),
    pendingCount: aiBatchProcessor.getPendingCount(),
    queueSummary: aiBatchProcessor.getQueueSummary(),
    providerStats: aiProviderManager.getProviderStats(),
  };
}

// Export provider management functions
export function getProviderStats() {
  return aiProviderManager.getProviderStats();
}

export function resetProviderAvailability() {
  aiProviderManager.resetProviderAvailability();
}

export function refreshProviders() {
  aiProviderManager.refreshProviders();
}
