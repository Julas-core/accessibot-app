import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";

const openAIKey = secret("OpenAIKey");
const githubToken = secret("GitHubToken");

export interface DemoModeResponse {
  demoMode: boolean; // OpenAI demo
  githubDemo: boolean; // GitHub demo
}

// Returns whether the app is running in demo mode for OpenAI and GitHub.
export const demoMode = api<void, DemoModeResponse>(
  { expose: true, method: "GET", path: "/demo-mode" },
  async () => {
    let aiDemo = false;
    let ghDemo = false;
    try {
      const k = openAIKey();
      aiDemo = !k || k.trim() === "";
    } catch {
      aiDemo = true;
    }
    try {
      const g = githubToken();
      ghDemo = !g || g.trim() === "";
    } catch {
      ghDemo = true;
    }
    return { demoMode: aiDemo, githubDemo: ghDemo };
  }
);
