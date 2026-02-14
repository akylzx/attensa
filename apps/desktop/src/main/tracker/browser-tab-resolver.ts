import { execFile } from 'node:child_process';

/**
 * Queries the browser directly via macOS AppleScript for the active tab URL.
 * This is far more reliable than parsing window titles.
 *
 * Each browser has a different AppleScript dictionary:
 * - Chromium-based: `URL of active tab of front window`
 * - Safari: `URL of front document`
 * - Firefox: no AppleScript support → falls back to null
 */

// bundleId → AppleScript command to get the active tab URL
const BROWSER_SCRIPTS: Record<string, string> = {
  // Chromium-based browsers all share the same scripting interface
  'com.google.Chrome':
    'tell application "Google Chrome" to return URL of active tab of front window',
  'company.thebrowser.Browser':
    'tell application "Arc" to return URL of active tab of front window',
  'com.microsoft.edgemac':
    'tell application "Microsoft Edge" to return URL of active tab of front window',
  'com.brave.Browser':
    'tell application "Brave Browser" to return URL of active tab of front window',
  'com.operasoftware.Opera':
    'tell application "Opera" to return URL of active tab of front window',
  'com.vivaldi.Vivaldi':
    'tell application "Vivaldi" to return URL of active tab of front window',
  // Safari uses a different scripting model
  'com.apple.Safari':
    'tell application "Safari" to return URL of front document',
  // Firefox has no AppleScript tab URL support
};

// Windows exe → PowerShell script to get Chrome URL via UI Automation
// (basic support — only Chrome for now)
const WINDOWS_SCRIPTS: Record<string, string> = {
  'chrome.exe': `
    Add-Type -AssemblyName UIAutomationClient
    $root = [System.Windows.Automation.AutomationElement]::RootElement
    $chrome = [System.Windows.Automation.AutomationElement]::FromHandle((Get-Process chrome | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object -First 1).MainWindowHandle)
    $addressBar = $chrome.FindFirst([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)))
    if ($addressBar) { $addressBar.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value }
  `.trim(),
};

const OSASCRIPT_TIMEOUT_MS = 1500;

/**
 * Query the browser's active tab URL via native OS scripting.
 * Returns the URL string or null if unavailable.
 */
export function getActiveTabUrl(bundleId: string): Promise<string | null> {
  if (process.platform === 'darwin') {
    return getActiveTabUrlMac(bundleId);
  }
  // Windows support is experimental and rarely needed — skip for now
  return Promise.resolve(null);
}

