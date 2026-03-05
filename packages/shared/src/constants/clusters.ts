export type ClusterCategory = 'productive' | 'communication' | 'entertainment' | 'utility';

export interface AppCluster {
  id: string;
  name: string;
  category: ClusterCategory;
  bundleIds: string[];
  exeNames: string[];
  appNamePatterns: string[];
}

export const DEFAULT_CLUSTERS: AppCluster[] = [
  {
    id: 'development',
    name: 'Development',
    category: 'productive',
    bundleIds: [
      'com.microsoft.VSCode',
      'com.jetbrains.intellij',
      'com.apple.Terminal',
      'com.googlecode.iterm2',
      'dev.warp.Warp-Stable',
      'com.todesktop.230313mzl4w4u92',
    ],
    exeNames: ['Code.exe', 'idea64.exe', 'WindowsTerminal.exe', 'wt.exe'],
    appNamePatterns: ['Visual Studio Code', 'IntelliJ', 'Terminal', 'iTerm', 'WebStorm', 'Cursor', 'Warp', 'PyCharm'],
  },
  {
    id: 'design',
    name: 'Design',
    category: 'productive',
    bundleIds: ['com.figma.Desktop', 'com.bohemiancoding.sketch3'],
    exeNames: ['Figma.exe'],
    appNamePatterns: ['Figma', 'Sketch', 'Adobe XD', 'Canva'],
  },
  {
    id: 'writing',
    name: 'Writing',
    category: 'productive',
    bundleIds: ['com.apple.iWork.Pages', 'md.obsidian', 'notion.id'],
    exeNames: ['WINWORD.EXE', 'Obsidian.exe', 'Notion.exe'],
    appNamePatterns: ['Notion', 'Google Docs', 'Word', 'Obsidian', 'Bear', 'Pages'],
  },
  {
    id: 'communication',
    name: 'Communication',
    category: 'communication',
    bundleIds: [
      'com.tinyspeck.slackmacgap',
      'com.microsoft.teams2',
      'us.zoom.xos',
      'com.hnc.Discord',
    ],
    exeNames: ['slack.exe', 'Teams.exe', 'Zoom.exe', 'Discord.exe'],
    appNamePatterns: ['Slack', 'Teams', 'Zoom', 'Discord', 'Messages'],
  },
  {
    id: 'email',
    name: 'Email',
    category: 'communication',
    bundleIds: ['com.apple.mail', 'com.microsoft.Outlook'],
    exeNames: ['OUTLOOK.EXE'],
    appNamePatterns: ['Mail', 'Outlook', 'Gmail', 'Superhuman'],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    category: 'entertainment',
    bundleIds: ['com.spotify.client', 'com.apple.Music'],
    exeNames: ['spotify.exe'],
    appNamePatterns: ['YouTube', 'Netflix', 'Twitter', 'Reddit', 'Spotify', 'Music', 'TikTok'],
  },
];

// Self-app bundle IDs and names — excluded from tracking
export const SELF_APP_BUNDLE_IDS = new Set([
  'com.electron.attensa',
  'com.electron.forge.attensa',
  'attensa',
]);

export const SELF_APP_NAMES = new Set([
  'Electron',
  'electron',
  'attensa',
  'Attensa',
]);

// Browser bundle IDs — these get special window-title disambiguation
export const BROWSER_BUNDLE_IDS = new Set([
  'com.google.Chrome',
  'com.apple.Safari',
  'org.mozilla.firefox',
  'company.thebrowser.Browser', // Arc
  'com.microsoft.edgemac',
]);

export const BROWSER_EXE_NAMES = new Set([
  'chrome.exe',
  'firefox.exe',
  'msedge.exe',
  'Arc.exe',
]);

export const DEV_TITLE_PATTERNS = [
  'localhost',
  'GitHub',
  'Stack Overflow',
  'MDN',
  'npm',
  'Documentation',
  'API',
  'Pull Request',
  'Issue #',
  'Vercel',
  'Netlify',
  'AWS',
  'Console',
];

export const ENTERTAINMENT_TITLE_PATTERNS = [
  'YouTube',
  'Netflix',
  'Reddit',
  'Twitter',
  'Facebook',
  'Instagram',
  'TikTok',
  'Twitch',
  'Hacker News',
];

// Which clusters can coexist as part of the same task
export const COMPATIBLE_CLUSTERS: Record<string, string[]> = {
  development: ['browser-dev', 'browser-general'],
  design: ['browser-dev', 'browser-general'],
  writing: ['browser-dev', 'browser-general'],
  'browser-dev': ['development', 'design', 'writing'],
  'browser-general': ['development', 'design', 'writing'],
};
