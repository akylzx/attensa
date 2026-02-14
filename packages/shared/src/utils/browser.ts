/**
 * Known browser name suffixes found in window titles.
 * Used to strip the browser name and extract the site/page info.
 */
const BROWSER_SUFFIXES = [
  ' - Google Chrome',
  ' - Chromium',
  ' — Mozilla Firefox',
  ' — Firefox',
  ' - Microsoft Edge',
  ' - Brave',
  ' - Arc',
  ' - Opera',
  ' - Vivaldi',
  ' - Safari',
  ' — Safari',
  ' - Yandex',
  ' - Waterfox',
  ' - Orion',
  ' - Zen',
];

/** Titles that mean "no page loaded" */
const EMPTY_TAB_TITLES = new Set([
  'new tab', 'start page', 'new page', 'ntp',
  'untitled', 'about:blank', 'about:newtab',
  'speed dial', 'home', 'start',
]);

/**
 * Well-known site names to look for in browser titles.
 * Checked case-insensitively against the title.
 * Order matters — more specific patterns first to avoid false matches.
 */
const KNOWN_SITES: Array<{ pattern: string; label: string }> = [
  // Dev tools — specific first
  { pattern: 'github.com', label: 'GitHub' },
  { pattern: 'github', label: 'GitHub' },
  { pattern: 'gitlab', label: 'GitLab' },
  { pattern: 'bitbucket', label: 'Bitbucket' },
  { pattern: 'stack overflow', label: 'Stack Overflow' },
  { pattern: 'stackoverflow', label: 'Stack Overflow' },
  { pattern: 'mdn web docs', label: 'MDN' },
  { pattern: 'developer.mozilla', label: 'MDN' },
  { pattern: 'npmjs.com', label: 'npm' },
  { pattern: 'crates.io', label: 'crates.io' },
  { pattern: 'pypi.org', label: 'PyPI' },
  { pattern: 'codepen', label: 'CodePen' },
  { pattern: 'codesandbox', label: 'CodeSandbox' },
  { pattern: 'replit', label: 'Replit' },
  { pattern: 'localhost', label: 'localhost' },
  { pattern: '127.0.0.1', label: 'localhost' },
  { pattern: 'vercel', label: 'Vercel' },
  { pattern: 'netlify', label: 'Netlify' },
  { pattern: 'render.com', label: 'Render' },
  { pattern: 'railway.app', label: 'Railway' },

  // Google suite — specific before generic "google"
  { pattern: 'docs.google', label: 'Google Docs' },
  { pattern: 'google docs', label: 'Google Docs' },
  { pattern: 'google sheets', label: 'Google Sheets' },
  { pattern: 'sheets.google', label: 'Google Sheets' },
  { pattern: 'google slides', label: 'Google Slides' },
  { pattern: 'slides.google', label: 'Google Slides' },
  { pattern: 'drive.google', label: 'Google Drive' },
  { pattern: 'google drive', label: 'Google Drive' },
  { pattern: 'calendar.google', label: 'Google Calendar' },
  { pattern: 'meet.google', label: 'Google Meet' },
  { pattern: 'mail.google', label: 'Gmail' },
  { pattern: 'gmail', label: 'Gmail' },
  { pattern: 'google.com/search', label: 'Google Search' },
  { pattern: 'google.com/maps', label: 'Google Maps' },

  // Social / entertainment
  { pattern: 'youtube', label: 'YouTube' },
  { pattern: 'reddit', label: 'Reddit' },
  { pattern: 'twitter.com', label: 'Twitter/X' },
  { pattern: 'x.com/', label: 'Twitter/X' },
  { pattern: 'linkedin', label: 'LinkedIn' },
  { pattern: 'facebook', label: 'Facebook' },
  { pattern: 'instagram', label: 'Instagram' },
  { pattern: 'tiktok', label: 'TikTok' },
  { pattern: 'pinterest', label: 'Pinterest' },
  { pattern: 'tumblr', label: 'Tumblr' },
  { pattern: 'netflix', label: 'Netflix' },
  { pattern: 'twitch.tv', label: 'Twitch' },
  { pattern: 'twitch', label: 'Twitch' },
  { pattern: 'hacker news', label: 'Hacker News' },
  { pattern: 'news.ycombinator', label: 'Hacker News' },
  { pattern: 'medium.com', label: 'Medium' },
  { pattern: 'substack', label: 'Substack' },

  // Productivity
  { pattern: 'notion.so', label: 'Notion' },
  { pattern: 'notion', label: 'Notion' },
  { pattern: 'figma.com', label: 'Figma' },
  { pattern: 'figma', label: 'Figma' },
  { pattern: 'canva', label: 'Canva' },
  { pattern: 'miro', label: 'Miro' },

  // Communication
  { pattern: 'web.telegram', label: 'Telegram' },
  { pattern: 'telegram', label: 'Telegram' },
  { pattern: 'web.whatsapp', label: 'WhatsApp' },
  { pattern: 'whatsapp', label: 'WhatsApp' },
  { pattern: 'discord', label: 'Discord' },
  { pattern: 'slack', label: 'Slack' },
  { pattern: 'teams.microsoft', label: 'Microsoft Teams' },
  { pattern: 'zoom.us', label: 'Zoom' },

  // AI
  { pattern: 'chatgpt', label: 'ChatGPT' },
  { pattern: 'chat.openai', label: 'ChatGPT' },
  { pattern: 'claude.ai', label: 'Claude' },
  { pattern: 'gemini.google', label: 'Gemini' },
  { pattern: 'perplexity', label: 'Perplexity' },
  { pattern: 'copilot.microsoft', label: 'Copilot' },

  // PM / project tools
  { pattern: 'jira', label: 'Jira' },
  { pattern: 'confluence', label: 'Confluence' },
  { pattern: 'trello', label: 'Trello' },
  { pattern: 'asana', label: 'Asana' },
  { pattern: 'linear.app', label: 'Linear' },
  { pattern: 'linear', label: 'Linear' },
  { pattern: 'clickup', label: 'ClickUp' },
  { pattern: 'monday.com', label: 'Monday' },

  // Email
  { pattern: 'outlook', label: 'Outlook' },
  { pattern: 'protonmail', label: 'ProtonMail' },
  { pattern: 'mail.yahoo', label: 'Yahoo Mail' },

  // Cloud / infra
  { pattern: 'console.aws', label: 'AWS Console' },
  { pattern: 'aws', label: 'AWS' },
  { pattern: 'portal.azure', label: 'Azure' },
  { pattern: 'console.cloud.google', label: 'Google Cloud' },
  { pattern: 'cloudflare', label: 'Cloudflare' },

  // Shopping / other
  { pattern: 'wikipedia', label: 'Wikipedia' },
  { pattern: 'spotify', label: 'Spotify' },
  { pattern: 'amazon', label: 'Amazon' },
  { pattern: 'ebay', label: 'eBay' },

  // Generic "google" last — catches Google Search, etc.
  { pattern: 'google', label: 'Google' },
];

