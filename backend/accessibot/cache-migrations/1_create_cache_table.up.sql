CREATE TABLE ai_fixes (
  id BIGSERIAL PRIMARY KEY,
  issue_hash VARCHAR(255) UNIQUE NOT NULL,
  fixed_code_snippet TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_fixes_hash ON ai_fixes(issue_hash);
CREATE INDEX idx_ai_fixes_created_at ON ai_fixes(created_at);
