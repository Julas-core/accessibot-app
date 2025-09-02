import { api } from "encore.dev/api";

export interface WebhookHeader {
  name: string;
  description: string;
  required: boolean;
}

export interface GitHubWebhookInfo {
  url: string;
  method: string;
  description: string;
  headers: WebhookHeader[];
  events: string[];
  examplePayload: GitHubWebhookExamplePayload;
}

export interface GenericWebhookInfo {
  url: string;
  method: string;
  description: string;
  examplePayload: GenericWebhookExamplePayload;
}

export interface WebhookSetup {
  github: string[];
  generic: string[];
}

export interface GitHubWebhookExamplePayload {
  ref: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    default_branch: string;
  };
  commits: Array<{
    id: string;
    message: string;
    url: string;
    added: string[];
    modified: string[];
    removed: string[];
    author: {
      name: string;
      email: string;
    };
  }>;
  head_commit: {
    id: string;
    message: string;
    url: string;
    added: string[];
    modified: string[];
    removed: string[];
    author: {
      name: string;
      email: string;
    };
  };
}

export interface GenericWebhookExamplePayload {
  repository: {
    name: string;
    url: string;
    branch?: string;
  };
  commits: Array<{
    id: string;
    message: string;
    files: string[];
    author: {
      name: string;
      email: string;
    };
  }>;
}

export interface WebhookDocumentation {
  githubWebhook: GitHubWebhookInfo;
  genericWebhook: GenericWebhookInfo;
  setup: WebhookSetup;
}

// Get webhook setup documentation and examples
export const getWebhookDocs = api<void, WebhookDocumentation>(
  { expose: true, method: "GET", path: "/webhook/docs" },
  async () => {
    return {
      githubWebhook: {
        url: "/webhook/github",
        method: "POST",
        description: "GitHub webhook endpoint for automatic accessibility analysis on push events",
        headers: [
          {
            name: "X-Hub-Signature-256",
            description: "GitHub webhook signature for security validation",
            required: true,
          },
          {
            name: "X-GitHub-Event",
            description: "Type of GitHub event (only 'push' events are processed)",
            required: true,
          },
          {
            name: "X-GitHub-Delivery",
            description: "Unique ID for this webhook delivery",
            required: false,
          },
        ],
        events: ["push"],
        examplePayload: {
          ref: "refs/heads/main",
          repository: {
            id: 123456789,
            name: "my-website",
            full_name: "username/my-website",
            html_url: "https://github.com/username/my-website",
            default_branch: "main",
          },
          commits: [
            {
              id: "abcd1234efgh5678",
              message: "Update homepage layout",
              url: "https://github.com/username/my-website/commit/abcd1234efgh5678",
              added: ["new-page.html"],
              modified: ["index.html", "components/header.jsx"],
              removed: [],
              author: {
                name: "John Doe",
                email: "john@example.com",
              },
            },
          ],
          head_commit: {
            id: "abcd1234efgh5678",
            message: "Update homepage layout",
            url: "https://github.com/username/my-website/commit/abcd1234efgh5678",
            added: ["new-page.html"],
            modified: ["index.html", "components/header.jsx"],
            removed: [],
            author: {
              name: "John Doe",
              email: "john@example.com",
            },
          },
        },
      },
      genericWebhook: {
        url: "/webhook/generic",
        method: "POST",
        description: "Generic webhook endpoint for other Git providers (GitLab, Bitbucket, etc.)",
        examplePayload: {
          repository: {
            name: "my-website",
            url: "https://gitlab.com/username/my-website",
            branch: "main",
          },
          commits: [
            {
              id: "abcd1234efgh5678",
              message: "Update homepage layout",
              files: ["index.html", "components/header.vue"],
              author: {
                name: "John Doe",
                email: "john@example.com",
              },
            },
          ],
        },
      },
      setup: {
        github: [
          "1. Go to your repository Settings > Webhooks",
          "2. Click 'Add webhook'",
          "3. Set Payload URL to: https://your-app-domain.com/webhook/github",
          "4. Set Content type to: application/json",
          "5. Configure the secret in your Infrastructure tab as 'WebhookSecret'",
          "6. Select 'Just the push event'",
          "7. Ensure webhook is Active",
          "8. Click 'Add webhook'",
        ],
        generic: [
          "1. Configure your Git provider's webhook settings",
          "2. Set the webhook URL to: https://your-app-domain.com/webhook/generic",
          "3. Set the content type to JSON",
          "4. Configure push/commit events",
          "5. Ensure the payload includes repository and commit information",
          "6. Test the webhook integration",
        ],
      },
    };
  }
);
