import { secret } from "encore.dev/config";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { cacheFix, getCachedFix, generateIssueHash } from "./cache";
import { openAIRateLimiter, BatchProcessor } from "./rate-limiter";
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

// Batch processor for AI requests - process up to 5 issues at once with 2 second delay
const aiBatchProcessor = new BatchProcessor<BatchAIRequest, BatchAIResponse>(
  5, // batch size
  2000, // 2 second delay
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

  // Check rate limit
  const rateLimitResult = await openAIRateLimiter.checkLimit();
  if (!rateLimitResult.allowed) {
    console.warn(`Rate limit exceeded for OpenAI API. Reset time: ${rateLimitResult.resetTime}`);
    return null;
  }

  console.log(`OpenAI API requests remaining: ${rateLimitResult.remaining}`);

  try {
    // Add to batch processor
    const result = await aiBatchProcessor.add({
      issue,
      issueHash,
    });
    
    // Cache the result
    await cacheFix(issueHash, result.fixedCode);
    
    return result.fixedCode;
  } catch (error) {
    console.error(`Failed to get AI fix for issue ${issue.type}:`, error);
    return null;
  }
}

async function processBatchAIRequests(requests: BatchAIRequest[]): Promise<BatchAIResponse[]> {
  if (requests.length === 0) {
    return [];
  }

  console.log(`Processing batch of ${requests.length} AI requests`);

  // Create a combined prompt for all issues in the batch
  const batchPrompt = createBatchPrompt(requests.map(r => r.issue));

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
    console.error('Batch AI request failed:', error);
    
    // Fall back to individual requests if batch fails
    return await fallbackIndividualRequests(requests);
  }
}

function createBatchPrompt(issues: AccessibilityIssue[]): string {
  const prompt = `You are an accessibility expert. I will provide you with ${issues.length} accessibility issues. For each issue, provide ONLY the corrected HTML code snippet, no explanations. Format your response as follows:

ISSUE_1:
[corrected HTML for issue 1]

ISSUE_2:
[corrected HTML for issue 2]

And so on...

Here are the issues:

${issues.map((issue, index) => `
ISSUE_${index + 1}:
Type: ${issue.type}
Description: ${issue.description}
Current Element: ${issue.element}
`).join('\n')}

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
    console.error('Failed to parse batch response:', error);
    
    // Fallback to original code snippets
    return requests.map(req => ({
      issueHash: req.issueHash,
      fixedCode: req.issue.codeSnippet,
    }));
  }
  
  return results;
}

async function fallbackIndividualRequests(requests: BatchAIRequest[]): Promise<BatchAIResponse[]> {
  console.log('Falling back to individual AI requests');
  
  const results: BatchAIResponse[] = [];
  
  for (const request of requests) {
    try {
      // Add delay between individual requests to avoid overwhelming the API
      if (results.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const response = await generateText({
        model: openai("gpt-4"),
        prompt: `You are an accessibility expert. For the following accessibility issue, provide a specific, improved code snippet that fixes the problem:

Issue Type: ${request.issue.type}
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

  console.log(`Enhancing ${issues.length} issues with AI fixes`);

  const apiKey = openAIKey();
  if (!apiKey || apiKey.trim() === '') {
    console.warn('OpenAI API key not configured, skipping AI enhancements');
    return;
  }

  // Process all issues through the AI service
  const promises = issues.map(async (issue) => {
    try {
      const aiFixedCode = await getAIFixForIssue(issue);
      if (aiFixedCode && aiFixedCode.trim() !== '') {
        issue.codeSnippet = aiFixedCode;
      }
    } catch (error) {
      console.warn(`Failed to enhance issue ${issue.type} with AI:`, error);
      // Keep the original code snippet as fallback
    }
  });

  // Wait for all AI enhancements to complete
  await Promise.allSettled(promises);

  console.log('AI enhancement completed');
}
