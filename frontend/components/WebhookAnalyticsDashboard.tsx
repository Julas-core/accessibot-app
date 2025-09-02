import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle,
  GitBranch,
  Zap,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Target,
  AlertTriangle,
  Users,
  Database
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function WebhookAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedRepository, setSelectedRepository] = useState('');
  const { toast } = useToast();

  const analyticsQuery = useQuery({
    queryKey: ['webhook-analytics', dateRange.startDate, dateRange.endDate, selectedRepository],
    queryFn: async () => {
      return await backend.accessibot.getWebhookAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        repository: selectedRepository || undefined,
      });
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const performanceQuery = useQuery({
    queryKey: ['webhook-performance'],
    queryFn: async () => {
      return await backend.accessibot.getWebhookPerformanceMetrics();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    analyticsQuery.refetch();
    performanceQuery.refetch();
    toast({
      title: "Data Refreshed",
      description: "Analytics data has been updated with the latest information.",
    });
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
    return `${(milliseconds / 60000).toFixed(1)}m`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

  if (analyticsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        <span className="text-lg">Loading analytics dashboard...</span>
      </div>
    );
  }

  if (analyticsQuery.error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Analytics</h3>
        <p className="text-muted-foreground mb-4">
          Unable to fetch analytics data. Please try again.
        </p>
        <Button onClick={() => analyticsQuery.refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const data = analyticsQuery.data;
  const performance = performanceQuery.data;

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for automated accessibility analysis
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository</label>
              <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                <SelectTrigger>
                  <SelectValue placeholder="All repositories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All repositories</SelectItem>
                  {data.repositories.map((repo) => (
                    <SelectItem key={repo.repositoryFullName} value={repo.repositoryFullName}>
                      {repo.repositoryFullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => analyticsQuery.refetch()}
                disabled={analyticsQuery.isRefetching}
                className="w-full"
              >
                {analyticsQuery.isRefetching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Performance Metrics */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Current Hour</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {performance.currentHourAnalyses}
              </div>
              <div className="text-xs text-muted-foreground">analyses</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Last 24h</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {performance.last24HoursAnalyses}
              </div>
              <div className="text-xs text-muted-foreground">analyses</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {performance.currentDaySuccessRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">today</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">Avg Processing</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {formatDuration(performance.averageProcessingTimeToday)}
              </div>
              <div className="text-xs text-muted-foreground">today</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Peak Hour</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {performance.peakHourToday ? `${performance.peakHourToday.hour}:00` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">
                {performance.peakHourToday ? `${performance.peakHourToday.analysesCount} analyses` : 'today'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-muted-foreground">Top Repo</span>
              </div>
              <div className="text-sm font-bold text-indigo-600 truncate">
                {performance.topActiveRepository ? 
                  performance.topActiveRepository.repositoryFullName.split('/')[1] || 'N/A' : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">
                {performance.topActiveRepository ? `${performance.topActiveRepository.analysesCount} analyses` : 'today'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deliveries</p>
                <p className="text-3xl font-bold">{data.delivery.totalDeliveries}</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-green-700 border-green-200">
                {data.delivery.successRate.toFixed(1)}% success
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                <p className="text-3xl font-bold">{formatDuration(data.delivery.averageProcessingTime)}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Per analysis completion
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Automated Fixes</p>
                <p className="text-3xl font-bold">{data.automatedFixes.successfulFixes}</p>
              </div>
              <GitBranch className="w-8 h-8 text-green-500" />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-green-700 border-green-200">
                {data.automatedFixes.successRate.toFixed(1)}% success
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Repositories</p>
                <p className="text-3xl font-bold">{data.repositories.length}</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              In selected period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Issue Trends Over Time
          </CardTitle>
          <CardDescription>
            Daily breakdown of accessibility issues found across all analyses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data.issueTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => formatDate(value)}
                formatter={(value, name) => [value, name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="highSeverityIssues" 
                stackId="1" 
                stroke="#ef4444" 
                fill="#ef4444" 
                name="High Severity"
              />
              <Area 
                type="monotone" 
                dataKey="mediumSeverityIssues" 
                stackId="1" 
                stroke="#f59e0b" 
                fill="#f59e0b" 
                name="Medium Severity"
              />
              <Area 
                type="monotone" 
                dataKey="lowSeverityIssues" 
                stackId="1" 
                stroke="#22c55e" 
                fill="#22c55e" 
                name="Low Severity"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Processing Time Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Processing Time Analysis
          </CardTitle>
          <CardDescription>
            Daily processing time metrics showing performance trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.processingTimes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis 
                tickFormatter={(value) => formatDuration(value)}
              />
              <Tooltip 
                labelFormatter={(value) => formatDate(value)}
                formatter={(value) => [formatDuration(Number(value)), 'Processing Time']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="averageProcessingTime" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Average"
              />
              <Line 
                type="monotone" 
                dataKey="minProcessingTime" 
                stroke="#22c55e" 
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Minimum"
              />
              <Line 
                type="monotone" 
                dataKey="maxProcessingTime" 
                stroke="#ef4444" 
                strokeWidth={1}
                strokeDasharray="5 5"
                name="Maximum"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Repository Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Repository Performance
          </CardTitle>
          <CardDescription>
            Analysis metrics per repository showing activity and success rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.repositories.slice(0, 10).map((repo) => (
              <div key={repo.repositoryFullName} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{repo.repositoryFullName}</div>
                  <div className="text-sm text-muted-foreground">
                    {repo.totalAnalyses} analyses • {repo.totalIssuesFound} issues found
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm font-medium">{repo.successRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium">{formatDuration(repo.averageProcessingTime)}</div>
                    <div className="text-xs text-muted-foreground">Avg Time</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium">{repo.pullRequestsCreated}</div>
                    <div className="text-xs text-muted-foreground">PRs Created</div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {repo.successRate >= 90 ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : repo.successRate >= 70 ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {data.repositories.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No repository data available for the selected period
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automated Fix Success by Repository */}
      {data.automatedFixes.fixesByRepository.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Automated Fix Success Rates
            </CardTitle>
            <CardDescription>
              Pull request creation success rates by repository
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.automatedFixes.fixesByRepository.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="repositoryFullName" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'successRate' ? `${Number(value).toFixed(1)}%` : value,
                    name === 'successRate' ? 'Success Rate' : 
                    name === 'totalFixes' ? 'Total Fixes' : 'Successful Fixes'
                  ]}
                />
                <Legend />
                <Bar dataKey="totalFixes" fill="#3b82f6" name="Total Fixes" />
                <Bar dataKey="successfulFixes" fill="#22c55e" name="Successful Fixes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
