import { api } from "encore.dev/api";
import { getProviderStats, resetProviderAvailability, refreshProviders } from "./ai-service";

export interface ProviderStatsResponse {
  providers: Array<{
    name: string;
    isAvailable: boolean;
    successRate: number;
    totalRequests: number;
    totalCost: number;
    costPerToken: number;
  }>;
  totalCost: number;
  totalRequests: number;
  overallSuccessRate: number;
}

export interface ProviderActionResponse {
  success: boolean;
  message: string;
}

// Get comprehensive provider statistics
export const getProviderStatsEndpoint = api<void, ProviderStatsResponse>(
  { expose: true, method: "GET", path: "/providers/stats" },
  async () => {
    const providers = getProviderStats();
    
    const totalCost = providers.reduce((sum, p) => sum + p.totalCost, 0);
    const totalRequests = providers.reduce((sum, p) => sum + p.totalRequests, 0);
    const totalSuccesses = providers.reduce((sum, p) => sum + (p.totalRequests * p.successRate), 0);
    const overallSuccessRate = totalRequests > 0 ? totalSuccesses / totalRequests : 0;

    return {
      providers,
      totalCost,
      totalRequests,
      overallSuccessRate,
    };
  }
);

// Reset provider availability (re-enable disabled providers)
export const resetProvidersEndpoint = api<void, ProviderActionResponse>(
  { expose: true, method: "POST", path: "/providers/reset" },
  async () => {
    try {
      resetProviderAvailability();
      return {
        success: true,
        message: "All providers have been reset and re-enabled",
      };
    } catch (error) {
      console.error("Failed to reset providers:", error);
      return {
        success: false,
        message: `Failed to reset providers: ${error}`,
      };
    }
  }
);

// Refresh provider configuration (detect new API keys)
export const refreshProvidersEndpoint = api<void, ProviderActionResponse>(
  { expose: true, method: "POST", path: "/providers/refresh" },
  async () => {
    try {
      refreshProviders();
      return {
        success: true,
        message: "Provider configuration has been refreshed",
      };
    } catch (error) {
      console.error("Failed to refresh providers:", error);
      return {
        success: false,
        message: `Failed to refresh providers: ${error}`,
      };
    }
  }
);
