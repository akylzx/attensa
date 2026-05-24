# Attensa
> AI-powered desktop application for analyzing and improving focus during work sessions

## Overview

Attensa is a desktop productivity tool that helps people to understand and optimize their focus. By passively tracking active windows and applications during focused work sessions, Attensa provides deep analytics on attention quality, context switching behavior, and productivity trends—all powered by AI-generated insights.

Unlike simple time trackers, Attensa analyzes the *quality* of your focus through metrics like fragmentation scores, context block analysis, and recovery time measurements, then uses Google Gemini AI to provide actionable, data-driven recommendations for improvement.

## Key Features
### Intelligent Session Tracking
- **Real-time Window Monitoring**: Automatically tracks active applications and windows every second
- **Browser Tab Detection**: Extracts actual website names from browser tabs (macOS via AppleScript)
- **Idle Detection**: Automatically identifies when you step away from your computer
- **Flexible Durations**: Choose from preset focus times (25/50/90 min) or set custom durations (1-480 min)

### Advanced Focus Analytics
- **Focus Fragmentation Score**: Weighted algorithm analyzing switch frequency, entropy, and attention span
- **Context Block Analysis**: Groups related app usage into meaningful "focus blocks" and tracks interruptions
- **Recovery Time Metrics**: Measures how long it takes to return to your primary context after distractions
- **Session Quality Scoring**: Comprehensive 0-100 attention score based on multiple behavioral factors

### AI-Powered Insights
- **Session-Level Recommendations**: Get 3-5 specific, actionable insights after each focus session
- **Monthly Recaps**: AI-generated summaries of productivity trends, top apps, and systemic patterns
- **Neutral, Data-Driven Analysis**: Factual recommendations across categories like Process, Environment, Timing, and Tooling
- **Multi-Model Support**: Integrates with Google Gemini and Anthropic Claude APIs

### Gamification & Motivation
- **Streak Tracking**: Visual flame indicator with intensity levels based on consistency
- **Attention Score**: Rolling 7-day average of session quality
- **Daily Focus Counter**: Track total focused hours per day
- **Session Badges**: Quality indicators for completed sessions

### Data Visualization
- **Session Timeline Charts**: Visual breakdown of application usage during focus sessions
- **Monthly Trend Graphs**: Track focus quality improvements over time
- **Recent Sessions Dashboard**: Quick access to your last 10 sessions with key metrics
- **Interactive History**: Filter and sort through all past sessions

## Technology Stack

### Frontend
- **React 19** - Modern UI framework with latest features
- **React Router DOM 7** - Client-side routing
- **Tailwind CSS 4** - Utility-first styling with custom design system
- **Zustand 5** - Lightweight state management
- **Recharts 2** - Responsive data visualization

### Desktop Framework
- **Electron 34** - Cross-platform desktop application framework
- **Electron Forge 7** - Build tooling and packaging
- **Vite 6** - Lightning-fast development and build system

### Backend & Database
- **SQLite** with **better-sqlite3** - Local, performant database
- **Drizzle ORM** - Type-safe database operations
- **IPC Architecture** - Secure communication between main and renderer processes

### AI Integration
- **Google Generative AI** (@google/genai) - Primary AI provider for insights
- **Anthropic Claude SDK** - Alternative AI model support

### System Integration
- **active-win 8** - Native window tracking for macOS/Windows
- **Electron powerMonitor** - System idle detection
- **AppleScript** - Browser tab extraction on macOS

## Project Structure

```
attensa/
├── apps/
│   └── desktop/                      # Main Electron application
│       ├── src/
│       │   ├── main/                 # Electron main process
│       │   │   ├── index.ts          # Application entry point
│       │   │   ├── ipc.ts            # IPC handler definitions
│       │   │   ├── tray.ts           # System tray integration
│       │   │   ├── tracker/          # Session tracking system
│       │   │   │   ├── window-tracker.ts      # Active window polling
│       │   │   │   ├── session-manager.ts     # Session lifecycle
│       │   │   │   ├── idle-detector.ts       # Idle time detection
│       │   │   │   └── browser-tab-resolver.ts # Browser URL extraction
│       │   │   ├── db/               # Database layer
│       │   │   │   ├── schema.ts     # Drizzle ORM schema
│       │   │   │   ├── queries.ts    # Database operations
│       │   │   │   └── connection.ts # SQLite setup
│       │   │   ├── analytics/        # Focus analysis engine
│       │   │   │   ├── metrics-calculator.ts  # Session metrics
│       │   │   │   ├── context-grouper.ts     # Context block grouping
│       │   │   │   └── recovery-detector.ts   # Interruption analysis
│       │   │   └── services/         # External integrations
│       │   │       ├── ai-client.ts           # AI provider client
│       │   │       └── settings-store.ts      # Persistent settings
│       │   ├── preload/              # Preload script (IPC bridge)
│       │   └── renderer/             # React frontend
│       │       ├── App.tsx           # Main router component
│       │       ├── pages/            # Route components
│       │       ├── components/       # Reusable UI components
│       │       └── stores/           # Zustand state stores
│       ├── forge.config.ts           # Electron Forge configuration
│       ├── vite.*.config.ts          # Vite build configs
│       └── package.json
├── packages/
│   └── shared/                       # Shared types and utilities
│       ├── src/
│       │   ├── types/                # TypeScript interfaces
│       │   ├── constants/            # Shared constants
│       │   └── utils/                # Shared utilities
│       └── package.json
├── tsconfig.base.json                # Root TypeScript config
└── package.json                      # Workspace root
```

