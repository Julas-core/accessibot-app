CREATE TABLE webhook_analyses (
  id BIGSERIAL PRIMARY KEY,
  webhook_id VARCHAR(255) UNIQUE NOT NULL,
  repository_full_name VARCHAR(255) NOT NULL,
  commit_sha VARCHAR(255) NOT NULL,
  analysis_status VARCHAR(50) NOT NULL CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  issues_found INTEGER NOT NULL DEFAULT 0,
  high_severity_issues INTEGER NOT NULL DEFAULT 0,
  medium_severity_issues INTEGER NOT NULL DEFAULT 0,
  low_severity_issues INTEGER NOT NULL DEFAULT 0,
  pull_request_url TEXT,
  pull_request_created BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_webhook_analyses_webhook_id ON webhook_analyses(webhook_id);
CREATE INDEX idx_webhook_analyses_repository ON webhook_analyses(repository_full_name);
CREATE INDEX idx_webhook_analyses_status ON webhook_analyses(analysis_status);
CREATE INDEX idx_webhook_analyses_created_at ON webhook_analyses(created_at DESC);