function getActiveTabUrlMac(bundleId: string): Promise<string | null> {
  const script = BROWSER_SCRIPTS[bundleId];
  if (!script) return Promise.resolve(null);

  return new Promise((resolve) => {
    execFile(
      'osascript',
      ['-e', script],
      { timeout: OSASCRIPT_TIMEOUT_MS },
      (err, stdout) => {
        if (err) {
          // Expected failures: browser has no windows, permission denied, etc.
          resolve(null);
          return;
        }
        const url = stdout.trim();
        // Sanity check: must look like a URL
        if (url && (url.startsWith('http') || url.startsWith('file'))) {
          resolve(url);
        } else {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Extract a clean domain from a URL.
 * "https://www.github.com/user/repo" → "github.com"
 * "https://web.telegram.org/#/im"    → "web.telegram.org"
 */
export function domainFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Map a domain to a human-readable site name.
 * Falls back to the domain itself if no known match.
 */
const DOMAIN_TO_LABEL: Array<{ match: string; label: string }> = [
  // Dev
  { match: 'github.com', label: 'GitHub' },
  { match: 'gitlab.com', label: 'GitLab' },
  { match: 'bitbucket.org', label: 'Bitbucket' },
  { match: 'stackoverflow.com', label: 'Stack Overflow' },
  { match: 'developer.mozilla.org', label: 'MDN' },
  { match: 'npmjs.com', label: 'npm' },
  { match: 'crates.io', label: 'crates.io' },
  { match: 'pypi.org', label: 'PyPI' },
  { match: 'codepen.io', label: 'CodePen' },
  { match: 'codesandbox.io', label: 'CodeSandbox' },
  { match: 'replit.com', label: 'Replit' },
  { match: 'vercel.com', label: 'Vercel' },
  { match: 'netlify.com', label: 'Netlify' },
  { match: 'netlify.app', label: 'Netlify' },
  { match: 'railway.app', label: 'Railway' },
  { match: 'render.com', label: 'Render' },
  { match: 'heroku.com', label: 'Heroku' },
  { match: 'fly.io', label: 'Fly.io' },

  // Google
  { match: 'docs.google.com', label: 'Google Docs' },
  { match: 'sheets.google.com', label: 'Google Sheets' },
  { match: 'slides.google.com', label: 'Google Slides' },
  { match: 'drive.google.com', label: 'Google Drive' },
  { match: 'calendar.google.com', label: 'Google Calendar' },
  { match: 'meet.google.com', label: 'Google Meet' },
  { match: 'mail.google.com', label: 'Gmail' },
  { match: 'maps.google.com', label: 'Google Maps' },
  { match: 'translate.google.com', label: 'Google Translate' },
  { match: 'console.cloud.google.com', label: 'Google Cloud' },
  { match: 'google.com', label: 'Google' },

  // Social / entertainment
  { match: 'youtube.com', label: 'YouTube' },
  { match: 'youtu.be', label: 'YouTube' },
  { match: 'reddit.com', label: 'Reddit' },
  { match: 'twitter.com', label: 'Twitter/X' },
  { match: 'x.com', label: 'Twitter/X' },
  { match: 'linkedin.com', label: 'LinkedIn' },
  { match: 'facebook.com', label: 'Facebook' },
  { match: 'instagram.com', label: 'Instagram' },
  { match: 'tiktok.com', label: 'TikTok' },
  { match: 'pinterest.com', label: 'Pinterest' },
  { match: 'tumblr.com', label: 'Tumblr' },
  { match: 'netflix.com', label: 'Netflix' },
  { match: 'twitch.tv', label: 'Twitch' },
  { match: 'news.ycombinator.com', label: 'Hacker News' },
  { match: 'medium.com', label: 'Medium' },
  { match: 'substack.com', label: 'Substack' },
  { match: 'spotify.com', label: 'Spotify' },

  // Communication
  { match: 'web.telegram.org', label: 'Telegram' },
  { match: 'telegram.org', label: 'Telegram' },
  { match: 'web.whatsapp.com', label: 'WhatsApp' },
  { match: 'whatsapp.com', label: 'WhatsApp' },
  { match: 'discord.com', label: 'Discord' },
  { match: 'app.slack.com', label: 'Slack' },
  { match: 'slack.com', label: 'Slack' },
  { match: 'teams.microsoft.com', label: 'Microsoft Teams' },
  { match: 'zoom.us', label: 'Zoom' },

  // AI
  { match: 'chat.openai.com', label: 'ChatGPT' },
  { match: 'chatgpt.com', label: 'ChatGPT' },
  { match: 'claude.ai', label: 'Claude' },
  { match: 'gemini.google.com', label: 'Gemini' },
  { match: 'perplexity.ai', label: 'Perplexity' },
  { match: 'copilot.microsoft.com', label: 'Copilot' },
  { match: 'poe.com', label: 'Poe' },

  // Productivity
  { match: 'notion.so', label: 'Notion' },
  { match: 'notion.site', label: 'Notion' },
  { match: 'figma.com', label: 'Figma' },
  { match: 'canva.com', label: 'Canva' },
  { match: 'miro.com', label: 'Miro' },
  { match: 'excalidraw.com', label: 'Excalidraw' },

  // PM tools
  { match: 'atlassian.net', label: 'Jira' },
  { match: 'jira.com', label: 'Jira' },
  { match: 'confluence.com', label: 'Confluence' },
  { match: 'trello.com', label: 'Trello' },
  { match: 'asana.com', label: 'Asana' },
  { match: 'linear.app', label: 'Linear' },
  { match: 'clickup.com', label: 'ClickUp' },
  { match: 'monday.com', label: 'Monday' },
  { match: 'basecamp.com', label: 'Basecamp' },

  // Email
  { match: 'outlook.live.com', label: 'Outlook' },
  { match: 'outlook.office.com', label: 'Outlook' },
  { match: 'protonmail.com', label: 'ProtonMail' },
  { match: 'proton.me', label: 'ProtonMail' },
  { match: 'mail.yahoo.com', label: 'Yahoo Mail' },

  // Cloud / infra
  { match: 'console.aws.amazon.com', label: 'AWS Console' },
  { match: 'aws.amazon.com', label: 'AWS' },
  { match: 'portal.azure.com', label: 'Azure' },
  { match: 'cloudflare.com', label: 'Cloudflare' },
  { match: 'dashboard.stripe.com', label: 'Stripe' },

  // Reference / learning
  { match: 'wikipedia.org', label: 'Wikipedia' },
  { match: 'w3schools.com', label: 'W3Schools' },
  { match: 'coursera.org', label: 'Coursera' },
  { match: 'udemy.com', label: 'Udemy' },

  // Shopping
  { match: 'amazon.com', label: 'Amazon' },
  { match: 'amazon.co', label: 'Amazon' },
  { match: 'ebay.com', label: 'eBay' },
];

export function siteNameFromDomain(domain: string): string {
  // Check exact and suffix matches
  for (const { match, label } of DOMAIN_TO_LABEL) {
    if (domain === match || domain.endsWith('.' + match)) {
      return label;
    }
  }

  // localhost / local dev servers
  if (domain === 'localhost' || domain === '127.0.0.1' || domain === '0.0.0.0') {
    return 'localhost';
  }

  // For unknown domains, return a cleaned version
  // "app.example.com" → "example.com"
  // "very-long-subdomain.service.io" → keep as is
  const parts = domain.split('.');
  if (parts.length > 2) {
    // Strip common subdomains
    const stripped = parts.slice(-2).join('.');
    // But keep meaningful subdomains (e.g., "web.telegram.org" → already matched above)
    return stripped;
  }

  return domain;
}

/**
 * Full pipeline: URL → domain → human-readable site name.
 * Returns null if URL is invalid.
 */
export function siteNameFromUrl(url: string): string | null {
  const domain = domainFromUrl(url);
  if (!domain) return null;
  return siteNameFromDomain(domain);
}
