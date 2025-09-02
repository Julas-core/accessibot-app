import { secret } from "encore.dev/config";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { AccessibilityIssue } from "./analyze";

const openAIKey = secret("OpenAIKey");
const anthropicKey = secret("AnthropicKey");
const googleKey = secret("GoogleKey");

export interface AIProvider {
  name: string;
  client: any;
  model: string;
  costPerToken: number; // Cost per 1000 tokens
  maxTokens: number;
  isAvailable: boolean;
  priority: number; // Lower number = higher priority
}

export interface ProviderConfig {
  individual: AIProvider[];
  batch: AIProvider[];
}

// Initialize AI providers
function initializeProviders(): ProviderConfig {
  const providers: AIProvider[] = [];

  // OpenAI Provider
  try {
    const openaiApiKey = openAIKey();
    if (openaiApiKey && openaiApiKey.trim() !== "") {
      providers.push({
        name: "OpenAI",
        client: createOpenAI({ apiKey: openaiApiKey }),
        model: "gpt-4o",
        costPerToken: 0.015, // $15 per 1M tokens
        maxTokens: 4096,
        isAvailable: true,
        priority: 1,
      });
      providers.push({
        name: "OpenAI-Mini",
        client: createOpenAI({ apiKey: openaiApiKey }),
        model: "gpt-4o-mini",
        costPerToken: 0.0015, // $1.5 per 1M tokens
        maxTokens: 16384,
        isAvailable: true,
        priority: 2,
      });
    }
  } catch (error) {
    console.warn("OpenAI provider not available:", error);
  }

  // Anthropic Provider
  try {
    const anthropicApiKey = anthropicKey();
    if (anthropicApiKey && anthropicApiKey.trim() !== "") {
      providers.push({
        name: "Anthropic",
        client: createAnthropic({ apiKey: anthropicApiKey }),
        model: "claude-3-5-sonnet-20241022",
        costPerToken: 0.015, // $15 per 1M tokens
        maxTokens: 8192,
        isAvailable: true,
        priority: 3,
      });
      providers.push({
        name: "Anthropic-Haiku",
        client: createAnthropic({ apiKey: anthropicApiKey }),
        model: "claude-3-5-haiku-20241022",
        costPerToken: 0.001, // $1 per 1M tokens
        maxTokens: 8192,
        isAvailable: true,
        priority: 4,
      });
    }
  } catch (error) {
    console.warn("Anthropic provider not available:", error);
  }

  // Google Provider
  try {
    const googleApiKey = googleKey();
    if (googleApiKey && googleApiKey.trim() !== "") {
      providers.push({
        name: "Google",
        client: createGoogleGenerativeAI({ apiKey: googleApiKey }),
        model: "gemini-1.5-pro",
        costPerToken: 0.0035, // $3.5 per 1M tokens
        maxTokens: 8192,
        isAvailable: true,
        priority: 5,
      });
      providers.push({
        name: "Google-Flash",
        client: createGoogleGenerativeAI({ apiKey: googleApiKey }),
        model: "gemini-1.5-flash",
        costPerToken: 0.000375, // $0.375 per 1M tokens
        maxTokens: 8192,
        isAvailable: true,
        priority: 6,
      });
    }
  } catch (error) {
    console.warn("Google provider not available:", error);
  }

  // Sort by priority (lower number = higher priority)
  providers.sort((a, b) => a.priority - b.priority);

  return {
    individual: providers,
    batch: providers.filter(p => ["OpenAI", "Anthropic", "Google"].includes(p.name)),
  };
}

export interface ProviderSelection {
  provider: AIProvider;
  estimatedCost: number;
  reason: string;
}

export class AIProviderManager {
  private providers: ProviderConfig;
  private providerStats: Map<string, { successes: number; failures: number; totalCost: number }>;

  constructor() {
    this.providers = initializeProviders();
    this.providerStats = new Map();
    
    // Initialize stats for each provider
    [...this.providers.individual, ...this.providers.batch].forEach(provider => {
      if (!this.providerStats.has(provider.name)) {
        this.providerStats.set(provider.name, { successes: 0, failures: 0, totalCost: 0 });
      }
    });
  }

  getAvailableProviders(): { individual: AIProvider[]; batch: AIProvider[] } {
    return {
      individual: this.providers.individual.filter(p => p.isAvailable),
      batch: this.providers.batch.filter(p => p.isAvailable),
    };
  }

