import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";

const githubToken = secret("GitHubToken");

export interface CreatePullRequestRequest {
  repoOwner: string;
  repoName: string;
  fixes: {
    fileName: string;
    content: string;
    issues: string[];
  }[];
  title?: string;
  description?: string;
}

export interface CreatePullRequestResponse {
  pullRequestUrl: string;
  branchName: string;
  success: boolean;
}

// Creates a GitHub pull request with accessibility fixes.
export const createPullRequest = api<CreatePullRequestRequest, CreatePullRequestResponse>(
  { expose: true, method: "POST", path: "/github/pull-request" },
  async (req) => {
    const token = githubToken();
    
    // Validate GitHub token
    if (!token || token.trim() === '') {
      throw APIError.failedPrecondition("GitHub token is not configured. Please set the GitHubToken secret in the Infrastructure tab.");
    }

    const branchName = `accessibility-fixes-${Date.now()}`;
    
    try {
      // Get the default branch
      const repoResponse = await fetch(`https://api.github.com/repos/${req.repoOwner}/${req.repoName}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AccessiBot/1.0',
        },
      });

      if (!repoResponse.ok) {
        const errorText = await repoResponse.text();
        console.error(`GitHub API error - get repository:`, {
          status: repoResponse.status,
          statusText: repoResponse.statusText,
          body: errorText
        });
        
        if (repoResponse.status === 401) {
          throw APIError.unauthenticated("Invalid GitHub token. Please check your token in the Infrastructure tab.");
        } else if (repoResponse.status === 404) {
          throw APIError.notFound(`Repository ${req.repoOwner}/${req.repoName} not found or you don't have access to it.`);
        } else if (repoResponse.status === 403) {
          throw APIError.permissionDenied("Insufficient permissions to access this repository.");
        } else {
          throw APIError.internal(`Failed to get repository info: ${repoResponse.status} ${repoResponse.statusText}`);
        }
      }

      const repoData = await repoResponse.json();
      const defaultBranch = repoData.default_branch;

      // Get the latest commit SHA from the default branch
      const branchResponse = await fetch(`https://api.github.com/repos/${req.repoOwner}/${req.repoName}/git/refs/heads/${defaultBranch}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AccessiBot/1.0',
        },
      });

      if (!branchResponse.ok) {
        const errorText = await branchResponse.text();
        console.error(`GitHub API error - get branch:`, {
          status: branchResponse.status,
          statusText: branchResponse.statusText,
          body: errorText
        });
        throw APIError.internal(`Failed to get branch info: ${branchResponse.status} ${branchResponse.statusText}`);
      }

      const branchData = await branchResponse.json();
      const latestCommitSha = branchData.object.sha;

      // Create a new branch
      const createBranchResponse = await fetch(`https://api.github.com/repos/${req.repoOwner}/${req.repoName}/git/refs`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'AccessiBot/1.0',
        },
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: latestCommitSha,
        }),
      });

      if (!createBranchResponse.ok) {
        const errorText = await createBranchResponse.text();
        console.error(`GitHub API error - create branch:`, {
          status: createBranchResponse.status,
          statusText: createBranchResponse.statusText,
          body: errorText
        });
        throw APIError.internal(`Failed to create branch: ${createBranchResponse.status} ${createBranchResponse.statusText}`);
      }

      // Create commits for each file
      for (const fix of req.fixes) {
        // Get the current file content to get the SHA (if file exists)
        const fileResponse = await fetch(`https://api.github.com/repos/${req.repoOwner}/${req.repoName}/contents/${fix.fileName}?ref=${branchName}`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AccessiBot/1.0',
          },
        });

        let fileSha: string | undefined;
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          fileSha = fileData.sha;
        }

        // Update or create the file
        const updateFileResponse = await fetch(`https://api.github.com/repos/${req.repoOwner}/${req.repoName}/contents/${fix.fileName}`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'AccessiBot/1.0',
          },
          body: JSON.stringify({
            message: `Fix accessibility issues in ${fix.fileName}\n\nFixed issues:\n${fix.issues.map(issue => `- ${issue}`).join('\n')}`,
            content: Buffer.from(fix.content).toString('base64'),
            branch: branchName,
            ...(fileSha && { sha: fileSha }),
          }),
        });

        if (!updateFileResponse.ok) {
          const errorText = await updateFileResponse.text();
          console.error(`GitHub API error - update file ${fix.fileName}:`, {
            status: updateFileResponse.status,
            statusText: updateFileResponse.statusText,
            body: errorText
          });
          throw APIError.internal(`Failed to update file ${fix.fileName}: ${updateFileResponse.status} ${updateFileResponse.statusText}`);
        }
      }

      // Create the pull request
      const title = req.title || 'Fix accessibility issues';
      const description = req.description || `This pull request fixes various accessibility issues found by AccessiBot.\n\nFixed issues:\n${req.fixes.flatMap(f => f.issues).map(issue => `- ${issue}`).join('\n')}`;

      const prResponse = await fetch(`https://api.github.com/repos/${req.repoOwner}/${req.repoName}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'AccessiBot/1.0',
        },
        body: JSON.stringify({
          title,
          body: description,
          head: branchName,
          base: defaultBranch,
        }),
      });

      if (!prResponse.ok) {
        const errorText = await prResponse.text();
        console.error(`GitHub API error - create pull request:`, {
          status: prResponse.status,
          statusText: prResponse.statusText,
          body: errorText
        });
        throw APIError.internal(`Failed to create pull request: ${prResponse.status} ${prResponse.statusText}`);
      }

      const prData = await prResponse.json();

      return {
        pullRequestUrl: prData.html_url,
        branchName,
        success: true,
      };
    } catch (error) {
      console.error('GitHub API error:', error);
      
      // Re-throw APIError instances
      if (error instanceof APIError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw APIError.unavailable("Unable to connect to GitHub API. Please check your internet connection.");
      }
      
      throw APIError.internal(`Failed to create pull request: ${error}`);
    }
  }
);

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
}

export interface ListRepositoriesResponse {
  repositories: GitHubRepo[];
}

// Lists user's GitHub repositories.
export const listRepositories = api<void, ListRepositoriesResponse>(
  { expose: true, method: "GET", path: "/github/repositories" },
  async () => {
    const token = githubToken();
    
    // Validate GitHub token
    if (!token || token.trim() === '') {
      throw APIError.failedPrecondition("GitHub token is not configured. Please set the GitHubToken secret in the Infrastructure tab.");
    }
    
    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AccessiBot/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub API error - list repositories:`, {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 401) {
          throw APIError.unauthenticated("Invalid GitHub token. Please check your token in the Infrastructure tab.");
        } else if (response.status === 403) {
          throw APIError.permissionDenied("GitHub API rate limit exceeded or insufficient permissions.");
        } else {
          throw APIError.internal(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
        }
      }

      const repositories = await response.json();

      return {
        repositories: repositories.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          html_url: repo.html_url,
        })),
      };
    } catch (error) {
      console.error('GitHub API error:', error);
      
      // Re-throw APIError instances
      if (error instanceof APIError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw APIError.unavailable("Unable to connect to GitHub API. Please check your internet connection.");
      }
      
      throw APIError.internal(`Failed to fetch repositories: ${error}`);
    }
  }
);
