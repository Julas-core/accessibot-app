import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Github, ExternalLink, GitBranch, FileCode, AlertTriangle, Settings } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import type { AccessibilityIssue } from '~backend/accessibot/analyze';
import type { GitHubRepo } from '~backend/accessibot/github';

interface GitHubIntegrationProps {
  issues: AccessibilityIssue[];
}

export function GitHubIntegration({ issues }: GitHubIntegrationProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [fileName, setFileName] = useState('index.html');
  const [prTitle, setPrTitle] = useState('Fix accessibility issues');
  const [prDescription, setPrDescription] = useState('');
  const [fixedHtml, setFixedHtml] = useState('');
  const { toast } = useToast();

  const repositoriesQuery = useQuery({
    queryKey: ['github-repositories'],
    queryFn: async () => {
      try {
        return await backend.accessibot.listRepositories();
      } catch (error: any) {
        console.error('Failed to fetch repositories:', error);
        
        // Extract the error message for better user feedback
        let errorMessage = 'Failed to fetch GitHub repositories.';
        if (error?.message) {
          if (error.message.includes('not configured')) {
            errorMessage = 'GitHub token is not configured. Please set the GitHubToken secret in the Infrastructure tab.';
          } else if (error.message.includes('Invalid')) {
            errorMessage = 'Invalid GitHub token. Please check your token in the Infrastructure tab.';
          } else if (error.message.includes('rate limit')) {
            errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
          } else {
            errorMessage = error.message;
          }
        }
        
        throw new Error(errorMessage);
      }
    },
    retry: false, // Don't retry on token configuration errors
  });

  const createPRMutation = useMutation({
    mutationFn: async (data: {
      repoOwner: string;
      repoName: string;
      fixes: {
        fileName: string;
        content: string;
        issues: string[];
      }[];
      title: string;
      description: string;
    }) => {
      try {
        return await backend.accessibot.createPullRequest(data);
      } catch (error: any) {
        console.error('PR creation error:', error);
        
        // Extract the error message for better user feedback
        let errorMessage = 'Failed to create pull request.';
        if (error?.message) {
          if (error.message.includes('not configured')) {
            errorMessage = 'GitHub token is not configured. Please set the GitHubToken secret in the Infrastructure tab.';
          } else if (error.message.includes('Invalid')) {
            errorMessage = 'Invalid GitHub token. Please check your token in the Infrastructure tab.';
          } else if (error.message.includes('not found')) {
            errorMessage = 'Repository not found or you don\'t have access to it.';
          } else if (error.message.includes('permissions')) {
            errorMessage = 'Insufficient permissions to create pull requests in this repository.';
          } else if (error.message.includes('rate limit')) {
            errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
          } else {
            errorMessage = error.message;
          }
        }
        
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Pull Request Created!",
        description: "Your accessibility fixes have been submitted as a pull request.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Pull Request",
        description: error.message || "There was an error creating the pull request.",
        variant: "destructive",
      });
    },
  });

  const handleCreatePR = () => {
    if (!selectedRepo || !fileName.trim() || !fixedHtml.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a repository, enter a file name, and provide the fixed HTML content.",
        variant: "destructive",
      });
      return;
    }

    const [repoOwner, repoName] = selectedRepo.split('/');
    const issueDescriptions = issues.map(issue => issue.description);

    createPRMutation.mutate({
      repoOwner,
      repoName,
      fixes: [{
        fileName: fileName.trim(),
        content: fixedHtml.trim(),
        issues: issueDescriptions,
      }],
      title: prTitle.trim() || 'Fix accessibility issues',
      description: prDescription.trim() || `This pull request fixes ${issues.length} accessibility issues found by AccessiBot.`,
    });
  };

  const generateFixedHtml = () => {
    // This is a simplified example - in a real implementation, you'd want to
    // actually parse and modify the original HTML based on the issues found
    const exampleFixed = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessible Website - Fixed by AccessiBot</title>
</head>
<body>
    <main>
        <h1>Welcome to Our Accessible Website</h1>
        
        <section>
            <h2>About Us</h2>
            <p>This content has been made more accessible based on the following fixes:</p>
            
            <!-- Example fixes based on common issues -->
            <img src="logo.png" alt="Company logo featuring a blue mountain range" />
            
            <label for="email">Email Address:</label>
            <input type="email" id="email" name="email" required />
            
            <a href="/contact">Contact us for more information</a>
        </section>
    </main>
</body>
</html>`;

    setFixedHtml(exampleFixed);
    toast({
      title: "Example HTML Generated",
      description: "A sample fixed HTML has been generated. Please modify it according to your actual content.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-6 h-6" />
          GitHub Integration
        </CardTitle>
        <CardDescription>
          Create a pull request with your accessibility fixes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {repositoriesQuery.isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading repositories...
          </div>
        )}

        {repositoriesQuery.error && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>{repositoriesQuery.error.message}</div>
              {repositoriesQuery.error.message.includes('token') && (
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="w-4 h-4" />
                  <span>Go to the Infrastructure tab to configure your GitHub token</span>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => repositoriesQuery.refetch()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {repositoriesQuery.data && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="repo-select" className="text-sm font-medium">
                Select Repository
              </label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger id="repo-select">
                  <SelectValue placeholder="Choose a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repositoriesQuery.data.repositories.map((repo) => (
                    <SelectItem key={repo.id} value={repo.full_name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{repo.full_name}</span>
                        {repo.private && (
                          <Badge variant="secondary" className="ml-2">Private</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="file-name" className="text-sm font-medium">
                  File Name
                </label>
                <Input
                  id="file-name"
                  placeholder="index.html"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="pr-title" className="text-sm font-medium">
                  Pull Request Title
                </label>
                <Input
                  id="pr-title"
                  placeholder="Fix accessibility issues"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="pr-description" className="text-sm font-medium">
                Pull Request Description
              </label>
              <Textarea
                id="pr-description"
                placeholder="Describe the accessibility improvements..."
                value={prDescription}
                onChange={(e) => setPrDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="fixed-html" className="text-sm font-medium">
                  Fixed HTML Content
                </label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateFixedHtml}
                >
                  <FileCode className="w-4 h-4 mr-2" />
                  Generate Example
                </Button>
              </div>
              <Textarea
                id="fixed-html"
                placeholder="Paste your fixed HTML content here..."
                value={fixedHtml}
                onChange={(e) => setFixedHtml(e.target.value)}
                rows={10}
              />
            </div>

            <div className="border-t pt-4">
              <div className="mb-4">
                <h4 className="font-medium mb-2">Issues to be fixed:</h4>
                <div className="flex flex-wrap gap-2">
                  {issues.map((issue, index) => (
                    <Badge key={index} variant="outline">
                      {issue.type.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleCreatePR}
                disabled={createPRMutation.isPending || !selectedRepo || !fileName.trim() || !fixedHtml.trim()}
                className="w-full"
                size="lg"
              >
                {createPRMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Pull Request...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Create Pull Request
                  </>
                )}
              </Button>
            </div>

            {createPRMutation.data && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200">
                      Pull Request Created Successfully!
                    </h4>
                    <p className="text-sm text-green-600 dark:text-green-300">
                      Branch: {createPRMutation.data.branchName}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(createPRMutation.data.pullRequestUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View PR
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