  // Select the most cost-effective provider for a given task
  selectProvider(
    type: "individual" | "batch",
    estimatedTokens: number,
    complexity: "simple" | "medium" | "complex" = "medium"
  ): ProviderSelection | null {
    const availableProviders = type === "individual" 
      ? this.providers.individual.filter(p => p.isAvailable)
      : this.providers.batch.filter(p => p.isAvailable);

    if (availableProviders.length === 0) {
      return null;
    }

    // Filter providers based on complexity and token requirements
    let suitableProviders = availableProviders.filter(provider => {
      // Check if provider can handle the token requirement
      if (estimatedTokens > provider.maxTokens) {
        return false;
      }

      // For simple tasks, prefer cheaper models
      if (complexity === "simple") {
        return provider.name.includes("Mini") || 
               provider.name.includes("Haiku") || 
               provider.name.includes("Flash");
      }

      // For complex tasks, ensure we have capable models
      if (complexity === "complex") {
        return !provider.name.includes("Mini") && 
               !provider.name.includes("Flash");
      }

      // Medium complexity can use any provider
      return true;
    });

    // If no suitable providers, fall back to any available
    if (suitableProviders.length === 0) {
      suitableProviders = availableProviders;
    }

    // Calculate cost and reliability score for each provider
    const scoredProviders = suitableProviders.map(provider => {
      const stats = this.providerStats.get(provider.name) || { successes: 0, failures: 0, totalCost: 0 };
      const totalRequests = stats.successes + stats.failures;
      const successRate = totalRequests > 0 ? stats.successes / totalRequests : 0.5; // Default to 50% for new providers
      
      const estimatedCost = (estimatedTokens / 1000) * provider.costPerToken;
      
      // Score combines cost efficiency and reliability
      // Lower score is better
      const reliabilityPenalty = (1 - successRate) * 10; // Penalize unreliable providers
      const costScore = estimatedCost + reliabilityPenalty;
      
      return {
        provider,
        estimatedCost,
        successRate,
        score: costScore,
      };
    });

    // Sort by score (lower is better)
    scoredProviders.sort((a, b) => a.score - b.score);
    
    const selected = scoredProviders[0];
    
    let reason = `Selected ${selected.provider.name} for ${type} request`;
    if (complexity === "simple") {
      reason += " (optimized for simple task)";
    } else if (complexity === "complex") {
      reason += " (optimized for complex task)";
    }
    reason += ` - Estimated cost: $${selected.estimatedCost.toFixed(6)}`;
    reason += ` - Success rate: ${(selected.successRate * 100).toFixed(1)}%`;

    return {
      provider: selected.provider,
      estimatedCost: selected.estimatedCost,
      reason,
    };
  }

  // Execute AI request with automatic fallback
  async executeWithFallback(
    type: "individual" | "batch",
    prompt: string,
    maxTokens: number,
    complexity: "simple" | "medium" | "complex" = "medium"
  ): Promise<{ text: string; provider: string; cost: number }> {
    const estimatedInputTokens = Math.ceil(prompt.length / 4); // Rough estimate: 4 chars per token
    const totalEstimatedTokens = estimatedInputTokens + maxTokens;

    const availableProviders = type === "individual" 
      ? this.providers.individual.filter(p => p.isAvailable)
      : this.providers.batch.filter(p => p.isAvailable);

    if (availableProviders.length === 0) {
      throw new Error("No AI providers available");
    }

    // Try providers in order of cost-effectiveness
    for (let attempt = 0; attempt < Math.min(3, availableProviders.length); attempt++) {
      const selection = this.selectProvider(type, totalEstimatedTokens, complexity);
      if (!selection) {
        throw new Error("No suitable AI provider found");
      }

      const { provider } = selection;
      
      try {
        console.log(`Attempting AI request with ${provider.name}: ${selection.reason}`);
        
        const startTime = Date.now();
        const response = await generateText({
          model: provider.client(provider.model),
          prompt,
          maxTokens,
        });
        const duration = Date.now() - startTime;

        // Estimate actual cost based on response
        const outputTokens = Math.ceil(response.text.length / 4);
        const actualCost = ((estimatedInputTokens + outputTokens) / 1000) * provider.costPerToken;

        // Update provider stats
        const stats = this.providerStats.get(provider.name)!;
        stats.successes++;
        stats.totalCost += actualCost;

        console.log(`AI request successful with ${provider.name} (${duration}ms, $${actualCost.toFixed(6)})`);

        return {
          text: response.text,
          provider: provider.name,
          cost: actualCost,
        };
      } catch (error) {
        console.error(`AI request failed with ${provider.name}:`, error);
        
        // Update provider stats
        const stats = this.providerStats.get(provider.name)!;
        stats.failures++;

        // Mark provider as temporarily unavailable if it fails too much
        if (stats.failures > stats.successes * 2 && stats.failures > 3) {
          console.warn(`Temporarily disabling ${provider.name} due to high failure rate`);
          provider.isAvailable = false;
          
          // Re-enable after 5 minutes
          setTimeout(() => {
            provider.isAvailable = true;
            console.log(`Re-enabled ${provider.name}`);
          }, 5 * 60 * 1000);
        }

        // If this is the last attempt, throw the error
        if (attempt === Math.min(2, availableProviders.length - 1)) {
          throw error;
        }
      }
    }

    throw new Error("All AI providers failed");
  }

  // Get provider statistics
  getProviderStats(): Array<{
    name: string;
    isAvailable: boolean;
    successRate: number;
    totalRequests: number;
    totalCost: number;
    costPerToken: number;
  }> {
    const allProviders = [...this.providers.individual, ...this.providers.batch];
    const uniqueProviders = Array.from(new Set(allProviders.map(p => p.name)))
      .map(name => allProviders.find(p => p.name === name)!);

    return uniqueProviders.map(provider => {
      const stats = this.providerStats.get(provider.name) || { successes: 0, failures: 0, totalCost: 0 };
      const totalRequests = stats.successes + stats.failures;
      const successRate = totalRequests > 0 ? stats.successes / totalRequests : 0;

      return {
        name: provider.name,
        isAvailable: provider.isAvailable,
        successRate,
        totalRequests,
        totalCost: stats.totalCost,
        costPerToken: provider.costPerToken,
      };
    });
  }

  // Reset provider availability (useful for manual recovery)
  resetProviderAvailability(): void {
    [...this.providers.individual, ...this.providers.batch].forEach(provider => {
      provider.isAvailable = true;
    });
  }

  // Check if any providers are available
  hasAvailableProviders(): boolean {
    return this.providers.individual.some(p => p.isAvailable) || 
           this.providers.batch.some(p => p.isAvailable);
  }

  // Refresh provider configuration (useful for detecting new API keys)
  refreshProviders(): void {
    this.providers = initializeProviders();
    console.log("AI providers refreshed");
  }
}

// Export singleton instance
export const aiProviderManager = new AIProviderManager();
