import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import { Topic } from "encore.dev/pubsub";
import crypto from "crypto";
import { secret } from "encore.dev/config";

const webhookSecret = secret("WebhookSecret");

export interface GitHubWebhookCommit {
  id: string;
  message: string;
  url: string;
  added: string[];
  modified: string[];
  removed: string[];
  author: {
    name: string;
    email: string;
  };
}

export interface GitHubWebhookRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
}

export interface GitHubWebhookPusher {
  name: string;
  email: string;
}

export interface GitHubWebhookPayload {
  action?: string;
  repository: GitHubWebhookRepository;
  ref?: string;
  commits?: GitHubWebhookCommit[];
  head_commit?: GitHubWebhookCommit;
  pusher?: GitHubWebhookPusher;
}

export interface GenericWebhookRepository {
  name: string;
  url: string;
  branch?: string;
}

export interface GenericWebhookCommit {
  id: string;
  message: string;
  files: string[];
  author: {
    name: string;
    email: string;
  };
}

export interface GenericWebhookPayload {
  repository: GenericWebhookRepository;
  commits: GenericWebhookCommit[];
}

export interface WebhookHeaders {
  signature: Header<"X-Hub-Signature-256">;
  event: Header<"X-GitHub-Event">;
  delivery: Header<"X-GitHub-Delivery">;
}

export interface AccessibilityAnalysisRequest {
  repositoryId: number;
  repositoryName: string;
  repositoryFullName: string;
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  commitUrl: string;
  changedFiles: string[];
  author: {
    name: string;
    email: string;
  };
  webhookId: string;
  timestamp: Date;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  webhookId: string;
  analysisTriggered: boolean;
  filesAnalyzed: number;
}

// Topic for publishing accessibility analysis requests
export const accessibilityAnalysisTopic = new Topic<AccessibilityAnalysisRequest>("accessibility-analysis", {
  deliveryGuarantee: "at-least-once",
});

// Validates webhook signature for security
function validateGitHubSignature(payload: string, signature: string): boolean {
  try {
    const secret = webhookSecret();
    if (!secret || secret.trim() === "") {
      console.warn("Webhook secret not configured - skipping signature validation");
      return true; // Allow in demo mode
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("hex");
    
    const providedSignature = signature.replace("sha256=", "");
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(providedSignature, "hex")
    );
  } catch (error) {
    console.error("Error validating webhook signature:", error);
    return false;
  }
}

// Filters files that might contain HTML/accessibility content
function getRelevantFiles(files: string[]): string[] {
  const relevantExtensions = ['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.php', '.asp', '.aspx', '.jsp'];
  const relevantPaths = ['templates/', 'views/', 'components/', 'pages/', 'public/'];
  
  return files.filter(file => {
    const lowerFile = file.toLowerCase();
    
    // Check file extensions
    if (relevantExtensions.some(ext => lowerFile.endsWith(ext))) {
      return true;
    }
    
    // Check common paths for web content
    if (relevantPaths.some(path => lowerFile.includes(path))) {
      return true;
    }
    
    return false;
  });
}

