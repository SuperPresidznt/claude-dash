-- Migration: Add P0 Features (Focus Blocks, Pomodoro, Journal, OKRs, Reviews, Calendar Enrichment)
-- Created: 2025-12-04

-- Focus Blocks for timeboxing
CREATE TABLE "FocusBlock" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "taskId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP NOT NULL,
  "actualStartTime" TIMESTAMP,
  "actualEndTime" TIMESTAMP,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "calendarEventId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL
);

CREATE INDEX "FocusBlock_userId_idx" ON "FocusBlock"("userId");
CREATE INDEX "FocusBlock_taskId_idx" ON "FocusBlock"("taskId");
CREATE INDEX "FocusBlock_startTime_idx" ON "FocusBlock"("startTime");

-- Pomodoro Sessions
CREATE TABLE "PomodoroSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "taskId" TEXT,
  "focusBlockId" TEXT,
  "type" TEXT NOT NULL DEFAULT 'work', -- work, short_break, long_break
  "durationMinutes" INTEGER NOT NULL DEFAULT 25,
  "startTime" TIMESTAMP NOT NULL,
  "endTime" TIMESTAMP,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "interrupted" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "calendarEventId" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL,
  FOREIGN KEY ("focusBlockId") REFERENCES "FocusBlock"("id") ON DELETE SET NULL
);

CREATE INDEX "PomodoroSession_userId_idx" ON "PomodoroSession"("userId");
CREATE INDEX "PomodoroSession_taskId_idx" ON "PomodoroSession"("taskId");
CREATE INDEX "PomodoroSession_startTime_idx" ON "PomodoroSession"("startTime");
CREATE INDEX "PomodoroSession_focusBlockId_idx" ON "PomodoroSession"("focusBlockId");

-- Reflection Journal Entries
CREATE TABLE "JournalEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'reflection', -- reflection, am, pm, custom
  "date" TIMESTAMP NOT NULL,
  "content" TEXT NOT NULL,
  "promptQuestion" TEXT,
  "sentimentScore" REAL, -- -1.0 to 1.0 (negative to positive)
  "sentimentLabel" TEXT, -- negative, neutral, positive
  "tags" TEXT[], -- Array of tags
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "JournalEntry_userId_idx" ON "JournalEntry"("userId");
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");
CREATE INDEX "JournalEntry_type_idx" ON "JournalEntry"("type");

-- OKRs (Objectives and Key Results)
CREATE TABLE "Objective" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "macroGoalId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "quarter" TEXT NOT NULL, -- e.g., "Q1 2025"
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  "confidenceRating" INTEGER, -- 0-100%
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL,
  FOREIGN KEY ("macroGoalId") REFERENCES "MacroGoal"("id") ON DELETE SET NULL
);

CREATE INDEX "Objective_userId_idx" ON "Objective"("userId");
CREATE INDEX "Objective_projectId_idx" ON "Objective"("projectId");
CREATE INDEX "Objective_macroGoalId_idx" ON "Objective"("macroGoalId");
CREATE INDEX "Objective_quarter_idx" ON "Objective"("quarter");

CREATE TABLE "KeyResult" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "objectiveId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetValue" REAL NOT NULL,
  "currentValue" REAL NOT NULL DEFAULT 0,
  "unit" TEXT, -- e.g., "dollars", "tasks", "hours"
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "confidenceRating" INTEGER, -- 0-100%
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "KeyResult_objectiveId_idx" ON "KeyResult"("objectiveId");
CREATE INDEX "KeyResult_userId_idx" ON "KeyResult"("userId");

-- Review Reports (Weekly/Monthly)
CREATE TABLE "Review" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL, -- weekly, monthly, quarterly, yearly
  "period" TEXT NOT NULL, -- e.g., "Week 48 2025", "November 2025"
  "startDate" TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "financeSummary" JSONB, -- {income, expenses, runway, budgetVariance}
  "taskSummary" JSONB, -- {completed, total, completionRate}
  "habitSummary" JSONB, -- {completionRate, topHabits, streaks}
  "journalSummary" JSONB, -- {entryCount, avgSentiment, sentimentTrend}
  "pomodoroSummary" JSONB, -- {sessionsCompleted, totalMinutes}
  "highlights" TEXT[],
  "lowlights" TEXT[],
  "actionItems" TEXT[],
  "emailSentAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Review_userId_idx" ON "Review"("userId");
CREATE INDEX "Review_type_idx" ON "Review"("type");
CREATE INDEX "Review_startDate_idx" ON "Review"("startDate");

-- Calendar Event Enrichment
-- Add columns to existing CalendarEvent table
ALTER TABLE "CalendarEvent" ADD COLUMN "enrichedData" JSONB;
ALTER TABLE "CalendarEvent" ADD COLUMN "linkedFinanceIds" TEXT[];
ALTER TABLE "CalendarEvent" ADD COLUMN "linkedProjectId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "linkedFocusBlockId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "linkedPomodoroId" TEXT;

-- Add foreign key constraints
ALTER TABLE "CalendarEvent"
  ADD CONSTRAINT "CalendarEvent_linkedProjectId_fkey"
  FOREIGN KEY ("linkedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL;

ALTER TABLE "CalendarEvent"
  ADD CONSTRAINT "CalendarEvent_linkedFocusBlockId_fkey"
  FOREIGN KEY ("linkedFocusBlockId") REFERENCES "FocusBlock"("id") ON DELETE SET NULL;

ALTER TABLE "CalendarEvent"
  ADD CONSTRAINT "CalendarEvent_linkedPomodoroId_fkey"
  FOREIGN KEY ("linkedPomodoroId") REFERENCES "PomodoroSession"("id") ON DELETE SET NULL;

CREATE INDEX "CalendarEvent_linkedProjectId_idx" ON "CalendarEvent"("linkedProjectId");
CREATE INDEX "CalendarEvent_linkedFocusBlockId_idx" ON "CalendarEvent"("linkedFocusBlockId");
CREATE INDEX "CalendarEvent_linkedPomodoroId_idx" ON "CalendarEvent"("linkedPomodoroId");
