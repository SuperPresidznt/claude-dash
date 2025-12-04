# P0 Features Implementation Guide

This document provides a comprehensive overview of the 6 new P0 features implemented in the Life Dashboard application.

## Table of Contents

1. [Focus Block Planner](#focus-block-planner)
2. [Pomodoro Timer](#pomodoro-timer)
3. [Reflection Journal](#reflection-journal)
4. [OKR Module](#okr-module)
5. [Review Wizard](#review-wizard)
6. [Calendar Event Enrichment](#calendar-event-enrichment)

---

## 1. Focus Block Planner

### Overview
The Focus Block Planner enables timeboxing - scheduling dedicated focus blocks for deep work on specific tasks.

### Features
- Create focus blocks with start/end times
- Link focus blocks to tasks
- Track actual vs. planned time
- Visual timeline of daily focus blocks
- Mark blocks as started/completed
- See linked pomodoro sessions

### API Endpoints

#### `GET /api/focus-blocks`
Query parameters:
- `date`: Filter by specific date (YYYY-MM-DD)
- `taskId`: Filter by task ID

Response:
```json
[
  {
    "id": "block-id",
    "title": "Deep work on feature X",
    "startTime": "2025-12-04T09:00:00Z",
    "endTime": "2025-12-04T11:00:00Z",
    "completed": false,
    "task": { "id": "task-id", "title": "Build feature X" }
  }
]
```

#### `POST /api/focus-blocks`
Create a new focus block.

Request body:
```json
{
  "taskId": "task-id",
  "title": "Deep work session",
  "description": "Focus on implementation",
  "startTime": "2025-12-04T09:00:00Z",
  "endTime": "2025-12-04T11:00:00Z"
}
```

#### `PATCH /api/focus-blocks/[id]`
Update focus block (mark as started/completed).

#### `DELETE /api/focus-blocks/[id]`
Delete a focus block.

### Usage
Navigate to `/focus` to access the Focus Block Planner.

---

## 2. Pomodoro Timer

### Overview
A productivity timer using the Pomodoro Technique (25 min work, 5 min break cycles).

### Features
- Configurable work/break durations
- Link pomodoro sessions to tasks
- Automatic logging of completed sessions
- Daily session tracking
- Integration with metrics dashboard
- Google Calendar sync (push sessions as events)

### API Endpoints

#### `GET /api/pomodoro`
Query parameters:
- `date`: Filter by specific date
- `taskId`: Filter by task
- `focusBlockId`: Filter by focus block

#### `POST /api/pomodoro`
Start a new pomodoro session.

Request body:
```json
{
  "taskId": "task-id",
  "type": "work",
  "durationMinutes": 25,
  "startTime": "2025-12-04T09:00:00Z"
}
```

#### `PATCH /api/pomodoro/[id]`
Complete or interrupt a session.

Request body:
```json
{
  "endTime": "2025-12-04T09:25:00Z",
  "completed": true,
  "interrupted": false,
  "note": "Great focus session"
}
```

### Timer States
- **Work**: 25 minutes (default)
- **Short Break**: 5 minutes
- **Long Break**: 15 minutes (after 4 work sessions)

### Usage
The Pomodoro Timer is integrated into the Focus page at `/focus`.

---

## 3. Reflection Journal

### Overview
A journaling system with AM/PM reflection prompts and sentiment analysis.

### Features
- Three journal types: AM, PM, Reflection
- Customizable reflection prompts
- Automatic sentiment analysis (positive/neutral/negative)
- Sentiment scoring (-1.0 to 1.0)
- Tag support for categorization
- Date-based browsing
- Sentiment trends in metrics

### API Endpoints

#### `GET /api/journal`
Query parameters:
- `type`: Filter by type (reflection, am, pm, custom)
- `startDate` / `endDate`: Date range
- `period`: Quick filters (week, month)

#### `POST /api/journal`
Create a journal entry.

Request body:
```json
{
  "type": "am",
  "date": "2025-12-04T08:00:00Z",
  "content": "Feeling grateful and excited for today!",
  "promptQuestion": "What are you grateful for today?",
  "tags": ["gratitude", "morning"]
}
```

Response includes automatic sentiment analysis:
```json
{
  "id": "entry-id",
  "content": "...",
  "sentimentScore": 0.75,
  "sentimentLabel": "positive"
}
```

### Sentiment Analysis
The system uses keyword-based sentiment analysis to score entries:
- **Positive keywords**: happy, great, excellent, productive, success, etc.
- **Negative keywords**: sad, frustrated, difficult, stress, etc.
- **Score range**: -1.0 (very negative) to 1.0 (very positive)
- **Labels**: negative (<-0.2), neutral (-0.2 to 0.2), positive (>0.2)

### Usage
Access at `/journal-app` with separate sections for AM, PM, and general reflections.

---

## 4. OKR Module

### Overview
Objectives and Key Results tracking for quarterly goal setting.

### Features
- Create objectives with multiple key results
- Quarterly organization
- Confidence ratings (0-100%)
- Progress tracking per key result
- Link to projects and macro goals
- Overall objective progress calculation
- Status management (active, completed, cancelled)

### API Endpoints

#### `GET /api/okrs/objectives`
Query parameters:
- `quarter`: Filter by quarter (e.g., "Q1 2025")
- `status`: Filter by status
- `projectId`: Filter by project

#### `POST /api/okrs/objectives`
Create an objective.

Request body:
```json
{
  "title": "Launch new product feature",
  "description": "Complete MVP and launch to beta users",
  "quarter": "Q1 2025",
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-03-31T23:59:59Z",
  "confidenceRating": 75,
  "projectId": "project-id"
}
```

#### `POST /api/okrs/key-results`
Add a key result to an objective.

Request body:
```json
{
  "objectiveId": "objective-id",
  "title": "Acquire 100 beta users",
  "targetValue": 100,
  "currentValue": 25,
  "unit": "users",
  "confidenceRating": 80
}
```

#### `PATCH /api/okrs/key-results/[id]`
Update key result progress.

### Progress Calculation
- Overall objective progress = average of all key result progress
- Key result progress = (currentValue / targetValue) * 100
- Color coding: green (>=75%), yellow (>=50%), orange (>=25%), red (<25%)

### Usage
Navigate to `/okrs` to manage objectives and key results.

---

## 5. Review Wizard

### Overview
Automated weekly/monthly review generation that aggregates data from all modules.

### Features
- Generate reviews for weekly or monthly periods
- Automatic data aggregation from:
  - Finance (income, expenses, net cashflow)
  - Tasks (completion rate)
  - Habits (adherence rate)
  - Journal (sentiment trends)
  - Pomodoro (sessions, focus time)
- Add personal highlights, lowlights, action items
- Review history
- Email export (planned)

### API Endpoints

#### `GET /api/reviews`
Query parameters:
- `type`: Filter by type (weekly, monthly, quarterly, yearly)

#### `POST /api/reviews`
Create a manual review.

Request body:
```json
{
  "type": "weekly",
  "startDate": "2025-11-25T00:00:00Z",
  "endDate": "2025-12-01T23:59:59Z",
  "highlights": ["Completed major feature", "Hit fitness goal"],
  "lowlights": ["Missed deadline on task X"],
  "actionItems": ["Schedule client call", "Review Q1 OKRs"]
}
```

#### `POST /api/reviews/generate`
Auto-generate a review for current/last period.

Request body:
```json
{
  "type": "weekly"
}
```

### Review Summary Structure
```json
{
  "financeSummary": {
    "income": 5000,
    "expenses": 3000,
    "netCashflow": 2000,
    "transactionCount": 45
  },
  "taskSummary": {
    "completed": 12,
    "total": 15,
    "completionRate": 80
  },
  "habitSummary": {
    "totalHabits": 5,
    "completions": 28,
    "completionRate": 80
  },
  "journalSummary": {
    "entryCount": 7,
    "avgSentiment": 0.65,
    "sentimentTrend": "positive"
  },
  "pomodoroSummary": {
    "sessionsCompleted": 32,
    "totalMinutes": 800
  }
}
```

### Usage
Access at `/reviews` to generate and view historical reviews.

---

## 6. Calendar Event Enrichment

### Overview
Enhance Google Calendar events with contextual data from the app.

### Features
- Link calendar events to tasks, projects, habits
- Attach financial context (bill due dates)
- Link focus blocks and pomodoro sessions
- Display enriched data in calendar view
- Automatic sync of focus blocks to calendar

### API Endpoints

#### `POST /api/calendar/enrich`
Enrich a calendar event with app data.

Request body:
```json
{
  "eventId": "calendar-event-id",
  "linkedTaskId": "task-id",
  "linkedProjectId": "project-id",
  "linkedFocusBlockId": "focus-block-id",
  "linkedFinanceIds": ["liability-id-1", "liability-id-2"],
  "enrichedData": {
    "customField": "value"
  }
}
```

Response includes related entity data:
```json
{
  "id": "event-id",
  "title": "Work on Project X",
  "linkedProject": {
    "id": "project-id",
    "name": "Project X",
    "status": "active"
  },
  "enrichedData": {
    "task": { "id": "task-id", "title": "Complete feature", "priority": "high" },
    "liabilities": [
      { "id": "liability-id-1", "name": "Credit Card", "minimumPayment": 100 }
    ]
  }
}
```

### Enrichment Types
1. **Task Links**: Show task details in event description
2. **Project Context**: Display project status and progress
3. **Focus Blocks**: Auto-create calendar events for focus blocks
4. **Pomodoro Sessions**: Log completed sessions as events
5. **Finance Context**: Add bill payment reminders
6. **Progress Notes**: Attach project updates to recurring check-ins

### Usage
Calendar enrichment is automatic when creating focus blocks or pomodoro sessions. Manual enrichment can be done via the API.

---

## Database Schema

### New Tables

#### FocusBlock
```sql
CREATE TABLE "FocusBlock" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  taskId TEXT,
  title TEXT NOT NULL,
  description TEXT,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP NOT NULL,
  actualStartTime TIMESTAMP,
  actualEndTime TIMESTAMP,
  completed BOOLEAN DEFAULT false,
  calendarEventId TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL
);
```

#### PomodoroSession
```sql
CREATE TABLE "PomodoroSession" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  taskId TEXT,
  focusBlockId TEXT,
  type TEXT DEFAULT 'work',
  durationMinutes INT DEFAULT 25,
  startTime TIMESTAMP NOT NULL,
  endTime TIMESTAMP,
  completed BOOLEAN DEFAULT false,
  interrupted BOOLEAN DEFAULT false,
  note TEXT,
  calendarEventId TEXT,
  createdAt TIMESTAMP DEFAULT now()
);
```

#### JournalEntry
```sql
CREATE TABLE "JournalEntry" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT DEFAULT 'reflection',
  date TIMESTAMP NOT NULL,
  content TEXT NOT NULL,
  promptQuestion TEXT,
  sentimentScore REAL,
  sentimentLabel TEXT,
  tags TEXT[],
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL
);
```

#### Objective
```sql
CREATE TABLE "Objective" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  projectId TEXT,
  macroGoalId TEXT,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL,
  startDate TIMESTAMP NOT NULL,
  endDate TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'active',
  confidenceRating INT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL
);
```

#### KeyResult
```sql
CREATE TABLE "KeyResult" (
  id TEXT PRIMARY KEY,
  objectiveId TEXT NOT NULL,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  targetValue REAL NOT NULL,
  currentValue REAL DEFAULT 0,
  unit TEXT,
  isCompleted BOOLEAN DEFAULT false,
  confidenceRating INT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL
);
```

#### Review
```sql
CREATE TABLE "Review" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  period TEXT NOT NULL,
  startDate TIMESTAMP NOT NULL,
  endDate TIMESTAMP NOT NULL,
  financeSummary JSONB,
  taskSummary JSONB,
  habitSummary JSONB,
  journalSummary JSONB,
  pomodoroSummary JSONB,
  highlights TEXT[],
  lowlights TEXT[],
  actionItems TEXT[],
  emailSentAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP NOT NULL
);
```

---

## Testing

All features include comprehensive unit tests:

- `/src/app/api/__tests__/focus-blocks.test.ts`
- `/src/app/api/__tests__/journal.test.ts`
- `/src/app/api/__tests__/okrs.test.ts`

Run tests:
```bash
npm test
```

---

## Integration Points

### Metrics Dashboard
All features feed into the metrics dashboard:
- Pomodoro sessions contribute to daily focus time
- Journal sentiment affects wellbeing metrics
- Focus blocks show time allocation
- OKR progress tracks quarterly goals

### Calendar Sync
- Focus blocks auto-create calendar events
- Pomodoro sessions log to calendar
- Review reminders can be scheduled

### Task Management
- Focus blocks link to tasks
- Pomodoro sessions track time per task
- OKRs can drive task priorities

---

## Future Enhancements

1. **AI-powered insights** from journal sentiment
2. **Email notifications** for reviews
3. **Slack/Discord integration** for pomodoro sessions
4. **Advanced sentiment analysis** using ML models
5. **Team OKRs** with shared objectives
6. **Voice journaling** with speech-to-text
7. **Calendar conflict detection** for focus blocks
8. **Mobile app** for on-the-go time tracking

---

## Support

For issues or questions, refer to:
- [README.md](../README.md) - Setup and installation
- [SETUP.md](./SETUP.md) - Environment configuration
- [CHANGELOG.md](./CHANGELOG.md) - Version history