// GitHub webhook endpoint for push events
export const githubWebhook = api<GitHubWebhookPayload, WebhookResponse, WebhookHeaders>(
  { expose: true, method: "POST", path: "/webhook/github" },
  async (payload, { signature, event, delivery }) => {
    const webhookId = delivery || `webhook-${Date.now()}`;
    
    console.log(`Received GitHub webhook: ${event} (${webhookId})`);

    // Validate signature for security
    const payloadString = JSON.stringify(payload);
    if (signature && !validateGitHubSignature(payloadString, signature)) {
      console.error(`Invalid webhook signature for delivery ${webhookId}`);
      throw APIError.unauthenticated("Invalid webhook signature");
    }

    // Only process push events to default branch
    if (event !== "push") {
      return {
        success: true,
        message: `Ignored ${event} event - only processing push events`,
        webhookId,
        analysisTriggered: false,
        filesAnalyzed: 0,
      };
    }

    // Validate payload structure
    if (!payload.repository || !payload.ref || !payload.commits) {
      console.error(`Invalid webhook payload structure for delivery ${webhookId}`);
      throw APIError.invalidArgument("Invalid webhook payload structure");
    }

    const defaultBranch = payload.repository.default_branch || "main";
    const pushedBranch = payload.ref.replace("refs/heads/", "");

    // Only analyze pushes to the default branch
    if (pushedBranch !== defaultBranch) {
      return {
        success: true,
        message: `Ignored push to ${pushedBranch} - only analyzing ${defaultBranch} branch`,
        webhookId,
        analysisTriggered: false,
        filesAnalyzed: 0,
      };
    }

    // Collect all changed files from commits
    const allChangedFiles = new Set<string>();
    for (const commit of payload.commits) {
      [...commit.added, ...commit.modified].forEach(file => allChangedFiles.add(file));
    }

    // Filter for files that might contain accessibility content
    const relevantFiles = getRelevantFiles(Array.from(allChangedFiles));

    if (relevantFiles.length === 0) {
      return {
        success: true,
        message: "No relevant files found for accessibility analysis",
        webhookId,
        analysisTriggered: false,
        filesAnalyzed: 0,
      };
    }

    // Use the latest commit for analysis
    const latestCommit = payload.head_commit || payload.commits[payload.commits.length - 1];

    try {
      // Publish analysis request to the topic
      const analysisRequest: AccessibilityAnalysisRequest = {
        repositoryId: payload.repository.id,
        repositoryName: payload.repository.name,
        repositoryFullName: payload.repository.full_name,
        repositoryUrl: payload.repository.html_url,
        branch: pushedBranch,
        commitSha: latestCommit.id,
        commitMessage: latestCommit.message,
        commitUrl: latestCommit.url,
        changedFiles: relevantFiles,
        author: {
          name: latestCommit.author.name,
          email: latestCommit.author.email,
        },
        webhookId,
        timestamp: new Date(),
      };

      await accessibilityAnalysisTopic.publish(analysisRequest);

      console.log(`Published accessibility analysis request for ${payload.repository.full_name} (${webhookId})`);

      return {
        success: true,
        message: `Accessibility analysis triggered for ${relevantFiles.length} files`,
        webhookId,
        analysisTriggered: true,
        filesAnalyzed: relevantFiles.length,
      };
    } catch (error) {
      console.error(`Failed to publish analysis request for ${webhookId}:`, error);
      throw APIError.internal(`Failed to trigger accessibility analysis: ${error}`);
    }
  }
);

// Generic webhook endpoint for other Git providers
export const genericWebhook = api<GenericWebhookPayload, WebhookResponse>(
  { expose: true, method: "POST", path: "/webhook/generic" },
  async (payload) => {
    const webhookId = `generic-${Date.now()}`;
    
    console.log(`Received generic webhook: ${payload.repository.name} (${webhookId})`);

    // Validate payload structure
    if (!payload.repository || !payload.commits || payload.commits.length === 0) {
      throw APIError.invalidArgument("Invalid webhook payload structure");
    }

    // Collect all changed files from commits
    const allChangedFiles = new Set<string>();
    for (const commit of payload.commits) {
      commit.files.forEach(file => allChangedFiles.add(file));
    }

    // Filter for files that might contain accessibility content
    const relevantFiles = getRelevantFiles(Array.from(allChangedFiles));

    if (relevantFiles.length === 0) {
      return {
        success: true,
        message: "No relevant files found for accessibility analysis",
        webhookId,
        analysisTriggered: false,
        filesAnalyzed: 0,
      };
    }

    const latestCommit = payload.commits[payload.commits.length - 1];

    try {
      // Publish analysis request to the topic
      const analysisRequest: AccessibilityAnalysisRequest = {
        repositoryId: 0, // Generic webhook doesn't have repository ID
        repositoryName: payload.repository.name,
        repositoryFullName: payload.repository.name,
        repositoryUrl: payload.repository.url,
        branch: payload.repository.branch || "main",
        commitSha: latestCommit.id,
        commitMessage: latestCommit.message,
        commitUrl: "",
        changedFiles: relevantFiles,
        author: {
          name: latestCommit.author.name,
          email: latestCommit.author.email,
        },
        webhookId,
        timestamp: new Date(),
      };

      await accessibilityAnalysisTopic.publish(analysisRequest);

      console.log(`Published accessibility analysis request for ${payload.repository.name} (${webhookId})`);

      return {
        success: true,
        message: `Accessibility analysis triggered for ${relevantFiles.length} files`,
        webhookId,
        analysisTriggered: true,
        filesAnalyzed: relevantFiles.length,
      };
    } catch (error) {
      console.error(`Failed to publish analysis request for ${webhookId}:`, error);
      throw APIError.internal(`Failed to trigger accessibility analysis: ${error}`);
    }
  }
);
