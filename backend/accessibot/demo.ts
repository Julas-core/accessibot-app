import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";

const openAIKey = secret("OpenAIKey");
const anthropicKey = secret("AnthropicKey");
const googleKey = secret("GoogleKey");
const githubToken = secret("GitHubToken");

export interface DemoModeResponse {
  demoMode: boolean; // AI demo (no providers configured)
  githubDemo: boolean; // GitHub demo
  availableProviders: string[]; // List of configured AI providers
}

// Returns whether the app is running in demo mode for AI and GitHub, and lists available providers.
export const demoMode = api<void, DemoModeResponse>(
  { expose: true, method: "GET", path: "/demo-mode" },
  async () => {
    const availableProviders: string[] = [];
    let hasAnyProvider = false;
    
    // Check OpenAI
    try {
      const openai = openAIKey();
      if (openai && openai.trim() !== "") {
        availableProviders.push("OpenAI");
        hasAnyProvider = true;
      }
    } catch {
      // API key not configured
    }
    
    // Check Anthropic
    try {
      const anthropic = anthropicKey();
      if (anthropic && anthropic.trim() !== "") {
        availableProviders.push("Anthropic");
        hasAnyProvider = true;
      }
    } catch {
      // API key not configured
    }
    
    // Check Google
    try {
      const google = googleKey();
      if (google && google.trim() !== "") {
        availableProviders.push("Google");
        hasAnyProvider = true;
      }
    } catch {
      // API key not configured
    }

    // Check GitHub
    let ghDemo = false;
    try {
      const gh = githubToken();
      ghDemo = !gh || gh.trim() === "";
    } catch {
      ghDemo = true;
    }

    return { 
      demoMode: !hasAnyProvider, 
      githubDemo: ghDemo,
      availableProviders,
    };
  }
);
