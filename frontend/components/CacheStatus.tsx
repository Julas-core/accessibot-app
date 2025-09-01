import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Database, RefreshCw, Trash2, CheckCircle, Zap, BarChart3, Timer, AlertCircle, Clock, Calendar, TrendingUp } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import backend from '~backend/client';

export function CacheStatus() {
  const { toast } = useToast();
  const [customInterval, setCustomInterval] = React.useState<string>('');

  const batchStatsQuery = useQuery({
    queryKey: ['batch-processor-status'],
    queryFn: async () => {
      return await backend.accessibot.batchProcessorStatus();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const cacheStatsQuery = useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      return await backend.accessibot.getCacheStatsEndpoint();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const cleanupMutation = useMutation({
    mutationFn: async (intervalDays?: number) => {
      return await backend.accessibot.cleanupCacheEndpoint({
        intervalDays: intervalDays,
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        const message = data.entriesRemoved !== undefined 
          ? `${data.message} - Removed ${data.entriesRemoved} entries`
          : data.message;
        
        toast({
          title: "Cache Cleanup Complete",
          description: message,
        });
        
        // Refresh cache stats after cleanup
        cacheStatsQuery.refetch();
      } else {
        toast({
          title: "Cache Cleanup Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Cache cleanup error:', error);
      toast({
        title: "Cache Cleanup Failed",
        description: "Failed to cleanup cache. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCleanupCache = () => {
    cleanupMutation.mutate();
  };

  const handleCustomCleanup = () => {
    const interval = parseInt(customInterval);
    if (isNaN(interval) || interval <= 0) {
      toast({
        title: "Invalid Interval",
        description: "Please enter a valid number of days (greater than 0).",
        variant: "destructive",
      });
      return;
    }
    
    cleanupMutation.mutate(interval);
    setCustomInterval('');
  };

  const getErrorRateColor = (errorRate: number) => {
    if (errorRate < 0.1) return 'text-green-600';
    if (errorRate < 0.2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 10000) return 'text-green-600'; // < 10s
    if (responseTime < 20000) return 'text-yellow-600'; // < 20s
    return 'text-red-600'; // >= 20s
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  return (
    <Card className="mb-6 border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5" />
          System Performance Status
        </CardTitle>
        <CardDescription>
          AI processing with intelligent caching, automated cleanup, dynamic batch sizing, and priority queuing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Statistics */}
        {cacheStatsQuery.data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-green-500" />
              <span className="font-medium text-sm">Cache Statistics</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cacheStatsQuery.refetch()}
                disabled={cacheStatsQuery.isRefetching}
              >
                {cacheStatsQuery.isRefetching ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Total Entries</span>
                <span className="font-medium text-blue-600">
                  {cacheStatsQuery.data.totalEntries}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Last 24h</span>
                <span className="font-medium text-green-600">
                  {cacheStatsQuery.data.entriesLast24h}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Last 7d</span>
                <span className="font-medium text-purple-600">
                  {cacheStatsQuery.data.entriesLast7d}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Cache TTL</span>
                <span className="font-medium text-orange-600">
                  {cacheStatsQuery.data.config.defaultTtlDays}d
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Cleanup Interval</span>
                <span className="font-medium text-red-600">
                  {cacheStatsQuery.data.config.cleanupIntervalDays}d
                </span>
              </div>
            </div>

            {/* Cache Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Oldest Entry</span>
                <span className="font-mono">
                  {formatDate(cacheStatsQuery.data.oldestEntry)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Newest Entry</span>
                <span className="font-mono">
                  {formatDate(cacheStatsQuery.data.newestEntry)}
                </span>
              </div>
            </div>

            {/* Automated Cleanup Status */}
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">Automated Cleanup</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-green-700 border-green-200">
                  <Calendar className="w-3 h-3 mr-1" />
                  Daily at 2:00 AM UTC
                </Badge>
                <Badge variant="outline" className="text-purple-700 border-purple-200">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Weekly Deep Clean (Sundays)
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Manual Cache Cleanup */}
        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center gap-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <Badge variant="outline" className="text-green-700 border-green-200">
                Auto-Cleanup Active
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Rate Limit: 50 requests/hour
              </span>
            </div>
            
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanupCache}
                disabled={cleanupMutation.isPending}
              >
                {cleanupMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Manual Cleanup
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Custom Cleanup */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Days"
              value={customInterval}
              onChange={(e) => setCustomInterval(e.target.value)}
              className="w-20"
              min="1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCustomCleanup}
              disabled={cleanupMutation.isPending || !customInterval}
            >
              Custom Cleanup
            </Button>
            <span className="text-xs text-muted-foreground">
              Remove entries older than X days
            </span>
          </div>
        </div>

        {/* Batch Processor Stats */}
        {batchStatsQuery.data && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="font-medium text-sm">Dynamic Batch Processor</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => batchStatsQuery.refetch()}
                disabled={batchStatsQuery.isRefetching}
              >
                {batchStatsQuery.isRefetching ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Batch Size</span>
                <span className="font-medium text-blue-600">
                  {batchStatsQuery.data.stats.currentBatchSize}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Processed</span>
                <span className="font-medium">
                  {batchStatsQuery.data.stats.totalProcessed}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Error Rate</span>
                <span className={`font-medium ${getErrorRateColor(batchStatsQuery.data.stats.errorRate)}`}>
                  {(batchStatsQuery.data.stats.errorRate * 100).toFixed(1)}%
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Avg Response</span>
                <span className={`font-medium ${getResponseTimeColor(batchStatsQuery.data.stats.averageResponseTime)}`}>
                  {(batchStatsQuery.data.stats.averageResponseTime / 1000).toFixed(1)}s
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Queue</span>
                <span className="font-medium text-orange-600">
                  {batchStatsQuery.data.pendingCount}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-muted-foreground">Priority Queue</span>
                <div className="flex gap-1">
                  {Object.entries(batchStatsQuery.data.queueSummary).length > 0 ? (
                    Object.entries(batchStatsQuery.data.queueSummary)
                      .sort(([a], [b]) => parseInt(b) - parseInt(a))
                      .map(([priority, count]) => (
                        <Badge key={priority} variant="outline" className="text-xs px-1 py-0">
                          P{priority}:{count}
                        </Badge>
                      ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Empty</span>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="flex flex-wrap gap-2 pt-2">
              {batchStatsQuery.data.stats.errorRate < 0.1 && (
                <Badge variant="outline" className="text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Low Error Rate
                </Badge>
              )}
              
              {batchStatsQuery.data.stats.averageResponseTime < 15000 && (
                <Badge variant="outline" className="text-blue-700 border-blue-200">
                  <Timer className="w-3 h-3 mr-1" />
                  Fast Response
                </Badge>
              )}
              
              {batchStatsQuery.data.pendingCount === 0 && (
                <Badge variant="outline" className="text-purple-700 border-purple-200">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Queue Clear
                </Badge>
              )}

              {batchStatsQuery.data.stats.errorRate > 0.15 && (
                <Badge variant="outline" className="text-red-700 border-red-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  High Error Rate
                </Badge>
              )}
            </div>
          </div>
        )}

        {(batchStatsQuery.isError || cacheStatsQuery.isError) && (
          <div className="text-sm text-muted-foreground">
            Failed to load system stats
          </div>
        )}
      </CardContent>
    </Card>
  );
}
