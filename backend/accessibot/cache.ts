import { SQLDatabase } from "encore.dev/storage/sqldb";

export const cacheDB = new SQLDatabase("ai-cache", {
  migrations: "./cache-migrations",
});

export interface CachedFix {
  issueHash: string;
  fixedCodeSnippet: string;
  createdAt: Date;
}

export interface CacheConfig {
  defaultTtlDays: number;
  cleanupIntervalDays: number;
  deepCleanupIntervalDays: number;
}

// Default cache configuration
export const defaultCacheConfig: CacheConfig = {
  defaultTtlDays: 7,        // Cache entries are valid for 7 days
  cleanupIntervalDays: 30,  // Regular cleanup removes entries older than 30 days
  deepCleanupIntervalDays: 7, // Deep cleanup removes entries older than 7 days
};

// Generate a hash for an issue to use as cache key
export function generateIssueHash(issue: {
  type: string;
  element: string;
  description: string;
}): string {
  const content = `${issue.type}|${issue.element}|${issue.description}`;
  // Simple hash function - in production you might want to use a crypto hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Store AI-generated fix in cache
export async function cacheFix(issueHash: string, fixedCodeSnippet: string): Promise<void> {
  await cacheDB.exec`
    INSERT INTO ai_fixes (issue_hash, fixed_code_snippet, created_at)
    VALUES (${issueHash}, ${fixedCodeSnippet}, ${new Date()})
    ON CONFLICT (issue_hash) DO UPDATE SET
      fixed_code_snippet = EXCLUDED.fixed_code_snippet,
      created_at = EXCLUDED.created_at
  `;
}

// Retrieve cached fix with configurable TTL
export async function getCachedFix(issueHash: string, config: CacheConfig = defaultCacheConfig): Promise<string | null> {
  const cutoffDate = new Date(Date.now() - config.defaultTtlDays * 24 * 60 * 60 * 1000);
  
  const result = await cacheDB.queryRow<{ fixed_code_snippet: string }>`
    SELECT fixed_code_snippet
    FROM ai_fixes
    WHERE issue_hash = ${issueHash}
      AND created_at > ${cutoffDate}
  `;
  
  return result?.fixed_code_snippet || null;
}

// Clean up old cache entries with configurable interval
export async function cleanupCache(config: CacheConfig = defaultCacheConfig): Promise<void> {
  const cutoffDate = new Date(Date.now() - config.cleanupIntervalDays * 24 * 60 * 60 * 1000);
  
  const result = await cacheDB.queryRow<{ count: string }>`
    SELECT COUNT(*) as count
    FROM ai_fixes
    WHERE created_at < ${cutoffDate}
  `;
  
  const entriesToDelete = parseInt(result?.count || '0');
  
  await cacheDB.exec`
    DELETE FROM ai_fixes
    WHERE created_at < ${cutoffDate}
  `;
  
  console.log(`Cache cleanup completed: removed ${entriesToDelete} entries older than ${config.cleanupIntervalDays} days`);
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  totalEntries: number;
  entriesLast24h: number;
  entriesLast7d: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}> {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalResult = await cacheDB.queryRow<{ count: string }>`
    SELECT COUNT(*) as count FROM ai_fixes
  `;

  const recent24hResult = await cacheDB.queryRow<{ count: string }>`
    SELECT COUNT(*) as count FROM ai_fixes WHERE created_at > ${last24h}
  `;

  const recent7dResult = await cacheDB.queryRow<{ count: string }>`
    SELECT COUNT(*) as count FROM ai_fixes WHERE created_at > ${last7d}
  `;

  const dateRangeResult = await cacheDB.queryRow<{ 
    oldest: Date | null; 
    newest: Date | null;
  }>`
    SELECT 
      MIN(created_at) as oldest,
      MAX(created_at) as newest
    FROM ai_fixes
  `;

  return {
    totalEntries: parseInt(totalResult?.count || '0'),
    entriesLast24h: parseInt(recent24hResult?.count || '0'),
    entriesLast7d: parseInt(recent7dResult?.count || '0'),
    oldestEntry: dateRangeResult?.oldest || null,
    newestEntry: dateRangeResult?.newest || null,
  };
}

// Custom cleanup with configurable interval (used by cron jobs)
export async function cleanupCacheCustom(intervalDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000);
  
  const result = await cacheDB.queryRow<{ count: string }>`
    SELECT COUNT(*) as count
    FROM ai_fixes
    WHERE created_at < ${cutoffDate}
  `;
  
  const entriesToDelete = parseInt(result?.count || '0');
  
  await cacheDB.exec`
    DELETE FROM ai_fixes
    WHERE created_at < ${cutoffDate}
  `;
  
  console.log(`Custom cache cleanup completed: removed ${entriesToDelete} entries older than ${intervalDays} days`);
  return entriesToDelete;
}
