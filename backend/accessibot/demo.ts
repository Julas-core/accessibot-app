import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";

const openAIKey = secret("OpenAIKey");
const anthropicKey = secret("AnthropicKey");
const googleKey = secret("GoogleKey");
const githubToken = secret("GitHubToken");
const figmaToken = secret("FigmaToken");
const sketchToken = secret("SketchToken");
const adobeXDToken = secret("AdobeXDToken");

export interface DemoModeResponse {
  demoMode: boolean; // AI demo (no providers configured)
  githubDemo: boolean; // GitHub demo
  designToolsDemo: boolean; // Design tools demo
  availableProviders: string[]; // List of configured AI providers
  connectedDesignTools: string[]; // List of connected design tools
}

// Returns whether the app is running in demo mode for various integrations.
export const demoMode = api<void, DemoModeResponse>(
  { expose: true, method: "GET", path: "/demo-mode" },
  async () => {
    const availableProviders: string[] = [];
    const connectedDesignTools: string[] = [];
    let hasAnyProvider = false;
    let hasAnyDesignTool = false;
    
    // Check AI Providers
    try {
      const openai = openAIKey();
      if (openai && openai.trim() !== "") {
        availableProviders.push("OpenAI");
        hasAnyProvider = true;
      }
    } catch {
      // API key not configured
    }
    
    try {
      const anthropic = anthropicKey();
      if (anthropic && anthropic.trim() !== "") {
        availableProviders.push("Anthropic");
        hasAnyProvider = true;
      }
    } catch {
      // API key not configured
    }
    
    try {
      const google = googleKey();
      if (google && google.trim() !== "") {
        availableProviders.push("Google");
        hasAnyProvider = true;
      }
    } catch {
      // API key not configured
    }

    // Check Design Tools
    try {
      const figma = figmaToken();
      if (figma && figma.trim() !== "") {
        connectedDesignTools.push("Figma");
        hasAnyDesignTool = true;
      }
    } catch {
      // API key not configured
    }

    try {
      const sketch = sketchToken();
      if (sketch && sketch.trim() !== "") {
        connectedDesignTools.push("Sketch");
        hasAnyDesignTool = true;
      }
    } catch {
      // API key not configured
    }

    try {
      const adobeXD = adobeXDToken();
      if (adobeXD && adobeXD.trim() !== "") {
        connectedDesignTools.push("Adobe XD");
        hasAnyDesignTool = true;
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
      designToolsDemo: !hasAnyDesignTool,
      availableProviders,
      connectedDesignTools,
    };
  }
);
