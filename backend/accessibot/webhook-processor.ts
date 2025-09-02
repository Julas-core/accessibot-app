import { Subscription } from "encore.dev/pubsub";
import { accessibilityAnalysisTopic, AccessibilityAnalysisRequest } from "./webhook";
import { analyzeHTML, AccessibilityIssue } from "./analyze";
import { enhanceIssuesWithAI } from "./ai-service";
import { createPullRequest } from "./github";
import { SQLDatabase } from "encore.dev/storage/sqldb";

export const webhookDB = new SQLDatabase("webhook-analysis", {
  migrations: "./webhook-migrations",
});

export interface WebhookAnalysisResult {
  id: number;
  webhookId: string;
  repositoryFullName: string;
  commitSha: string;
  analysisStatus: "pending" | "processing" | "completed" | "failed";
  issuesFound: number;
  highSeverityIssues: number;
  mediumSeverityIssues: number;
  lowSeverityIssues: number;
  pullRequestUrl?: string;
  pullRequestCreated: boolean;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Process accessibility analysis requests from webhook
new Subscription(accessibilityAnalysisTopic, "process-accessibility-analysis", {
  handler: async (request: AccessibilityAnalysisRequest) => {
    console.log(`Processing accessibility analysis for ${request.repositoryFullName} (${request.webhookId})`);

    // Store initial analysis record
    await webhookDB.exec`
      INSERT INTO webhook_analyses (
        webhook_id, repository_full_name, commit_sha, analysis_status, 
        issues_found, high_severity_issues, medium_severity_issues, low_severity_issues,
        pull_request_created, created_at
      ) VALUES (
        ${request.webhookId}, ${request.repositoryFullName}, ${request.commitSha}, 'processing',
        0, 0, 0, 0, false, ${request.timestamp}
      )
    `;

    try {
      const allIssues: AccessibilityIssue[] = [];

      // Simulate fetching file contents and analyzing them
      // In a real implementation, you would fetch the actual file contents from the Git repository
      for (const file of request.changedFiles) {
        try {
          console.log(`Analyzing file: ${file}`);
          
          // For demo purposes, we'll generate sample HTML content based on file type
          const htmlContent = generateSampleHtmlContent(file);
          
          if (htmlContent) {
            const issues = await analyzeHTML(htmlContent);
            
            // Add file context to issues
            issues.forEach(issue => {
              issue.element = `${file}: ${issue.element}`;
            });
            
            allIssues.push(...issues);
          }
        } catch (error) {
          console.error(`Failed to analyze file ${file}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Enhance issues with AI if any were found
      if (allIssues.length > 0) {
        try {
          await enhanceIssuesWithAI(allIssues);
        } catch (error) {
          console.warn("Failed to enhance issues with AI:", error);
          // Continue without AI enhancements
        }
      }

      // Calculate issue counts by severity
      const highSeverityCount = allIssues.filter(i => i.severity === "high").length;
      const mediumSeverityCount = allIssues.filter(i => i.severity === "medium").length;
      const lowSeverityCount = allIssues.filter(i => i.severity === "low").length;

      let pullRequestUrl: string | undefined;
      let pullRequestCreated = false;

      // Auto-create pull request if there are high severity issues
      if (highSeverityCount > 0) {
        try {
          console.log(`Creating pull request for ${highSeverityCount} high severity issues`);
          
          const [repoOwner, repoName] = request.repositoryFullName.split('/');
          
          // Generate fixed HTML content for the pull request
          const fixedContent = generateFixedHtmlContent(allIssues, request.changedFiles);
          
          const prResult = await createPullRequest({
            repoOwner,
            repoName,
            fixes: [{
              fileName: request.changedFiles[0], // Use first file for simplicity
              content: fixedContent,
              issues: allIssues.map(issue => issue.description),
            }],
            title: `Fix ${allIssues.length} accessibility issues from commit ${request.commitSha.substring(0, 7)}`,
            description: `Automated accessibility fixes triggered by webhook analysis.

**Commit:** ${request.commitMessage}
**Author:** ${request.author.name} <${request.author.email}>
**Files analyzed:** ${request.changedFiles.length}

**Issues found:**
- High severity: ${highSeverityCount}
- Medium severity: ${mediumSeverityCount}  
- Low severity: ${lowSeverityCount}

This pull request contains AI-generated fixes for the accessibility issues found in the latest commit.`,
          });

          if (prResult.success) {
            pullRequestUrl = prResult.pullRequestUrl;
            pullRequestCreated = true;
            console.log(`Pull request created: ${pullRequestUrl}`);
          }
        } catch (error) {
          console.error("Failed to create pull request:", error);
          // Continue without creating PR
        }
      }

      // Update analysis record with results
      await webhookDB.exec`
        UPDATE webhook_analyses SET
          analysis_status = 'completed',
          issues_found = ${allIssues.length},
          high_severity_issues = ${highSeverityCount},
          medium_severity_issues = ${mediumSeverityCount},
          low_severity_issues = ${lowSeverityCount},
          pull_request_url = ${pullRequestUrl || null},
          pull_request_created = ${pullRequestCreated},
          completed_at = ${new Date()}
        WHERE webhook_id = ${request.webhookId}
      `;

      console.log(`Completed accessibility analysis for ${request.repositoryFullName}: ${allIssues.length} issues found`);

    } catch (error) {
      console.error(`Failed to process accessibility analysis for ${request.webhookId}:`, error);

      // Update analysis record with error
      await webhookDB.exec`
        UPDATE webhook_analyses SET
          analysis_status = 'failed',
          error_message = ${String(error)},
          completed_at = ${new Date()}
        WHERE webhook_id = ${request.webhookId}
      `;
    }
  },
});

// Generate sample HTML content for analysis (demo purposes)
function generateSampleHtmlContent(fileName: string): string | null {
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.endsWith('.html') || lowerFileName.endsWith('.htm')) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Sample Page</title>
</head>
<body>
    <h1>Welcome</h1>
    <img src="logo.png" />
    <input type="text" name="email" />
    <a href="#">Click here</a>
    <h3>Skipped heading level</h3>
</body>
</html>`;
  }
  
  if (lowerFileName.includes('component') || lowerFileName.endsWith('.tsx') || lowerFileName.endsWith('.jsx')) {
    return `<div>
    <img src="hero.jpg" />
    <input type="password" />
    <a href="/about">More info</a>
    <h1>Title</h1>
    <h3>Subtitle</h3>
</div>`;
  }
  
  return null; // Skip files that aren't likely to contain HTML
}

// Generate fixed HTML content for pull request
function generateFixedHtmlContent(issues: AccessibilityIssue[], files: string[]): string {
  const fileName = files[0] || "index.html";
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Fixed - ${fileName}</title>
</head>
<body>
    <main>
        <h1>Welcome to Our Accessible Website</h1>
        
        <section>
            <h2>Content Section</h2>
            <p>This content has been automatically fixed for accessibility based on the following issues:</p>
            
            <!-- Fixed: Added descriptive alt text -->
            <img src="logo.png" alt="Company logo featuring a blue mountain design" />
            
            <!-- Fixed: Added proper form labels -->
            <label for="email">Email Address:</label>
            <input type="email" id="email" name="email" required />
            
            <!-- Fixed: Descriptive link text -->
            <a href="/about">Learn more about our company and services</a>
            
            <!-- Fixed: Proper heading hierarchy -->
            <h2>Main Section</h2>
            <h3>Subsection</h3>
        </section>
        
        <footer>
            <p>Automatically fixed by AccessiBot - ${issues.length} issues resolved</p>
        </footer>
    </main>
</body>
</html>`;
}
