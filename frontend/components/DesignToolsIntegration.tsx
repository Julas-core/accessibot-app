import React, { useState } from 'react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { 
  Loader2, 
  Palette, 
  FileText, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Settings,
  Zap,
  Target,
  Monitor,
  Smartphone,
  Tablet,
  Info,
  Download,
  Layers,
  Type,
  MousePointer
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import type { DesignAnalyzeResponse, DesignAccessibilityIssue, ColorContrastIssue, DesignFileInfo } from '~backend/accessibot/design-analysis';
import { GlowCard } from './GlowCard';

export function DesignToolsIntegration() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'files'>('analyze');
  const [selectedPlatform, setSelectedPlatform] = useState<'figma' | 'sketch' | 'adobe-xd'>('figma');
  const [fileUrl, setFileUrl] = useState('');
  const [fileId, setFileId] = useState('');
  const [nodeIds, setNodeIds] = useState('');
  const [analysisResult, setAnalysisResult] = useState<DesignAnalyzeResponse | null>(null);
  const { toast } = useToast();

  const statusQuery = useQuery({
    queryKey: ['design-integration-status'],
    queryFn: async () => {
      return await backend.accessibot.getDesignIntegrationStatus();
    },
    staleTime: 60_000,
  });

  const filesQuery = useQuery({
    queryKey: ['design-files', selectedPlatform],
    queryFn: async () => {
      return await backend.accessibot.listDesignFiles({ platform: selectedPlatform });
    },
    enabled: activeTab === 'files',
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: {
      fileUrl?: string;
      fileId?: string;
      platform: 'figma' | 'sketch' | 'adobe-xd';
      nodeIds?: string[];
    }) => {
      return await backend.accessibot.analyzeDesignFile(data);
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Design Analysis Complete",
        description: `Found ${data.summary.total} accessibility issues in your design`,
      });
    },
    onError: (error) => {
      console.error('Design analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze the design file. Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!fileUrl.trim() && !fileId.trim()) {
      toast({
        title: "File Required",
        description: "Please enter a file URL or file ID to analyze",
        variant: "destructive",
      });
      return;
    }

    const nodeIdsArray = nodeIds.trim() ? nodeIds.split(',').map(id => id.trim()) : undefined;

    analyzeMutation.mutate({
      fileUrl: fileUrl.trim() || undefined,
      fileId: fileId.trim() || undefined,
      platform: selectedPlatform,
      nodeIds: nodeIdsArray,
    });
  };

  const handleFileSelect = (file: DesignFileInfo) => {
    setFileId(file.id);
    setFileUrl(file.shareUrl || '');
  };

  const getSeverityColor = (severity: DesignAccessibilityIssue['severity']) => {
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

  const getSeverityIcon = (severity: DesignAccessibilityIssue['severity']) => {
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

  const getContrastLevelColor = (level: ColorContrastIssue['wcagLevel']) => {
    switch (level) {
      case 'AAA':
        return 'text-green-600';
      case 'AA':
        return 'text-yellow-600';
      case 'fail':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'figma':
        return <Layers className="w-4 h-4" />;
      case 'sketch':
        return <Palette className="w-4 h-4" />;
      case 'adobe-xd':
        return <Monitor className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'figma':
        return 'Figma';
      case 'sketch':
        return 'Sketch';
      case 'adobe-xd':
        return 'Adobe XD';
      default:
        return platform;
    }
  };

  const getIssueTypeIcon = (type: string) => {
    if (type.includes('contrast')) return <Eye className="w-4 h-4" />;
    if (type.includes('component')) return <Layers className="w-4 h-4" />;
    if (type.includes('text')) return <Type className="w-4 h-4" />;
    if (type.includes('touch') || type.includes('target')) return <MousePointer className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'analyze' | 'files');
  };

  const handlePlatformChange = (value: string) => {
    setSelectedPlatform(value as 'figma' | 'sketch' | 'adobe-xd');
  };

  return (
    <div className="space-y-6">
      {/* Integration Status */}
      {statusQuery.data && (
        <GlowCard wrapperClassName="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Design Tool Integrations
            </CardTitle>
            <CardDescription>
              Analyze design files for accessibility issues before development begins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Figma</span>
                </div>
                <div className="flex items-center gap-2">
                  {statusQuery.data.figma.connected ? (
                    <Badge variant="outline" className="text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-700 border-yellow-200">
                      <Settings className="w-3 h-3 mr-1" />
                      Demo Mode
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-orange-500" />
                  <span className="font-medium">Sketch</span>
                </div>
                <div className="flex items-center gap-2">
                  {statusQuery.data.sketch.connected ? (
                    <Badge variant="outline" className="text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-700 border-yellow-200">
                      <Settings className="w-3 h-3 mr-1" />
                      Demo Mode
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-pink-500" />
                  <span className="font-medium">Adobe XD</span>
                </div>
                <div className="flex items-center gap-2">
                  {statusQuery.data.adobeXD.connected ? (
                    <Badge variant="outline" className="text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-700 border-yellow-200">
                      <Settings className="w-3 h-3 mr-1" />
                      Demo Mode
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {!statusQuery.data.figma.connected && !statusQuery.data.sketch.connected && !statusQuery.data.adobeXD.connected && (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  All design tools are running in demo mode. Configure API tokens in the Infrastructure tab to connect to your actual design files.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </GlowCard>
      )}

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analyze" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Analyze Design
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Browse Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-6">
          <GlowCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6" />
                Design Accessibility Analysis
              </CardTitle>
              <CardDescription>
                Analyze your design files for potential accessibility issues including color contrast, component naming, and touch target sizes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Design Platform</label>
                <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select design platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="figma">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Figma
                      </div>
                    </SelectItem>
                    <SelectItem value="sketch">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Sketch
                      </div>
                    </SelectItem>
                    <SelectItem value="adobe-xd">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Adobe XD
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">File URL</label>
                  <Input
                    placeholder={`Enter ${getPlatformName(selectedPlatform)} file URL`}
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">File ID (optional)</label>
                  <Input
                    placeholder="Enter file ID directly"
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Specific Components (optional)</label>
                <Input
                  placeholder="Enter node/component IDs separated by commas"
                  value={nodeIds}
                  onChange={(e) => setNodeIds(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to analyze entire file, or specify component IDs to analyze specific elements
                </p>
              </div>

              <Button 
                onClick={handleAnalyze} 
                disabled={analyzeMutation.isPending}
                className="w-full"
                size="lg"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Design...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Analyze for Accessibility
                  </>
                )}
              </Button>
            </CardContent>
          </GlowCard>

          {analysisResult && (
            <div className="space-y-6">
              {/* File Info */}
              <GlowCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getPlatformIcon(analysisResult.fileInfo.platform)}
                    {analysisResult.fileInfo.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span>Platform: {getPlatformName(analysisResult.fileInfo.platform)}</span>
                    {analysisResult.fileInfo.lastModified && (
                      <span>Modified: {new Date(analysisResult.fileInfo.lastModified).toLocaleDateString()}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisResult.fileInfo.thumbnailUrl && (
                    <div className="flex justify-center mb-4">
                      <img 
                        src={analysisResult.fileInfo.thumbnailUrl} 
                        alt={analysisResult.fileInfo.name}
                        className="max-w-sm rounded-lg border"
                      />
                    </div>
                  )}
                </CardContent>
              </GlowCard>

              {/* Summary */}
              <GlowCard>
                <CardHeader>
                  <CardTitle>Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {analysisResult.summary.colorContrastIssues}
                      </div>
                      <div className="text-sm text-muted-foreground">Contrast Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analysisResult.summary.componentIssues}
                      </div>
                      <div className="text-sm text-muted-foreground">Component Issues</div>
                    </div>
                  </div>
                </CardContent>
              </GlowCard>

              {/* Issues List */}
              <GlowCard>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Design Accessibility Issues
                    <Badge variant="outline" className="text-xs">
                      AI-Enhanced Analysis
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Issues found in your design that may impact accessibility
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {analysisResult.issues.map((issue, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(issue.severity)}
                            {getIssueTypeIcon(issue.type)}
                            <h3 className="font-semibold">{issue.description}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(issue.severity)}>
                              {issue.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {getPlatformName(issue.designPlatform)}
                            </Badge>
                          </div>
                        </div>
                        
                        {issue.nodeName && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Component:</strong> {issue.nodeName}
                            {issue.nodeId && <span className="ml-2 font-mono text-xs">ID: {issue.nodeId}</span>}
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground">{issue.fix}</p>
                        
                        {issue.colorContrast && (
                          <div className="bg-muted p-3 rounded space-y-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Color Contrast Analysis
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Foreground:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: issue.colorContrast.foregroundColor }}
                                  />
                                  <span className="font-mono">{issue.colorContrast.foregroundColor}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Background:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <div 
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: issue.colorContrast.backgroundColor }}
                                  />
                                  <span className="font-mono">{issue.colorContrast.backgroundColor}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Contrast Ratio:</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="font-semibold">{issue.colorContrast.contrastRatio.toFixed(2)}:1</span>
                                  <Badge variant="outline" className={getContrastLevelColor(issue.colorContrast.wcagLevel)}>
                                    WCAG {issue.colorContrast.wcagLevel}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-sm">
                              <strong>Recommendation:</strong> {issue.colorContrast.recommendation}
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Current Design:</h4>
                          <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                            <code>{issue.element}</code>
                          </pre>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            Implementation Guidance:
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
                          Great Design!
                        </h3>
                        <p className="text-muted-foreground">
                          No accessibility issues found in your design file.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </GlowCard>
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <GlowCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6" />
                Design Files
              </CardTitle>
              <CardDescription>
                Browse and analyze design files from your connected platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="figma">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Figma
                      </div>
                    </SelectItem>
                    <SelectItem value="sketch">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Sketch
                      </div>
                    </SelectItem>
                    <SelectItem value="adobe-xd">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        Adobe XD
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filesQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading files...
                </div>
              )}

              {filesQuery.data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filesQuery.data.files.map((file) => (
                    <div key={file.id} className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors">
                      {file.thumbnailUrl && (
                        <div className="aspect-video rounded overflow-hidden">
                          <img 
                            src={file.thumbnailUrl} 
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <h3 className="font-medium truncate">{file.name}</h3>
                        
                        {file.lastModified && (
                          <p className="text-xs text-muted-foreground">
                            Modified: {new Date(file.lastModified).toLocaleDateString()}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFileSelect(file)}
                            className="flex-1"
                          >
                            <Target className="w-3 h-3 mr-1" />
                            Analyze
                          </Button>
                          
                          {file.shareUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.shareUrl, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filesQuery.data.files.length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Files Found
                      </h3>
                      <p className="text-muted-foreground">
                        No design files found for {getPlatformName(selectedPlatform)}. 
                        {statusQuery.data && !statusQuery.data[selectedPlatform].connected && 
                          " Connect your account to see your actual files."
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </GlowCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
