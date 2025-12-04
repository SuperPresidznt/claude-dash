# API Reference - Structure Is Grace

Complete API documentation for all endpoints.

## Table of Contents

- [Knowledge & Learning](#knowledge--learning)
- [Wellbeing & Health](#wellbeing--health)
- [Finance - Scenario Planning](#finance---scenario-planning)
- [Social & Accountability](#social--accountability)
- [Automation & Intelligence](#automation--intelligence)
- [Plaid Integration](#plaid-integration)

---

## Knowledge & Learning

### Resources

#### `GET /api/knowledge/resources`
Fetch all resources with optional filters.

**Query Parameters:**
- `type` - Filter by type (article, video, book, podcast, course, other)
- `category` - Filter by category
- `macroGoalId` - Filter by linked macro goal
- `projectId` - Filter by linked project
- `isFavorite` - Filter favorites only (true/false)

**Response:**
```json
[
  {
    "id": "res_123",
    "title": "Advanced TypeScript Patterns",
    "type": "article",
    "url": "https://example.com/article",
    "category": "Programming",
    "tags": ["typescript", "patterns"],
    "isFavorite": true,
    "readingSessions": [...],
    "flashCards": [...]
  }
]
```

#### `POST /api/knowledge/resources`
Create a new resource.

**Request Body:**
```json
{
  "title": "Resource Title",
  "url": "https://example.com",
  "type": "article",
  "category": "Tech",
  "description": "Optional description",
  "macroGoalId": "goal_123",
  "projectId": "proj_123",
  "tags": ["tag1", "tag2"]
}
```

### Reading Sessions

#### `GET /api/knowledge/reading-sessions`
Fetch reading sessions with optional filters.

**Query Parameters:**
- `resourceId` - Filter by resource
- `startDate` - Filter from date (ISO 8601)
- `endDate` - Filter to date (ISO 8601)

**Response:**
```json
{
  "sessions": [...],
  "totalMinutes": 450,
  "count": 15
}
```

#### `POST /api/knowledge/reading-sessions`
Log a reading session.

**Request Body:**
```json
{
  "resourceId": "res_123",
  "startTime": "2025-01-01T10:00:00Z",
  "endTime": "2025-01-01T10:30:00Z",
  "minutes": 30,
  "progress": 50,
  "notes": "Completed chapter 3"
}
```

### Flash Cards

#### `GET /api/knowledge/flashcards`
Fetch flash cards with optional filters.

**Query Parameters:**
- `status` - Filter by status (new, learning, review, mastered)
- `dueOnly` - Show only cards due for review (true/false)

#### `POST /api/knowledge/flashcards`
Create a new flash card.

**Request Body:**
```json
{
  "resourceId": "res_123",
  "front": "What is closure in JavaScript?",
  "back": "A closure is a function that has access to variables from an outer function...",
  "tags": ["javascript", "fundamentals"]
}
```

#### `POST /api/knowledge/flashcards/:id/review`
Review a flash card and update spaced repetition schedule.

**Request Body:**
```json
{
  "quality": 4
}
```

**Quality Scale (SM-2 Algorithm):**
- 0: Complete blackout
- 1: Incorrect, but familiar
- 2: Incorrect, but easy to recall correct answer
- 3: Correct, but required significant effort
- 4: Correct, with some hesitation
- 5: Perfect recall

---

## Wellbeing & Health

### Check-ins

#### `GET /api/wellbeing/check-ins`
Fetch wellbeing check-ins.

**Query Parameters:**
- `startDate` - From date (ISO 8601)
- `endDate` - To date (ISO 8601)

**Response:**
```json
{
  "checkIns": [...],
  "averages": {
    "sleepHours": 7.5,
    "stressLevel": 4.2
  }
}
```

#### `POST /api/wellbeing/check-ins`
Create or update daily check-in.

**Request Body:**
```json
{
  "date": "2025-01-01T00:00:00Z",
  "sleepHours": 7.5,
  "sleepQuality": 8,
  "mood": "good",
  "energy": "high",
  "stressLevel": 3,
  "physicalHealth": 7,
  "notes": "Feeling great today"
}
```

**Enums:**
- `mood`: very_low, low, neutral, good, excellent
- `energy`: exhausted, low, moderate, high, energized

### Correlations

#### `GET /api/wellbeing/correlations`
Calculate correlations between wellbeing and productivity metrics.

**Query Parameters:**
- `days` - Number of days to analyze (default: 30)

**Response:**
```json
{
  "dataPoints": [...],
  "correlations": {
    "sleepVsTasks": 0.67,
    "sleepVsPomodoros": 0.54,
    "stressVsTasks": -0.42,
    "energyVsPomodoros": 0.71
  },
  "insights": [
    "Better sleep is positively correlated with task completion",
    "Higher energy levels correlate with more focused work sessions"
  ]
}
```

### Wearables

#### `GET /api/wellbeing/wearables`
Fetch connected wearable devices and metrics.

#### `POST /api/wellbeing/wearables`
Connect a wearable device.

**Request Body:**
```json
{
  "provider": "apple_health",
  "encryptedAuth": "encrypted_credentials"
}
```

### Micro-Breaks

#### `GET /api/wellbeing/micro-breaks`
Fetch scheduled micro-breaks.

**Query Parameters:**
- `upcoming` - Show only upcoming breaks (true/false)

#### `POST /api/wellbeing/micro-breaks`
Schedule micro-breaks.

**Request Body (Single):**
```json
{
  "scheduledAt": "2025-01-01T14:00:00Z",
  "type": "mindful",
  "duration": 5,
  "note": "Deep breathing"
}
```

**Request Body (Auto-Schedule):**
```json
{
  "autoSchedule": true,
  "interval": 90,
  "count": 4,
  "startTime": "2025-01-01T09:00:00Z",
  "type": "stretch",
  "duration": 5
}
```

---

## Finance - Scenario Planning

### Runway Projection

#### `GET /api/finance/scenarios/runway`
Calculate financial runway based on current assets and burn rate.

**Response:**
```json
{
  "currentLiquidCents": 1000000,
  "avgMonthlyNetCents": -200000,
  "avgMonthlyBurnRateCents": 200000,
  "runwayMonths": 5,
  "runwayDate": "2025-06",
  "projections": [
    { "month": 1, "balanceCents": 800000, "date": "2025-02" },
    ...
  ],
  "isHealthy": false,
  "alert": "Critical: Less than 3 months runway"
}
```

### Debt Payoff Calculator

#### `POST /api/finance/scenarios/debt-payoff`
Calculate debt payoff schedule using different strategies.

**Request Body:**
```json
{
  "strategy": "avalanche",
  "monthlyPaymentCents": 100000,
  "customOrder": ["debt1", "debt2"]
}
```

**Strategies:**
- `snowball` - Pay smallest balances first
- `avalanche` - Pay highest APR first
- `custom` - Custom order

**Response:**
```json
{
  "strategy": "avalanche",
  "totalDebtCents": 500000,
  "monthlyPaymentCents": 100000,
  "monthsToPayoff": 8,
  "totalInterestPaidCents": 15000,
  "totalPaidCents": 515000,
  "schedule": [
    {
      "month": 1,
      "payments": [...],
      "remainingBalances": [...]
    }
  ],
  "debts": [...]
}
```

### Sensitivity Analysis

#### `POST /api/finance/scenarios/sensitivity`
Analyze impact of income/expense changes.

**Request Body:**
```json
{
  "incomeChangePercent": -20,
  "expenseChangePercent": -10,
  "timeHorizonMonths": 12
}
```

**Response:**
```json
{
  "baseline": {
    "monthlyIncomeCents": 500000,
    "monthlyExpensesCents": 400000,
    "monthlyNetCents": 100000
  },
  "scenario": {
    "incomeChangePercent": -20,
    "expenseChangePercent": -10,
    "monthlyIncomeCents": 400000,
    "monthlyExpensesCents": 360000,
    "monthlyNetCents": 40000
  },
  "impact": {
    "monthlyCents": -60000,
    "annualCents": -720000,
    "percentChange": -60.0
  },
  "projections": [...],
  "insights": [...]
}
```

---

## Social & Accountability

### Partners

#### `GET /api/social/partners`
Fetch accountability partners.

#### `POST /api/social/partners`
Invite an accountability partner.

**Request Body:**
```json
{
  "partnerEmail": "partner@example.com",
  "permissions": ["dashboard_view", "goals_view", "habits_view"],
  "notes": "College friend, checking in weekly"
}
```

**Permissions:**
- `dashboard_view` - View high-level dashboard
- `finance_summary` - View finance summary (not details)
- `goals_view` - View goals and OKRs
- `habits_view` - View habit tracking
- `tasks_view` - View task list
- `full_access` - Full read access

### Co-Working Sessions

#### `POST /api/social/coworking`
Create a co-working session.

**Request Body:**
```json
{
  "title": "Morning Focus Session",
  "description": "Deep work on project X",
  "scheduledStart": "2025-01-01T09:00:00Z",
  "scheduledEnd": "2025-01-01T11:00:00Z",
  "participantEmails": ["friend@example.com"]
}
```

### Weekly Recaps

#### `POST /api/social/recaps/generate`
Generate weekly recap.

**Request Body:**
```json
{
  "weekOffset": 0
}
```

**Response:**
```json
{
  "id": "recap_123",
  "weekStart": "2025-01-01T00:00:00Z",
  "weekEnd": "2025-01-07T23:59:59Z",
  "content": {
    "tasks": { "completed": 15, "highPriority": 5 },
    "habits": { "completions": 28 },
    "focus": { "pomodoroSessions": 20, "totalMinutes": 500 },
    "wellbeing": { "checkIns": 7, "avgSleep": 7.5 },
    "finance": { "inflow": 500000, "outflow": 350000 }
  }
}
```

---

## Automation & Intelligence

### Rules

#### `GET /api/automation/rules`
Fetch all automation rules.

#### `POST /api/automation/rules`
Create automation rule.

**Request Body:**
```json
{
  "name": "Low Runway Alert",
  "description": "Alert when runway drops below 3 months",
  "conditionType": "runway_low",
  "conditionConfig": { "threshold": 3 },
  "actionType": "create_task",
  "actionConfig": {
    "taskTitle": "Review financial situation",
    "priority": "urgent"
  },
  "isEnabled": true
}
```

**Condition Types:**
- `runway_low` - Financial runway below threshold
- `habit_streak_broken` - Habit not completed
- `budget_exceeded` - Budget category exceeded
- `task_overdue` - Task past due date
- `goal_progress_stalled` - No progress on goal
- `wellbeing_declining` - Wellbeing metrics trending down

**Action Types:**
- `send_alert` - Create notification
- `create_task` - Auto-create task
- `schedule_review` - Schedule review session
- `send_email` - Send email notification
- `trigger_webhook` - Call external webhook

#### `POST /api/automation/rules/evaluate`
Manually evaluate all rules.

**Response:**
```json
{
  "evaluatedRules": 5,
  "triggeredRules": 2,
  "results": [
    {
      "ruleId": "rule_123",
      "ruleName": "Low Runway Alert",
      "triggered": true,
      "actionResult": { "success": true, "taskId": "task_456" }
    }
  ]
}
```

### AI Copilot

#### `POST /api/ai/copilot`
Chat with AI copilot.

**Request Body:**
```json
{
  "conversationId": "conv_123",
  "message": "What are my top priorities this week?",
  "context": {
    "includeGoals": true,
    "includeTasks": true
  }
}
```

**Response:**
```json
{
  "conversationId": "conv_123",
  "response": "Based on your goals and tasks, your top priorities are..."
}
```

### Natural Language Capture

#### `POST /api/ai/nl-capture`
Process natural language input.

**Request Body:**
```json
{
  "input": "Log $45 groceries yesterday"
}
```

**Response:**
```json
{
  "success": true,
  "parsed": {
    "type": "cashflow",
    "amount": 4500,
    "direction": "outflow",
    "category": "groceries",
    "description": "groceries",
    "date": "2024-12-31T00:00:00Z",
    "confidence": 0.7
  },
  "entityType": "cashflow",
  "entityId": "txn_123"
}
```

---

## Plaid Integration

### Link Token

#### `POST /api/plaid/link-token`
Generate Plaid Link token.

**Response:**
```json
{
  "link_token": "link-production-abc123",
  "expiration": "2025-01-01T12:00:00Z"
}
```

### Exchange Token

#### `POST /api/plaid/exchange-token`
Exchange public token for access token.

**Request Body:**
```json
{
  "publicToken": "public-production-xyz789"
}
```

**Response:**
```json
{
  "connectionId": "conn_123",
  "institution": "Chase Bank"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": [...] // Optional validation details
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation failed)
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error
