import { SQLDatabase } from "encore.dev/storage/sqldb";

export const cacheDB = new SQLDatabase("ai-cache", {
  migrations: "./cache-migrations",
});

export interface CachedFix {
  issueHash: string;
  fixedCodeSnippet: string;
  createdAt: Date;
}

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

// Retrieve cached fix
export async function getCachedFix(issueHash: string): Promise<string | null> {
  const result = await cacheDB.queryRow<{ fixed_code_snippet: string }>`
    SELECT fixed_code_snippet
    FROM ai_fixes
    WHERE issue_hash = ${issueHash}
      AND created_at > ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)} -- Cache for 7 days
  `;
  
  return result?.fixed_code_snippet || null;
}

// Clean up old cache entries
export async function cleanupCache(): Promise<void> {
  await cacheDB.exec`
    DELETE FROM ai_fixes
    WHERE created_at < ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)} -- Remove entries older than 30 days
  `;
}
