import { api, APIError } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { webhookDB } from "./webhook-processor";

export interface WebhookDeliveryAnalytics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageProcessingTime: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface RepositoryAnalytics {
  repositoryFullName: string;
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  successRate: number;
  averageProcessingTime: number;
  totalIssuesFound: number;
  averageIssuesPerAnalysis: number;
  pullRequestsCreated: number;
  lastAnalysisAt: Date | null;
}

export interface IssueTrendData {
  date: Date;
  totalIssues: number;
  highSeverityIssues: number;
  mediumSeverityIssues: number;
  lowSeverityIssues: number;
  analysesCount: number;
}

export interface AutomatedFixAnalytics {
  totalFixAttempts: number;
  successfulFixes: number;
  failedFixes: number;
  successRate: number;
  averageIssuesPerFix: number;
  fixesByRepository: {
    repositoryFullName: string;
    totalFixes: number;
    successfulFixes: number;
    successRate: number;
  }[];
}

export interface ProcessingTimeAnalytics {
  date: Date;
  averageProcessingTime: number;
  minProcessingTime: number;
  maxProcessingTime: number;
  analysesCount: number;
}

export interface WebhookAnalyticsResponse {
  delivery: WebhookDeliveryAnalytics;
  repositories: RepositoryAnalytics[];
  issueTrends: IssueTrendData[];
  automatedFixes: AutomatedFixAnalytics;
  processingTimes: ProcessingTimeAnalytics[];
}

// Get comprehensive webhook analytics with time range filtering
export const getWebhookAnalytics = api<
  {
    startDate?: Query<string>;
    endDate?: Query<string>;
    repository?: Query<string>;
  },
  WebhookAnalyticsResponse