## Getting Started

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- macOS or Windows (Linux not currently supported)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/attensa.git
cd attensa
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file in apps/desktop/
echo "GEMINI_API_KEY=your_api_key_here" > apps/desktop/.env
```

4. Start the development server:
```bash
npm run dev
```

### Building for Production

```bash
# Build all packages
npm run build

# Create distributable
npm run package

# Outputs will be in apps/desktop/out/
```

## How It Works

### 1. Session Initialization
When you start a focus session, Attensa:
- Records your planned duration and target focus area
- Begins polling the active window every 1000ms
- Starts tracking idle time via system power monitoring

### 2. Real-Time Tracking
During the session:
- Each window change is recorded as an "app event" with timestamp, app name, and window title
- Browser tabs are intelligently extracted (e.g., "GitHub" instead of "Google Chrome")
- Events are buffered in memory and flushed to SQLite every 10 seconds for performance
- The app itself (Attensa) is excluded from tracking to prevent recursion

### 3. Context Analysis
When the session ends, the analytics engine:
- Groups related app events into "context blocks" using time-based clustering
- Calculates the focus fragmentation score (0-100) based on:
  - **Switch frequency** (40% weight): How often you changed applications
  - **Entropy** (30% weight): Distribution uniformity across apps
  - **Short stint ratio** (30% weight): Percentage of time in <60s bursts
- Identifies interrupted contexts and measures recovery time
- Computes aggregate metrics: total focus time, app switch count, idle time, etc.

### 4. AI Insight Generation
Post-session:
- Session data is formatted into a structured prompt
- Google Gemini API analyzes patterns and generates 3-5 recommendations
- Insights are categorized (Process, Environment, Timing, Tooling)
- Neutral, actionable advice is stored with the session for future reference

### 5. Long-Term Trends
Monthly:
- Aggregated statistics are computed across all sessions
- Top apps, interruption sources, and focus trends are identified
- AI generates a comprehensive monthly recap with strategic recommendations

## Database Schema

Attensa uses SQLite with Drizzle ORM for type-safe database operations:

### Tables
- **sessions**: Core session records with metrics and AI insights
- **app_events**: Raw timestamped window activity data
- **context_blocks**: Grouped focus periods with interruption tracking
- **monthly_summaries**: Aggregated monthly analytics and recaps

All data is stored locally on your machine with no cloud sync (privacy-first design).

## Key Algorithms

### Focus Fragmentation Score
```typescript
fragmentation =
  (0.4 × normalized_switch_frequency) +
  (0.3 × entropy_score) +
  (0.3 × short_stint_ratio)
```

### Context Block Grouping
Uses DBSCAN-inspired clustering with a 60-second time threshold to group related app usage into meaningful focus blocks.

### Recovery Time Calculation
Measures the time elapsed between leaving a primary context (interrupted) and returning to it, providing insights into distraction cost.

## Privacy & Security

- **Local-First**: All data stored in local SQLite database
- **No Telemetry**: No usage data sent to external servers
- **API Keys Encrypted**: Stored securely in system keychain
- **Context Isolation**: Electron security best practices enforced
- **User Consent**: Explicit privacy consent during onboarding

## Configuration

### Settings (UI)
- AI Provider selection (Gemini/Claude)
- API key management
- Theme toggle (light/dark)
- Data export/import

### Advanced (Code)
- Polling interval: `apps/desktop/src/main/tracker/window-tracker.ts`
- Idle threshold: `apps/desktop/src/main/tracker/idle-detector.ts`
- Buffer flush interval: `apps/desktop/src/main/tracker/session-manager.ts`

## Roadmap

- [ ] Cross-platform support for Linux
- [ ] Custom focus categories and goals
- [ ] Team/organization analytics (optional cloud sync)
- [ ] Calendar integration for automatic session scheduling
- [ ] Pomodoro timer integration
- [ ] Weekly email digests
- [ ] Export to CSV/PDF

## Contributing

Contributions are welcome. Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License. See `LICENSE` file for details.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- UI components inspired by modern productivity tools
- AI insights powered by Google Gemini and Anthropic Claude

---

**Built by [Your Name]** | [Portfolio](https://yourwebsite.com) | [LinkedIn](https://linkedin.com/in/yourprofile)

For questions or feedback, please open an issue or contact [your.email@example.com]