/**
 * Try to extract a domain from a string that looks like a URL or contains one.
 * Returns the domain (e.g., "example.com") or null.
 */
function extractDomain(text: string): string | null {
  // Match URLs like https://example.com/path or just example.com
  const urlMatch = text.match(/(?:https?:\/\/)?([a-z0-9][-a-z0-9]*(?:\.[a-z0-9][-a-z0-9]*)+)/i);
  if (urlMatch) {
    let domain = urlMatch[1].toLowerCase();
    // Strip www.
    if (domain.startsWith('www.')) domain = domain.slice(4);
    return domain;
  }
  return null;
}

/**
 * Extract a human-readable site name from a browser window title.
 *
 * @param windowTitle - The raw window title from active-win
 * @param browserName - The browser's process name (fallback when title is empty)
 * @returns A human-readable site/page name
 */
export function extractSiteName(windowTitle: string, browserName?: string): string {
  const fallback = browserName || 'Browser';
  let title = windowTitle.trim();

  // Empty title → use browser name
  if (!title) return fallback;

  // Strip browser suffix
  const titleLower = title.toLowerCase();
  for (const suffix of BROWSER_SUFFIXES) {
    if (titleLower.endsWith(suffix.toLowerCase())) {
      title = title.slice(0, title.length - suffix.length).trim();
      break;
    }
  }

  // After stripping, if empty or a known "no page" title
  if (!title || EMPTY_TAB_TITLES.has(title.toLowerCase())) {
    return fallback;
  }

  // 1. Check known sites against the FULL title (before and after stripping)
  //    Check both the stripped title and the original title for matches
  const checkTitle = title.toLowerCase();
  const checkOriginal = windowTitle.toLowerCase();
  for (const { pattern, label } of KNOWN_SITES) {
    if (checkTitle.includes(pattern) || checkOriginal.includes(pattern)) {
      return label;
    }
  }

  // 2. Try to extract a domain from the title (some browsers show URLs)
  const domain = extractDomain(title) || extractDomain(windowTitle);
  if (domain) {
    // Check if the domain matches a known site
    for (const { pattern, label } of KNOWN_SITES) {
      if (domain.includes(pattern)) return label;
    }
    // Return the domain itself as a readable name
    return domain;
  }

  // 3. Split by common separators and try the last segment (usually site name)
  const parts = title.split(/\s[-–—|·:]\s/);
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim();
    if (last.length > 0 && last.length <= 50) {
      // Check if the last part matches a known site
      const lastLower = last.toLowerCase();
      for (const { pattern, label } of KNOWN_SITES) {
        if (lastLower.includes(pattern)) return label;
      }
      return last;
    }
  }

  // 4. Use the title directly, truncated if needed
  if (title.length > 50) {
    return title.substring(0, 47) + '...';
  }

  return title;
}
