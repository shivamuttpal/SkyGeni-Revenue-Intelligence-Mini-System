# Revenue Intelligence Console

A single-page dashboard that helps a CRO (Chief Revenue Officer) understand quarterly revenue performance and identify focus areas.

![Dashboard Preview](./docs/dashboard-preview.png)

## Features

- **Summary Banner**: QTD Revenue, Target, Gap %, and QoQ Change
- **Revenue Drivers**: Pipeline Value, Win Rate, Avg Deal Size, Sales Cycle with sparkline trends
- **Risk Factors**: Stale deals, underperforming reps, low activity accounts
- **Recommendations**: 3-5 actionable AI-generated suggestions
- **Revenue Trend Chart**: 6-month bar chart with target line overlay

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | TypeScript, Express.js, Node.js |
| Database | SQLite (sql.js) |
| Frontend | React 18, TypeScript, Vite |
| UI Framework | Material UI v5 |
| Charting | D3.js |

## Project Structure

```
revenue-dashboard-assignment/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.ts    # SQLite setup
│   │   │   └── seed.ts        # Data loading
│   │   ├── routes/
│   │   │   ├── summary.ts     # GET /api/summary
│   │   │   ├── drivers.ts     # GET /api/drivers
│   │   │   ├── riskFactors.ts # GET /api/risk-factors
│   │   │   └── recommendations.ts # GET /api/recommendations
│   │   └── index.ts           # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── api.ts         # API client
│   │   ├── components/
│   │   │   ├── SummaryCard.tsx
│   │   │   ├── RevenueDrivers.tsx
│   │   │   ├── RiskFactors.tsx
│   │   │   ├── Recommendations.tsx
│   │   │   └── RevenueTrendChart.tsx
│   │   ├── App.tsx
│   │   └── theme.ts
│   └── package.json
├── data/
│   ├── accounts.json
│   ├── activities.json
│   ├── deals.json
│   ├── reps.json
│   └── targets.json
├── THINKING.md
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Seed the Database

```bash
cd backend
npm run seed
```

Expected output:
```
🌱 Starting database seeding...
✅ Inserted 120 accounts
✅ Inserted 15 reps
✅ Inserted 600 deals
✅ Inserted 250 activities
✅ Inserted 12 targets
💾 Database saved to disk
🎉 Database seeding completed!
```

### 3. Start the Backend Server

```bash
cd backend
npm run dev
```

Server runs on http://localhost:3001

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

App runs on http://localhost:5173

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/summary` | Quarter revenue, target, gap, QoQ change |
| `GET /api/drivers` | Pipeline, win rate, deal size, sales cycle |
| `GET /api/risk-factors` | Stale deals, underperformers, inactive accounts |
| `GET /api/recommendations` | 3-5 actionable suggestions |

### Example Response - `/api/summary`

```json
{
  "currentQuarterRevenue": 450000,
  "target": 630855,
  "gapPercent": 28.7,
  "gapAmount": 180855,
  "qoqChange": -5.2,
  "quarterLabel": "Q4 2025",
  "monthlyData": [...]
}
```

## Data Overview

- **120 Accounts** across SaaS, Ecommerce, FinTech, EdTech, Healthcare
- **15 Sales Reps** with varying performance
- **600 Deals** in various stages
- **250 Activities** (calls, emails, demos)
- **12 Monthly Targets** (~$2.6M total for 2025)

## Troubleshooting

### "Failed to load dashboard data"
1. Make sure the backend is running on port 3001
2. Check if the database was seeded correctly
3. Verify CORS is working (backend logs show requests)

### Database not found
Run `npm run seed` in the backend directory first.

### Port already in use
- Backend: Change `PORT` in environment or use a different port
- Frontend: Vite will automatically try the next available port

## License

MIT
