import { secret } from "encore.dev/config";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { cacheFix, getCachedFix, generateIssueHash } from "./cache";
import { openAIRateLimiter, BatchProcessor, BatchProcessorConfig } from "./rate-limiter";
import type { AccessibilityIssue } from "./analyze";

const openAIKey = secret("OpenAIKey");
const openai = createOpenAI({ apiKey: openAIKey() });

interface BatchAIRequest {
  issue: AccessibilityIssue;
  issueHash: string;
}

interface BatchAIResponse {
  issueHash: string;
  fixedCode: string;
}

const DEMO_FIX = "💡 Demo Suggestion: Add descriptive alt text or labels.";

// Indicates whether the service is running in demo mode (no OpenAI key configured).
export function isDemoMode(): boolean {
  try {
    const key = openAIKey();
    return !key || key.trim() === "";
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

  // Demo mode: return a mock suggestion without calling OpenAI
  if (isDemoMode()) {
    console.log("Demo mode active - returning mock AI fix");
    const mock = DEMO_FIX;
    await cacheFix(issueHash, mock);
    return mock;
  }

  // Check rate limit
  const rateLimitResult = await openAIRateLimiter.checkLimit();
  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for OpenAI API. Reset time: ${rateLimitResult.resetTime}`);
    return null;
  }

  console.log(`OpenAI API requests remaining: ${rateLimitResult.remaining}`);

  try {
    // Determine priority based on severity
    const priority = getPriorityFromSeverity(issue.severity);
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

  try {
    const response = await generateText({
      model: openai("gpt-4"),
      prompt: batchPrompt,
      maxTokens: 1000 * requests.length, // Scale tokens with batch size
    });

    // Parse the batch response
    const fixes = parseBatchResponse(response.text, requests);

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

function parseBatchResponse(response: string, requests: BatchAIRequest[]): BatchAIResponse[] {
  const results: BatchAIResponse[] = [];

  try {
    // Split response by ISSUE_ markers
    const sections = response.split(/ISSUE_\d+:/).slice(1); // Remove empty first element

    for (let i = 0; i < Math.min(sections.length, requests.length); i++) {
      const fixedCode = sections[i].trim();
      if (fixedCode) {
        results.push({
          issueHash: requests[i].issueHash,
          fixedCode,
        });
      } else {
        // Fallback to original code snippet if AI didn't provide a fix
        results.push({
          issueHash: requests[i].issueHash,
          fixedCode: requests[i].issue.codeSnippet,
        });
      }
    }

    // Handle remaining requests if response was shorter than expected
    for (let i = sections.length; i < requests.length; i++) {
      results.push({
        issueHash: requests[i].issueHash,
        fixedCode: requests[i].issue.codeSnippet,
      });
    }
  } catch (error) {
    console.error("Failed to parse batch response:", error);

    // Fallback to original code snippets
    return requests.map((req) => ({
      issueHash: req.issueHash,
      fixedCode: req.issue.codeSnippet,
    }));
  }

  return results;
}

async function fallbackIndividualRequests(requests: BatchAIRequest[]): Promise<BatchAIResponse[]> {
  console.log("Falling back to individual AI requests");

  // Demo mode: return mock fixes quickly
  if (isDemoMode()) {
    console.log("Demo mode active - returning mock individual AI fixes");
    return requests.map((r) => ({
      issueHash: r.issueHash,
      fixedCode: DEMO_FIX,
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

      const response = await generateText({
        model: openai("gpt-4"),
        prompt: `You are an accessibility expert. For the following accessibility issue, provide a specific, improved code snippet that fixes the problem:

Issue Type: ${request.issue.type}
Severity: ${request.issue.severity.toUpperCase()}
Description: ${request.issue.description}
Current Element: ${request.issue.element}

Provide only the corrected HTML code snippet, no explanations.`,
        maxTokens: 200,
      });

      results.push({
        issueHash: request.issueHash,
        fixedCode: response.text.trim() || request.issue.codeSnippet,
      });
    } catch (error) {
      console.error(`Individual AI request failed for ${request.issue.type}:`, error);
      results.push({
        issueHash: request.issueHash,
        fixedCode: request.issue.codeSnippet,
      });
    }
  }

  return results;
}

// Enhanced AI fix with better error handling and retries
export async function enhanceIssuesWithAI(issues: AccessibilityIssue[]): Promise<void> {
  if (issues.length === 0) return;

  console.log(`Enhancing ${issues.length} issues with AI fixes using priority processing`);

  // Demo mode: set mock suggestions and return
  if (isDemoMode()) {
    console.log("Demo mode active - setting mock AI suggestions for all issues");
    for (const issue of issues) {
      issue.codeSnippet = DEMO_FIX;
    }
    return;
  }

  const apiKey = openAIKey();
  if (!apiKey || apiKey.trim() === "") {
    console.warn("OpenAI API key not configured, skipping AI enhancements");
    return;
  }

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
  console.log("AI enhancement completed. Final batch processor stats:", finalStats);
}

// Export batch processor stats for monitoring
export function getBatchProcessorStats() {
  return {
    stats: aiBatchProcessor.getStats(),
    pendingCount: aiBatchProcessor.getPendingCount(),
    queueSummary: aiBatchProcessor.getQueueSummary(),
  };
}
