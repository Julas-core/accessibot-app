import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Code2, Zap, Database } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import backend from '~backend/client';
import type { AnalyzeResponse, AccessibilityIssue } from '~backend/accessibot/analyze';
import { GitHubIntegration } from './GitHubIntegration';
import { CacheStatus } from './CacheStatus';

export function AccessibilityAnalyzer() {
  const [inputType, setInputType] = useState<'url' | 'html'>('url');
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (data: { url?: string; html?: string }) => {
      return await backend.accessibot.analyze(data);
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Analysis Complete",
        description: `Found ${data.summary.total} accessibility issues`,
      });
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the content. Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (inputType === 'url' && !url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to analyze",
        variant: "destructive",
      });
      return;
    }

    if (inputType === 'html' && !html.trim()) {
      toast({
        title: "HTML Required",
        description: "Please enter HTML content to analyze",
        variant: "destructive",
      });
      return;
    }

    const data = inputType === 'url' ? { url: url.trim() } : { html: html.trim() };
    analyzeMutation.mutate(data);
  };

  const getSeverityColor = (severity: AccessibilityIssue['severity']) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: AccessibilityIssue['severity']) => {
    switch (severity) {
      case 'high':
        return <XCircle className="w-4 h-4" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-4">AccessiBot</h1>
        <p className="text-xl text-muted-foreground mb-4">
          AI-powered web accessibility analysis with intelligent caching
        </p>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span>Rate-Limited AI Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-green-500" />
            <span>Intelligent Fix Caching</span>
          </div>
        </div>
      </div>

      {/* Cache Status Component */}
      <CacheStatus />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-6 h-6" />
            Analyze Content
          </CardTitle>
          <CardDescription>
            Enter a URL or paste HTML content to analyze for accessibility issues. 
            AI-generated fixes are cached to improve performance and reduce costs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputType} onValueChange={(value) => setInputType(value as 'url' | 'html')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">URL</TabsTrigger>
              <TabsTrigger value="html">HTML Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="url-input" className="text-sm font-medium">
                  Website URL
                </label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="html" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="html-input" className="text-sm font-medium">
                  HTML Content
                </label>
                <Textarea
                  id="html-input"
                  placeholder="<html>...</html>"
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={8}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            onClick={handleAnalyze} 
            disabled={analyzeMutation.isPending}
            className="w-full"
            size="lg"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Accessibility'
            )}
          </Button>
        </CardContent>
      </Card>

      {analysisResult && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {analysisResult.summary.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {analysisResult.summary.high}
                  </div>
                  <div className="text-sm text-muted-foreground">High Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analysisResult.summary.medium}
                  </div>
                  <div className="text-sm text-muted-foreground">Medium Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResult.summary.low}
                  </div>
                  <div className="text-sm text-muted-foreground">Low Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Accessibility Issues
                <Badge variant="outline" className="text-xs">
                  AI-Enhanced Fixes
                </Badge>
              </CardTitle>
              <CardDescription>
                AI-generated fixes with intelligent caching to optimize performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analysisResult.issues.map((issue, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(issue.severity)}
                        <h3 className="font-semibold">{issue.description}</h3>
                      </div>
                      <Badge variant={getSeverityColor(issue.severity)}>
                        {issue.severity.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{issue.fix}</p>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Current Code:</h4>
                      <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                        <code>{issue.element}</code>
                      </pre>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        Suggested Fix:
                        <Badge variant="outline" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          AI-Enhanced
                        </Badge>
                      </h4>
                      <pre className="bg-green-50 dark:bg-green-950 p-3 rounded text-sm overflow-x-auto">
                        <code>{issue.codeSnippet}</code>
                      </pre>
                    </div>
                  </div>
                ))}
                
                {analysisResult.issues.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Issues Found!
                    </h3>
                    <p className="text-muted-foreground">
                      Great job! Your content appears to be accessible.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* GitHub Integration */}
          {analysisResult.issues.length > 0 && (
            <GitHubIntegration issues={analysisResult.issues} />
          )}
        </div>
      )}
    </div>
  );
}
