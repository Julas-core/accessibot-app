# AccessiBot

🤖 **The open-source alternative to costly accessibility tools**

AccessiBot is the open-source alternative to costly accessibility tools like Axe Pro and Siteimprove. It goes beyond reporting by using AI to suggest and even apply fixes via GitHub PRs. Built on the Encore framework, AccessiBot provides comprehensive accessibility auditing with intelligent caching and automated fix deployment.

## ✨ Why Choose AccessiBot?

### 💰 **Cost-Effective Alternative**
- **Open Source & Free**: No licensing fees like Axe Pro ($3,000+/year) or Siteimprove ($10,000+/year)
- **Self-Hosted**: Complete control over your data and infrastructure
- **Unlimited Scans**: No per-page or per-user limitations

### 🚀 **Beyond Traditional Tools**
- **AI-Powered Fixes**: Not just detection - get intelligent fix suggestions
- **Automated Remediation**: Apply fixes directly via GitHub pull requests
- **Developer-Friendly**: Integrates seamlessly into your existing workflow

## ✨ Features

### 🔍 **Comprehensive Accessibility Analysis**
- **URL & HTML Analysis**: Analyze live websites or raw HTML content
- **Multi-severity Issue Detection**: Categorizes issues as high, medium, or low priority
- **Common Issue Detection**: 
  - Missing alt text for images
  - Non-descriptive link text
  - Missing form labels
  - Improper heading hierarchy
  - Missing page titles and language attributes

### 🤖 **AI-Powered Automated Fixes**
- **Smart Fix Generation**: GPT-4 powered intelligent remediation suggestions
- **GitHub Integration**: Automatically create pull requests with accessibility fixes
- **Batch Processing**: Apply multiple fixes across files in a single PR
- **Context-Aware Solutions**: AI understands your codebase and provides relevant fixes

### ⚡ **Intelligent Caching System**
- **Fix Caching**: AI-generated fixes are cached to reduce costs and improve performance
- **Configurable TTL**: Customizable cache lifetime (default: 7 days)
- **Automatic Cleanup**: Background jobs clean up expired cache entries
- **Cache Statistics**: Real-time insights into cache performance

### 📊 **AccessiBot vs Commercial Tools**

| Feature | AccessiBot | Axe Pro | Siteimprove |
|---------|------------|---------|-------------|
| **Cost** | Free & Open Source | $3,000+/year | $10,000+/year |
| **AI-Powered Fixes** | ✅ GPT-4 Integration | ❌ Manual Only | ❌ Manual Only |
| **GitHub Integration** | ✅ Auto PR Creation | ❌ No Integration | ❌ No Integration |
| **Self-Hosted** | ✅ Full Control | ❌ Cloud Only | ❌ Cloud Only |
| **Unlimited Scans** | ✅ No Restrictions | ❌ Per-page Limits | ❌ Per-page Limits |
| **Custom Deployment** | ✅ Docker Support | ❌ SaaS Only | ❌ SaaS Only |

### 🔄 **Rate Limiting & Performance**
- **Smart Rate Limiting**: Protects against API overuse with configurable limits
- **Priority-Based Processing**: High-severity issues get processed first
- **Performance Monitoring**: Tracks response times and adjusts processing accordingly

### 🐙 **GitHub Integration**
- **Pull Request Creation**: Automatically create PRs with accessibility fixes
- **Repository Listing**: Browse your accessible GitHub repositories
- **Batch Fixes**: Apply multiple fixes across files in a single PR
- **Detailed PR Descriptions**: Generated descriptions with issue summaries

### 📊 **Real-time Monitoring**
- **Cache Status Dashboard**: Monitor cache hit rates and performance
- **Batch Processing Stats**: Track AI request efficiency
- **Rate Limit Monitoring**: Real-time API usage tracking

## 🏗️ Architecture

AccessiBot follows a modern full-stack architecture:

- **Backend**: TypeScript with Encore framework
  - RESTful API endpoints
  - SQLite databases for caching and rate limiting
  - OpenAI integration for AI-powered fixes
  - GitHub API integration
  - Background cron jobs for maintenance

- **Frontend**: React with TypeScript
  - Vite build system
  - TailwindCSS for styling
  - Radix UI components
  - React Query for state management
  - Modern responsive design

## 🚀 Quick Start

### Prerequisites

1. **Encore CLI**: Install the Encore development environment
   ```bash
   # macOS
   brew install encoredev/tap/encore
   
   # Linux
   curl -L https://encore.dev/install.sh | bash
   
   # Windows
   iwr https://encore.dev/install.ps1 | iex
   ```

2. **Bun Package Manager**:
   ```bash
   npm install -g bun
   ```

3. **OpenAI API Key**: Required for AI-powered fix suggestions
4. **GitHub Token** (Optional): For GitHub integration features

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd accessibot-app-main
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Configure environment**:
   - Set up your OpenAI API key in the Encore secrets
   - (Optional) Configure GitHub token for repository integration

4. **Start the backend**:
   ```bash
   cd backend
   encore run
   ```
   Backend will be available at `http://localhost:4000`

