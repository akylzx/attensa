import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  startedAt: integer('started_at').notNull(),
  endedAt: integer('ended_at'),
  plannedDurationMs: integer('planned_duration_ms').notNull(),
  actualDurationMs: integer('actual_duration_ms').notNull().default(0),
  status: text('status', { enum: ['active', 'completed', 'cancelled'] })
    .notNull()
    .default('active'),
  totalFocusTimeMs: integer('total_focus_time_ms').notNull().default(0),
  appSwitchCount: integer('app_switch_count').notNull().default(0),
  avgRecoveryTimeMs: integer('avg_recovery_time_ms').notNull().default(0),
  focusFragmentationScore: integer('focus_fragmentation_score').notNull().default(0),
  interruptionCount: integer('interruption_count').notNull().default(0),
  contextSwitchCount: integer('context_switch_count').notNull().default(0),
  idleTimeMs: integer('idle_time_ms').notNull().default(0),
  aiInsightsJson: text('ai_insights_json'),
});

export const appEvents = sqliteTable('app_events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id),
  timestamp: integer('timestamp').notNull(),
  appName: text('app_name').notNull(),
  windowTitle: text('window_title').notNull(),
  bundleId: text('bundle_id').notNull(),
  durationMs: integer('duration_ms').notNull().default(0),
  isIdle: integer('is_idle', { mode: 'boolean' }).notNull().default(false),
});

export const contextBlocks = sqliteTable('context_blocks', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id),
  clusterId: text('cluster_id').notNull(),
  startTimestamp: integer('start_timestamp').notNull(),
  endTimestamp: integer('end_timestamp').notNull(),
  durationMs: integer('duration_ms').notNull(),
  appNamesJson: text('app_names_json').notNull(),
  eventCount: integer('event_count').notNull(),
  wasInterrupted: integer('was_interrupted', { mode: 'boolean' })
    .notNull()
    .default(false),
});

export const monthlySummaries = sqliteTable('monthly_summaries', {
  id: text('id').primaryKey(),
  yearMonth: text('year_month').notNull().unique(),
  generatedAt: integer('generated_at').notNull(),
  sessionCount: integer('session_count').notNull(),
  totalFocusTimeMs: integer('total_focus_time_ms').notNull(),
  avgFocusTimePerSessionMs: integer('avg_focus_time_per_session_ms').notNull(),
  avgAppSwitchesPerSession: integer('avg_app_switches_per_session').notNull(),
  avgRecoveryTimeMs: integer('avg_recovery_time_ms').notNull(),
  avgFragmentationScore: integer('avg_fragmentation_score').notNull(),
  totalInterruptions: integer('total_interruptions').notNull(),
  topAppsJson: text('top_apps_json').notNull(),
  topInterruptionSourcesJson: text('top_interruption_sources_json').notNull(),
  focusTrendJson: text('focus_trend_json').notNull(),
  aiRecapJson: text('ai_recap_json'),
});
