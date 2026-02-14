import { GoogleGenAI } from '@google/genai';
import type { SessionInsightResponse, MonthlyInsightResponse } from '@attensa/shared';
import { getSettings } from './settings-store.js';

const SESSION_SYSTEM_PROMPT = `You are a focus analytics advisor. You analyze work session data and provide actionable, process-oriented recommendations.

RULES:
- Provide exactly 3-5 specific recommendations based on the data
- Each recommendation must reference specific numbers from the session
- Focus on process changes, environment adjustments, or timing strategies
- Use neutral, factual language. State observations, not judgments
- Never use motivational phrases like "great job", "keep it up", "you can do better"
- Never shame or criticize the user's behavior
- If a systemic issue is detected (recurring pattern), report it once
- If no systemic issue is evident, set systemicIssue to null

You MUST respond with valid JSON matching this exact schema:
{
  "recommendations": [
    { "text": "string — the recommendation", "category": "process | environment | timing | tooling" }
  ],
  "systemicIssue": { "text": "string", "severity": "low | medium | high" } | null,
  "sessionQualitySummary": "string — 1-2 sentence neutral summary of the session"
}`;

const MONTHLY_SYSTEM_PROMPT = `You are a focus analytics advisor. You analyze monthly focus session data and provide actionable trend-based recommendations.

RULES:
- Provide 3-5 recommendations based on monthly trends
- Reference specific numbers and week-over-week changes
- Identify patterns in focus behavior over time
- Use neutral, factual language. No motivational phrases
- Never shame or criticize the user

You MUST respond with valid JSON matching this exact schema:
{
  "recommendations": [
    { "text": "string", "category": "process | environment | timing | tooling", "trend": "improving | stable | declining" }
  ],
  "systemicIssues": [
    { "text": "string", "severity": "low | medium | high", "frequency": "string — e.g. 3 of 5 sessions" }
  ],
  "monthSummary": "string — 2-3 sentence neutral summary of the month"
}`;

function getClient(): GoogleGenAI | null {
  const settings = getSettings();
  const apiKey = settings.geminiApiKey;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export async function generateSessionInsights(
  sessionData: {
    actualDurationMs: number;
    plannedDurationMs: number;
    totalFocusTimeMs: number;
    appSwitchCount: number;
    contextSwitchCount: number;
    interruptionCount: number;
    avgRecoveryTimeMs: number;
    focusFragmentationScore: number;
    idleTimeMs: number;
  },
  contextBlocks: Array<{
    clusterId: string;
    durationMs: number;
    appNames: string[];
    wasInterrupted: boolean;
  }>,
  topApps: Array<{ appName: string; durationMs: number }>,
  appSwitches: Array<{ from: string; to: string; timestamp: number }>
): Promise<SessionInsightResponse | null> {
  const client = getClient();
  if (!client) return null;

  const userPrompt = `Analyze this focus session:

SESSION METRICS:
- Planned duration: ${Math.round(sessionData.plannedDurationMs / 60000)} min
- Actual duration: ${Math.round(sessionData.actualDurationMs / 60000)} min
- Focus time: ${Math.round(sessionData.totalFocusTimeMs / 60000)} min (${Math.round((sessionData.totalFocusTimeMs / sessionData.actualDurationMs) * 100)}% of session)
- Idle time: ${Math.round(sessionData.idleTimeMs / 60000)} min
- App switches: ${sessionData.appSwitchCount} (${(sessionData.appSwitchCount / (sessionData.actualDurationMs / 60000)).toFixed(1)}/min)
- Context switches: ${sessionData.contextSwitchCount}
- Interruptions: ${sessionData.interruptionCount}
- Avg recovery time: ${(sessionData.avgRecoveryTimeMs / 1000).toFixed(1)}s
- Fragmentation score: ${(sessionData.focusFragmentationScore * 100).toFixed(0)}/100 (lower is better)

TOP APPS BY TIME:
${topApps.map((a) => `- ${a.appName}: ${Math.round(a.durationMs / 1000)}s (${Math.round((a.durationMs / sessionData.actualDurationMs) * 100)}%)`).join('\n')}

CONTEXT BLOCKS (focus clusters):
${contextBlocks.map((b) => `- ${b.clusterId}: ${Math.round(b.durationMs / 1000)}s, apps: [${b.appNames.join(', ')}]${b.wasInterrupted ? ' [INTERRUPTED]' : ''}`).join('\n')}

APP SWITCH SEQUENCE (last 20):
${appSwitches.slice(-20).map((s) => `- ${s.from} → ${s.to}`).join('\n')}

Provide your analysis as JSON.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: SESSION_SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    const jsonStr = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const parsed = JSON.parse(jsonStr) as SessionInsightResponse;

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) return null;
    if (!parsed.sessionQualitySummary) return null;

    return parsed;
  } catch (err) {
    console.error('[ai-client] Session insights generation failed:', err);
    return null;
  }
}

export async function generateMonthlyRecap(
  yearMonth: string,
  aggregates: {
    totalSessions: number;
    totalFocusTimeMs: number;
    avgFragmentationScore: number;
    avgRecoveryTimeMs: number;
    topInterruptionSources: Array<{ appName: string; count: number }>;
    weeklyTrend: Array<{ weekNumber: number; avgScore: number }>;
  }
): Promise<MonthlyInsightResponse | null> {
  const client = getClient();
  if (!client) return null;

  const userPrompt = `Analyze this monthly focus data for ${yearMonth}:

MONTHLY AGGREGATES:
- Total sessions: ${aggregates.totalSessions}
- Total focus time: ${Math.round(aggregates.totalFocusTimeMs / 3600000)} hours
- Avg fragmentation score: ${(aggregates.avgFragmentationScore * 100).toFixed(0)}/100
- Avg recovery time: ${(aggregates.avgRecoveryTimeMs / 1000).toFixed(1)}s

TOP INTERRUPTION SOURCES:
${aggregates.topInterruptionSources.map((s) => `- ${s.appName}: ${s.count} interruptions`).join('\n')}

WEEKLY FRAGMENTATION TREND:
${aggregates.weeklyTrend.map((w) => `- Week ${w.weekNumber}: ${(w.avgScore * 100).toFixed(0)}/100`).join('\n')}

Provide your analysis as JSON.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: MONTHLY_SYSTEM_PROMPT,
        temperature: 0.5,
      },
    });

    const text = response.text?.trim();
    if (!text) return null;

    const jsonStr = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
    const parsed = JSON.parse(jsonStr) as MonthlyInsightResponse;

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) return null;
    if (!parsed.monthSummary) return null;

    return parsed;
  } catch (err) {
    console.error('[ai-client] Monthly recap generation failed:', err);
    return null;
  }
}