5. **Start the frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npx vite dev
   ```
   Frontend will be available at `http://localhost:5173`

### Generate Frontend Client

Generate the TypeScript client for the backend API:

```bash
cd backend
encore gen client --target leap
```

## 🔧 Configuration

### Environment Variables

Set these secrets in your Encore environment:

- `OpenAIKey`: Your OpenAI API key for AI-powered fix suggestions
- `GitHubToken` (Optional): GitHub personal access token for repository integration

### Cache Configuration

Customize caching behavior by modifying the cache configuration:

```typescript
export const cacheConfig: CacheConfig = {
  defaultTtlDays: 7,        // Cache validity period
  cleanupIntervalDays: 30,  // Regular cleanup interval
  deepCleanupIntervalDays: 7, // Deep cleanup interval
};
```

### Rate Limiting

Configure AI API rate limiting:

```typescript
const batchProcessorConfig: BatchProcessorConfig = {
  initialBatchSize: 3,
  minBatchSize: 1,
  maxBatchSize: 8,
  initialDelayMs: 2000,
  targetResponseTimeMs: 15000,
  maxErrorRate: 0.2,
};
```

## 📖 Usage

### Web Interface

1. **Choose Input Method**: 
   - Enter a website URL to analyze
   - Or paste HTML content directly

2. **Run Analysis**: 
   - Click "Analyze Accessibility" to start the scan
   - View real-time progress and cache statistics

3. **Review Results**:
   - Browse detected issues by severity level
   - View AI-generated fix suggestions
   - Copy improved code snippets

4. **GitHub Integration** (Optional):
   - Select a repository from your GitHub account
   - Create pull requests with batch fixes
   - Track PR status and merge accessibility improvements

### API Endpoints

#### Analyze Content
```bash
POST /analyze
{
  "url": "https://example.com"  // OR "html": "<html>...</html>"
}
```

#### GitHub Integration
```bash
GET /github/repositories
POST /github/pull-request
```

#### Cache Management
```bash
GET /cache/stats
POST /cache/cleanup
```

## 🚀 Deployment

### Encore Cloud Platform

1. **Authenticate**:
   ```bash
   encore auth login
   ```

2. **Add remote**:
   ```bash
   git remote add encore encore://accessibot-app-rvr2
   ```

3. **Deploy**:
   ```bash
   git add -A .
   git commit -m "Deploy to Encore Cloud"
   git push encore
   ```

### Self-Hosting with Docker

Build and deploy using Docker:

```bash
encore build docker
```

See [Encore's self-hosting documentation](https://encore.dev/docs/self-host/docker-build) for detailed instructions.

### GitHub Integration (Recommended)

For production environments, connect your GitHub repository:

1. Open the [Encore Cloud dashboard](https://app.encore.dev/accessibot-app-rvr2/deploys)
2. Navigate to GitHub Integration settings
3. Connect your GitHub account
4. Enable automatic deployments on push

## 🛠️ Development

### Project Structure

```
accessibot-app-main/
├── backend/
│   ├── accessibot/           # Core backend services
│   │   ├── analyze.ts        # Main analysis engine
│   │   ├── ai-service.ts     # OpenAI integration
│   │   ├── cache.ts          # Intelligent caching
│   │   ├── rate-limiter.ts   # Rate limiting system
│   │   ├── github.ts         # GitHub integration
│   │   └── *.ts              # Additional services
│   └── frontend/             # Static file serving
├── frontend/
│   ├── components/           # React components
│   │   ├── ui/              # Reusable UI components
│   │   ├── AccessibilityAnalyzer.tsx
│   │   ├── GitHubIntegration.tsx
│   │   └── CacheStatus.tsx
│   ├── App.tsx              # Main application
│   └── *.ts                 # Configuration files
└── package.json             # Workspace configuration
```

### Key Technologies

- **Backend**: Encore framework, TypeScript, SQLite
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS
- **AI**: OpenAI GPT-4 integration
- **UI**: Radix UI components, Lucide icons
- **State Management**: TanStack Query (React Query)
- **Styling**: TailwindCSS with custom animations

### Development Workflow

1. **Backend Development**: Use `encore run` for hot reloading
2. **Frontend Development**: Use `npx vite dev` for instant updates
3. **API Changes**: Regenerate client with `encore gen client`
4. **Database Changes**: Add migrations to appropriate directories

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Maintain comprehensive error handling
- Add JSDoc comments for public APIs
- Update documentation for new features
- Test accessibility improvements

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🆘 Support

- **Documentation**: [Encore Docs](https://encore.dev/docs)
- **GitHub Issues**: Report bugs and request features
- **Community**: Join the Encore community for support

## 🙏 Acknowledgments

- **Encore Framework**: For the robust backend infrastructure
- **OpenAI**: For powerful AI-driven accessibility insights
- **React & Vite**: For the modern frontend development experience
- **Accessibility Community**: For ongoing efforts to make the web accessible to everyone

---

**Made with ❤️ by the AccessiBot team**

*Making the web more accessible, one fix at a time.*
