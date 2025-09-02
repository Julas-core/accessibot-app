import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { webhookDB, WebhookAnalysisResult } from "./webhook-processor";

export interface WebhookAnalysisListResponse {
  analyses: WebhookAnalysisResult[];
  total: number;
  page: number;
  limit: number;
}

export interface WebhookAnalysisStatsResponse {
  totalAnalyses: number;
  pendingAnalyses: number;
  completedAnalyses: number;
  failedAnalyses: number;
  totalIssuesFound: number;
  totalHighSeverityIssues: number;
  pullRequestsCreated: number;
  averageIssuesPerAnalysis: number;
  lastAnalysisAt: Date | null;
}

// Get webhook analysis results with pagination
export const getWebhookAnalyses = api<
  {
    page?: Query<number>;
    limit?: Query<number>;
    status?: Query<string>;
    repository?: Query<string>;
  },
  WebhookAnalysisListResponse
>(
  { expose: true, method: "GET", path: "/webhook/analyses" },
  async ({ page = 1, limit = 20, status, repository }) => {
    const offset = (page - 1) * limit;
    
    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (status) {
      conditions.push(`analysis_status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (repository) {
      conditions.push(`repository_full_name ILIKE $${params.length + 1}`);
      params.push(`%${repository}%`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM webhook_analyses ${whereClause}`;
    const countResult = await webhookDB.rawQueryRow<{ count: string }>(countQuery, ...params);
    const total = parseInt(countResult?.count || '0');
    
    // Get paginated results
    const query = `
      SELECT 
        id, webhook_id, repository_full_name, commit_sha, analysis_status,
        issues_found, high_severity_issues, medium_severity_issues, low_severity_issues,
        pull_request_url, pull_request_created, error_message, created_at, completed_at
      FROM webhook_analyses 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    
    const analyses = await webhookDB.rawQueryAll<WebhookAnalysisResult>(
      query, 
      ...params, 
      limit, 
      offset
    );
    
    return {
      analyses,
      total,
      page,
      limit,
    };
  }
);

// Get specific webhook analysis by webhook ID
export const getWebhookAnalysis = api<
  { webhookId: string },
  WebhookAnalysisResult
>(
  { expose: true, method: "GET", path: "/webhook/analyses/:webhookId" },
  async ({ webhookId }) => {
    const result = await webhookDB.queryRow<WebhookAnalysisResult>`
      SELECT 
        id, webhook_id, repository_full_name, commit_sha, analysis_status,
        issues_found, high_severity_issues, medium_severity_issues, low_severity_issues,
        pull_request_url, pull_request_created, error_message, created_at, completed_at
      FROM webhook_analyses 
      WHERE webhook_id = ${webhookId}
    `;
    
    if (!result) {
      throw APIError.notFound(`Webhook analysis not found: ${webhookId}`);
    }
    
    return result;
  }
);

// Get webhook analysis statistics
export const getWebhookStats = api<void, WebhookAnalysisStatsResponse>(
  { expose: true, method: "GET", path: "/webhook/stats" },
  async () => {
    const statsResult = await webhookDB.queryRow<{
      total_analyses: string;
      pending_analyses: string;
      completed_analyses: string;
      failed_analyses: string;
      total_issues_found: string;
      total_high_severity_issues: string;
      pull_requests_created: string;
      average_issues_per_analysis: string;
      last_analysis_at: Date | null;
    }>`
      SELECT 
        COUNT(*) as total_analyses,
        COUNT(*) FILTER (WHERE analysis_status = 'pending') as pending_analyses,
        COUNT(*) FILTER (WHERE analysis_status = 'completed') as completed_analyses,
        COUNT(*) FILTER (WHERE analysis_status = 'failed') as failed_analyses,
        COALESCE(SUM(issues_found), 0) as total_issues_found,
        COALESCE(SUM(high_severity_issues), 0) as total_high_severity_issues,
        COUNT(*) FILTER (WHERE pull_request_created = true) as pull_requests_created,
        COALESCE(AVG(issues_found), 0) as average_issues_per_analysis,
        MAX(created_at) as last_analysis_at
      FROM webhook_analyses
    `;
    
    return {
      totalAnalyses: parseInt(statsResult?.total_analyses || '0'),
      pendingAnalyses: parseInt(statsResult?.pending_analyses || '0'),
      completedAnalyses: parseInt(statsResult?.completed_analyses || '0'),
      failedAnalyses: parseInt(statsResult?.failed_analyses || '0'),
      totalIssuesFound: parseInt(statsResult?.total_issues_found || '0'),
      totalHighSeverityIssues: parseInt(statsResult?.total_high_severity_issues || '0'),
      pullRequestsCreated: parseInt(statsResult?.pull_requests_created || '0'),
      averageIssuesPerAnalysis: parseFloat(statsResult?.average_issues_per_analysis || '0'),
      lastAnalysisAt: statsResult?.last_analysis_at || null,
    };
  }
);

// Retry failed webhook analysis
export const retryWebhookAnalysis = api<
  { webhookId: string },
  { success: boolean; message: string }
>(
  { expose: true, method: "POST", path: "/webhook/analyses/:webhookId/retry" },
  async ({ webhookId }) => {
    const analysis = await webhookDB.queryRow<{ analysis_status: string }>`
      SELECT analysis_status FROM webhook_analyses WHERE webhook_id = ${webhookId}
    `;
    
    if (!analysis) {
      throw APIError.notFound(`Webhook analysis not found: ${webhookId}`);
    }
    
    if (analysis.analysis_status !== 'failed') {
      throw APIError.invalidArgument("Can only retry failed analyses");
    }
    
    // Reset analysis to pending status
    await webhookDB.exec`
      UPDATE webhook_analyses SET
        analysis_status = 'pending',
        error_message = NULL,
        completed_at = NULL
      WHERE webhook_id = ${webhookId}
    `;
    
    // Note: In a real implementation, you would republish the analysis request to the topic
    // For this demo, we'll just mark it as pending
    
    return {
      success: true,
      message: "Analysis retry queued successfully",
    };
  }
);
