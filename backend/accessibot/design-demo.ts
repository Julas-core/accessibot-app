import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";

const figmaToken = secret("FigmaToken");
const sketchToken = secret("SketchToken");
const adobeXDToken = secret("AdobeXDToken");

export interface DesignIntegrationStatus {
  figma: {
    connected: boolean;
    available: boolean;
  };
  sketch: {
    connected: boolean;
    available: boolean;
  };
  adobeXD: {
    connected: boolean;
    available: boolean;
  };
}

// Returns the connection status for design tool integrations.
export const getDesignIntegrationStatus = api<void, DesignIntegrationStatus>(
  { expose: true, method: "GET", path: "/design/status" },
  async () => {
    const checkConnection = (tokenFn: () => string): boolean => {
      try {
        const token = tokenFn();
        return !!(token && token.trim() !== "");
      } catch {
        return false;
      }
    };

    return {
      figma: {
        connected: checkConnection(figmaToken),
        available: true, // Always available for demo
      },
      sketch: {
        connected: checkConnection(sketchToken),
        available: true, // Always available for demo
      },
      adobeXD: {
        connected: checkConnection(adobeXDToken),
        available: true, // Always available for demo
      },
    };
  }
);
