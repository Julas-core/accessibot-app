import React, { useState } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  Webhook, 
  GitBranch, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  RefreshCw,
  ExternalLink,
  Info,
  BarChart3,
  GitCommit,
  BookOpen,
  Activity
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import backend from '~backend/client';
import type { WebhookAnalysisResult } from '~backend/accessibot/webhook-status';
import { WebhookAnalyticsDashboard } from './WebhookAnalyticsDashboard';
import { GlowCard } from './GlowCard';

export function WebhookStatus() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'setup'>('overview');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [repository, setRepository] = useState<string>('');
  const { toast } = useToast();

  const statsQuery = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: async () => {
      return await backend.accessibot.getWebhookStats();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const analysesQuery = useQuery({
    queryKey: ['webhook-analyses', page, status, repository],
    queryFn: async () => {
      return await backend.accessibot.getWebhookAnalyses({
        page,
        limit: 10,
        status: status || undefined,
        repository: repository || undefined,
      });
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const docsQuery = useQuery({
    queryKey: ['webhook-docs'],
    queryFn: async () => {
      return await backend.accessibot.getWebhookDocs();
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      return await backend.accessibot.retryWebhookAnalysis({ webhookId });
    },
    onSuccess: (data, webhookId) => {
      toast({
        title: "Retry Queued",
        description: `Analysis retry queued for webhook ${webhookId}`,
      });
      analysesQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Retry Failed",
        description: error.message || "Failed to retry analysis",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (analysisStatus: string) => {
    switch (analysisStatus) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (analysisStatus: string) => {
    switch (analysisStatus) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const handleSearch = () => {
    setPage(1);
    analysesQuery.refetch();
  };

  const handleRetry = (webhookId: string) => {
    retryMutation.mutate(webhookId);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Overview */}
          <GlowCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Webhook Analysis Statistics
              </CardTitle>
              <CardDescription>
                Overview of automated accessibility analysis triggered by code changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsQuery.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {statsQuery.data.totalAnalyses}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Analyses</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {statsQuery.data.pendingAnalyses}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {statsQuery.data.completedAnalyses}
                    </div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {statsQuery.data.failedAnalyses}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {statsQuery.data.totalIssuesFound}
                    </div>
                    <div className="text-xs text-muted-foreground">Issues Found</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {statsQuery.data.totalHighSeverityIssues}
                    </div>
                    <div className="text-xs text-muted-foreground">High Severity</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {statsQuery.data.pullRequestsCreated}
                    </div>
                    <div className="text-xs text-muted-foreground">PRs Created</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-600">
                      {statsQuery.data.averageIssuesPerAnalysis.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Issues</div>
                  </div>
                </div>
              )}

              {statsQuery.data?.lastAnalysisAt && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Last analysis: {formatDate(statsQuery.data.lastAnalysisAt)}
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => statsQuery.refetch()}
                  disabled={statsQuery.isRefetching}
                >
                  {statsQuery.isRefetching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardContent>
          </GlowCard>

          {/* Analysis Results */}
          <GlowCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5" />
                Recent Webhook Analyses
              </CardTitle>
              <CardDescription>
                Automatic accessibility analyses triggered by repository webhooks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    placeholder="Filter by repository..."
                    value={repository}
                    onChange={(e) => setRepository(e.target.value)}
                    className="w-60"
                  />
                  <Button variant="outline" size="icon" onClick={handleSearch}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => analysesQuery.refetch()}
                  disabled={analysesQuery.isRefetching}
                  className="ml-auto"
                >
                  {analysesQuery.isRefetching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>

              {/* Results List */}
              {analysesQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading analyses...
                </div>
              ) : analysesQuery.data && analysesQuery.data.analyses.length > 0 ? (
                <div className="space-y-4">
                  {analysesQuery.data.analyses.map((analysis: WebhookAnalysisResult) => (
                    <div key={analysis.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(analysis.analysisStatus)}
                          <div>
                            <div className="font-medium">{analysis.repositoryFullName}</div>
                            <div className="text-sm text-muted-foreground">
                              Commit: {analysis.commitSha.substring(0, 7)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(analysis.analysisStatus)}>
                            {analysis.analysisStatus}
                          </Badge>
                          {analysis.analysisStatus === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(analysis.webhookId)}
                              disabled={retryMutation.isPending}
                            >
                              {retryMutation.isPending ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3 mr-1" />
                              )}
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>

                      {analysis.analysisStatus === 'completed' && (
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium text-blue-600">{analysis.issuesFound}</div>
                            <div className="text-muted-foreground">Total Issues</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-red-600">{analysis.highSeverityIssues}</div>
                            <div className="text-muted-foreground">High Severity</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-yellow-600">{analysis.mediumSeverityIssues}</div>
                            <div className="text-muted-foreground">Medium Severity</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium text-green-600">{analysis.lowSeverityIssues}</div>
                            <div className="text-muted-foreground">Low Severity</div>
                          </div>
                        </div>
                      )}

                      {analysis.pullRequestCreated && analysis.pullRequestUrl && (
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <GitCommit className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                Pull request created automatically
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(analysis.pullRequestUrl!, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View PR
                            </Button>
                          </div>
                        </div>
                      )}

                      {analysis.errorMessage && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-3">
                          <div className="text-sm text-red-800 dark:text-red-200">
                            <strong>Error:</strong> {analysis.errorMessage}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Created: {formatDate(analysis.createdAt)}
                        {analysis.completedAt && (
                          <span> • Completed: {formatDate(analysis.completedAt)}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {analysesQuery.data.total > analysesQuery.data.limit && (
                    <div className="flex items-center justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {Math.ceil(analysesQuery.data.total / analysesQuery.data.limit)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= Math.ceil(analysesQuery.data.total / analysesQuery.data.limit)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Webhook className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Webhook Analyses Found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {status || repository ? 
                      'No analyses match your current filters.' :
                      'Configure webhooks in your repositories to start automatic accessibility monitoring.'
                    }
                  </p>
                  {(status || repository) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStatus('');
                        setRepository('');
                        setPage(1);
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </GlowCard>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <WebhookAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          {/* Webhook Setup Documentation */}
          <GlowCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Webhook Setup
              </CardTitle>
              <CardDescription>
                Configure webhooks in your repositories to enable automatic accessibility monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docsQuery.data && (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* GitHub Setup */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      GitHub Webhook
                    </h4>
                    <div className="bg-muted p-3 rounded text-sm font-mono">
                      POST {docsQuery.data.githubWebhook.url}
                    </div>
                    <div className="space-y-1">
                      {docsQuery.data.setup.github.map((step: string, index: number) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generic Setup */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Webhook className="w-4 h-4" />
                      Generic Webhook
                    </h4>
                    <div className="bg-muted p-3 rounded text-sm font-mono">
                      POST {docsQuery.data.genericWebhook.url}
                    </div>
                    <div className="space-y-1">
                      {docsQuery.data.setup.generic.map((step: string, index: number) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Webhooks automatically trigger accessibility analysis when code is pushed to the default branch. 
                  High severity issues will automatically create pull requests with fixes.
                </AlertDescription>
              </Alert>
            </CardContent>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