>(
  { expose: true, method: "GET", path: "/webhook/analytics" },
  async ({ startDate, endDate, repository }) => {
    // Default to last 30 days if no date range provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const start = startDate ? new Date(startDate) : defaultStartDate;
    const end = endDate ? new Date(endDate) : defaultEndDate;
    
    if (start >= end) {
      throw APIError.invalidArgument("Start date must be before end date");
    }

    // Build WHERE conditions
    const conditions: string[] = ["created_at >= $1", "created_at <= $2"];
    const params: any[] = [start, end];
    
    if (repository) {
      conditions.push(`repository_full_name ILIKE $${params.length + 1}`);
      params.push(`%${repository}%`);
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 1. Delivery Analytics
    const deliveryResult = await webhookDB.rawQueryRow<{
      total_deliveries: string;
      successful_deliveries: string;
      failed_deliveries: string;
      avg_processing_time: string;
    }>(
      `SELECT 
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE analysis_status = 'completed') as successful_deliveries,
        COUNT(*) FILTER (WHERE analysis_status = 'failed') as failed_deliveries,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000), 0) as avg_processing_time
      FROM webhook_analyses ${whereClause}`,
      ...params
    );

    const totalDeliveries = parseInt(deliveryResult?.total_deliveries || '0');
    const successfulDeliveries = parseInt(deliveryResult?.successful_deliveries || '0');
    const failedDeliveries = parseInt(deliveryResult?.failed_deliveries || '0');
    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

    const delivery: WebhookDeliveryAnalytics = {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      successRate,
      averageProcessingTime: parseFloat(deliveryResult?.avg_processing_time || '0'),
      timeRange: { start, end },
    };

    // 2. Repository Analytics
    const repositoryResults = await webhookDB.rawQueryAll<{
      repository_full_name: string;
      total_analyses: string;
      successful_analyses: string;
      failed_analyses: string;
      avg_processing_time: string;
      total_issues_found: string;
      avg_issues_per_analysis: string;
      pull_requests_created: string;
      last_analysis_at: Date | null;
    }>(
      `SELECT 
        repository_full_name,
        COUNT(*) as total_analyses,
        COUNT(*) FILTER (WHERE analysis_status = 'completed') as successful_analyses,
        COUNT(*) FILTER (WHERE analysis_status = 'failed') as failed_analyses,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000), 0) as avg_processing_time,
        COALESCE(SUM(issues_found), 0) as total_issues_found,
        COALESCE(AVG(issues_found), 0) as avg_issues_per_analysis,
        COUNT(*) FILTER (WHERE pull_request_created = true) as pull_requests_created,
        MAX(created_at) as last_analysis_at
      FROM webhook_analyses ${whereClause}
      GROUP BY repository_full_name
      ORDER BY total_analyses DESC, last_analysis_at DESC`,
      ...params
    );

    const repositories: RepositoryAnalytics[] = repositoryResults.map(row => ({
      repositoryFullName: row.repository_full_name,
      totalAnalyses: parseInt(row.total_analyses),
      successfulAnalyses: parseInt(row.successful_analyses),
      failedAnalyses: parseInt(row.failed_analyses),
      successRate: parseInt(row.total_analyses) > 0 ? 
        (parseInt(row.successful_analyses) / parseInt(row.total_analyses)) * 100 : 0,
      averageProcessingTime: parseFloat(row.avg_processing_time),
      totalIssuesFound: parseInt(row.total_issues_found),
      averageIssuesPerAnalysis: parseFloat(row.avg_issues_per_analysis),
      pullRequestsCreated: parseInt(row.pull_requests_created),
      lastAnalysisAt: row.last_analysis_at,
    }));

    // 3. Issue Trends (daily aggregation)
    const issueTrendResults = await webhookDB.rawQueryAll<{
      date: Date;
      total_issues: string;
      high_severity_issues: string;
      medium_severity_issues: string;
      low_severity_issues: string;
      analyses_count: string;
    }>(
      `SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(issues_found), 0) as total_issues,
        COALESCE(SUM(high_severity_issues), 0) as high_severity_issues,
        COALESCE(SUM(medium_severity_issues), 0) as medium_severity_issues,
        COALESCE(SUM(low_severity_issues), 0) as low_severity_issues,
        COUNT(*) as analyses_count
      FROM webhook_analyses ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date`,
      ...params
    );

    const issueTrends: IssueTrendData[] = issueTrendResults.map(row => ({
      date: row.date,
      totalIssues: parseInt(row.total_issues),
      highSeverityIssues: parseInt(row.high_severity_issues),
      mediumSeverityIssues: parseInt(row.medium_severity_issues),
      lowSeverityIssues: parseInt(row.low_severity_issues),
      analysesCount: parseInt(row.analyses_count),
    }));

    // 4. Automated Fix Analytics
    const automatedFixResult = await webhookDB.rawQueryRow<{
      total_fix_attempts: string;
      successful_fixes: string;
      failed_fixes: string;
      avg_issues_per_fix: string;
    }>(
      `SELECT 
        COUNT(*) FILTER (WHERE issues_found > 0) as total_fix_attempts,
        COUNT(*) FILTER (WHERE pull_request_created = true) as successful_fixes,
        COUNT(*) FILTER (WHERE issues_found > 0 AND pull_request_created = false) as failed_fixes,
        COALESCE(AVG(issues_found) FILTER (WHERE pull_request_created = true), 0) as avg_issues_per_fix
      FROM webhook_analyses ${whereClause}`,
      ...params
    );

    const totalFixAttempts = parseInt(automatedFixResult?.total_fix_attempts || '0');
    const successfulFixes = parseInt(automatedFixResult?.successful_fixes || '0');
    const failedFixes = parseInt(automatedFixResult?.failed_fixes || '0');
    const fixSuccessRate = totalFixAttempts > 0 ? (successfulFixes / totalFixAttempts) * 100 : 0;

    // Fixes by repository
    const fixesByRepoResults = await webhookDB.rawQueryAll<{
      repository_full_name: string;
      total_fixes: string;
      successful_fixes: string;
    }>(
      `SELECT 
        repository_full_name,
        COUNT(*) FILTER (WHERE issues_found > 0) as total_fixes,
        COUNT(*) FILTER (WHERE pull_request_created = true) as successful_fixes
      FROM webhook_analyses ${whereClause}
      GROUP BY repository_full_name
      HAVING COUNT(*) FILTER (WHERE issues_found > 0) > 0
      ORDER BY successful_fixes DESC`,
      ...params
    );

    const fixesByRepository = fixesByRepoResults.map(row => ({
      repositoryFullName: row.repository_full_name,
      totalFixes: parseInt(row.total_fixes),
      successfulFixes: parseInt(row.successful_fixes),
      successRate: parseInt(row.total_fixes) > 0 ? 
        (parseInt(row.successful_fixes) / parseInt(row.total_fixes)) * 100 : 0,
    }));

    const automatedFixes: AutomatedFixAnalytics = {
      totalFixAttempts,
      successfulFixes,
      failedFixes,
      successRate: fixSuccessRate,
      averageIssuesPerFix: parseFloat(automatedFixResult?.avg_issues_per_fix || '0'),
      fixesByRepository,
    };

    // 5. Processing Time Analytics (daily aggregation)
    const processingTimeResults = await webhookDB.rawQueryAll<{
      date: Date;
      avg_processing_time: string;
      min_processing_time: string;
      max_processing_time: string;
      analyses_count: string;
    }>(
      `SELECT 
        DATE(created_at) as date,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000), 0) as avg_processing_time,
        COALESCE(MIN(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000), 0) as min_processing_time,
        COALESCE(MAX(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000), 0) as max_processing_time,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as analyses_count
      FROM webhook_analyses ${whereClause}
      GROUP BY DATE(created_at)
      HAVING COUNT(*) FILTER (WHERE completed_at IS NOT NULL) > 0
      ORDER BY date`,
      ...params
    );

    const processingTimes: ProcessingTimeAnalytics[] = processingTimeResults.map(row => ({
      date: row.date,
      averageProcessingTime: parseFloat(row.avg_processing_time),
      minProcessingTime: parseFloat(row.min_processing_time),
      maxProcessingTime: parseFloat(row.max_processing_time),
      analysesCount: parseInt(row.analyses_count),
    }));

    return {
      delivery,
      repositories,
      issueTrends,
      automatedFixes,
      processingTimes,
    };
  }
);

export interface WebhookPerformanceMetrics {
  currentHourAnalyses: number;
  last24HoursAnalyses: number;
  currentDaySuccessRate: number;
  averageProcessingTimeToday: number;
  peakHourToday: {
    hour: number;
    analysesCount: number;
  } | null;
  topActiveRepository: {
    repositoryFullName: string;
    analysesCount: number;
  } | null;
}

// Get real-time performance metrics for dashboard overview
export const getWebhookPerformanceMetrics = api<void, WebhookPerformanceMetrics>(
  { expose: true, method: "GET", path: "/webhook/performance" },
  async () => {
    const now = new Date();
    const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Current hour analyses
    const currentHourResult = await webhookDB.queryRow<{ count: string }>`
      SELECT COUNT(*) as count
      FROM webhook_analyses
      WHERE created_at >= ${currentHourStart}
    `;
    const currentHourAnalyses = parseInt(currentHourResult?.count || '0');

    // Last 24 hours analyses
    const last24HoursResult = await webhookDB.queryRow<{ count: string }>`
      SELECT COUNT(*) as count
      FROM webhook_analyses
      WHERE created_at >= ${last24Hours}
    `;
    const last24HoursAnalyses = parseInt(last24HoursResult?.count || '0');

    // Current day success rate
    const todayStatsResult = await webhookDB.queryRow<{
      total: string;
      successful: string;
      avg_processing_time: string;
    }>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE analysis_status = 'completed') as successful,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000), 0) as avg_processing_time
      FROM webhook_analyses
      WHERE created_at >= ${todayStart}
    `;

    const todayTotal = parseInt(todayStatsResult?.total || '0');
    const todaySuccessful = parseInt(todayStatsResult?.successful || '0');
    const currentDaySuccessRate = todayTotal > 0 ? (todaySuccessful / todayTotal) * 100 : 0;
    const averageProcessingTimeToday = parseFloat(todayStatsResult?.avg_processing_time || '0');

    // Peak hour today
    const peakHourResult = await webhookDB.queryRow<{
      hour: number;
      analyses_count: string;
    }>`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as analyses_count
      FROM webhook_analyses
      WHERE created_at >= ${todayStart}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY analyses_count DESC
      LIMIT 1
    `;

    const peakHourToday = peakHourResult ? {
      hour: peakHourResult.hour,
      analysesCount: parseInt(peakHourResult.analyses_count),
    } : null;

    // Top active repository today
    const topRepoResult = await webhookDB.queryRow<{
      repository_full_name: string;
      analyses_count: string;
    }>`
      SELECT 
        repository_full_name,
        COUNT(*) as analyses_count
      FROM webhook_analyses
      WHERE created_at >= ${todayStart}
      GROUP BY repository_full_name
      ORDER BY analyses_count DESC
      LIMIT 1
    `;

    const topActiveRepository = topRepoResult ? {
      repositoryFullName: topRepoResult.repository_full_name,
      analysesCount: parseInt(topRepoResult.analyses_count),
    } : null;

    return {
      currentHourAnalyses,
      last24HoursAnalyses,
      currentDaySuccessRate,
      averageProcessingTimeToday,
      peakHourToday,
      topActiveRepository,
    };
  }
);
