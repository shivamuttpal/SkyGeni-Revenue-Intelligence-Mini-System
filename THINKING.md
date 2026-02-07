# THINKING.md - Revenue Intelligence Console

## What assumptions did you make?

### Time Period Assumptions
1. **Current Quarter**: Since the data spans 2025 and we're analyzing "current" performance, I assumed Q4 2025 (October-December) as the current quarter for calculations.

2. **Revenue Attribution**: Only deals with `stage = "Closed Won"` are counted as actual revenue. Deals in other stages contribute to pipeline but not revenue.

3. **Closed Date Logic**: For "Closed Won" deals with `closed_at = null`, I used `created_at` as a fallback to determine which period the deal belongs to.

### Metric Definitions
4. **Win Rate**: Calculated as `Closed Won / (Closed Won + Closed Lost)`. Deals still in pipeline (Prospecting/Negotiation) are excluded from this calculation.

5. **Stale Deals**: Defined as deals in Prospecting or Negotiation stage that have been open for more than 30 days.

6. **Low Activity Accounts**: Accounts with open deals but no activity (call/email/demo) in the last 14 days.

7. **Underperforming Reps**: Reps whose win rate is below the overall team average.

### Data Handling
8. **Null Amounts**: Deals with `amount = null` (approximately 30% of the dataset) are excluded from financial calculations but still counted in deal counts and win rates.

9. **Sales Cycle Time**: Calculated as days between `created_at` and `closed_at` for won deals that have both dates available.

---

## What data issues did you find?

### Inconsistencies Identified

1. **Closed Won with null closed_at**: Several deals marked as "Closed Won" have `closed_at: null` (e.g., D1, D16, D30). This is logically inconsistent - won deals should have a close date.

2. **Null Amounts**: ~30% of deals have `amount: null`. This could represent:
   - Early-stage deals where pricing isn't set
   - Data entry errors
   - Deals from systems that don't track amounts

3. **Prospecting Stage with closed_at Dates**: Some deals in "Prospecting" stage have `closed_at` dates (e.g., D2: Prospecting with closed_at: 2025-09-13). This suggests either:
   - Stage field wasn't updated when deal progressed
   - Data migration issues from source systems

4. **Future Dates**: Some `closed_at` dates extend into 2026 (e.g., D8: closed_at: 2026-03-05). These may be:
   - Projected close dates
   - Data entry errors
   - Testing data not cleaned up

5. **Activities Reference Non-Existent Deal IDs**: The activities.json contains deal_ids (like D182, D40) that exceed D600 but the deals.json only goes up to around D600. This is expected in a sampling scenario but affects activity analysis.

### Impact on Analysis
- Financial metrics may be understated due to null amounts
- Timeline analysis may be skewed by missing or inconsistent dates
- Activity-based insights have limited coverage

---

## What tradeoffs did you choose?

### Architecture Tradeoffs

1. **SQLite vs PostgreSQL**
   - **Chose**: SQLite (via sql.js in-memory with file persistence)
   - **Why**: Zero setup required, portable, perfect for a single-user demo
   - **Tradeoff**: Not suitable for production concurrent access

2. **Single-Page App vs Server-Side Rendering**
   - **Chose**: Client-side React SPA
   - **Why**: Simpler architecture, real-time feel, matches the "console" UX pattern
   - **Tradeoff**: Initial load is slower, requires JavaScript

3. **D3 vs Charting Libraries (Recharts, Victory)**
   - **Chose**: Raw D3.js as required
   - **Why**: Maximum flexibility, matches the assignment requirements
   - **Tradeoff**: More code to write, steeper learning curve

### Data Handling Tradeoffs

4. **Excluding Null Amounts vs Imputation**
   - **Chose**: Exclude from financial calculations
   - **Why**: Imputing values (average, median) could misrepresent actual performance
   - **Tradeoff**: Pipeline and revenue figures may be understated

5. **Fixed Quarter vs Dynamic**
   - **Chose**: Hardcoded Q4 2025 as "current"
   - **Why**: Dataset is fixed, and current date (Feb 2026) would require looking at Q1 2026 which has limited data
   - **Tradeoff**: Less flexible for real-world use

6. **Reference Date for Staleness**
   - **Chose**: Fixed reference date (2025-12-31)
   - **Why**: Consistent analysis point at end of data period
   - **Tradeoff**: "Stale" calculations are frozen in time

---

## What would break at 10× scale?

### Database Performance (6,000 deals → 60,000+ deals)

1. **Full Table Scans**: Current queries scan all deals for aggregations. At 10× scale:
   - Add composite indexes on (stage, closed_at, amount)
   - Implement materialized views for summary metrics
   - Consider partitioning by date

2. **In-Memory SQLite**: The sql.js approach loads entire DB into memory
   - Migrate to PostgreSQL or SQLite with file-based access
   - Implement connection pooling

### API Performance

3. **Synchronous Calculations**: All metrics calculated on each request
   - Implement caching (Redis) with time-based invalidation
   - Pre-calculate daily/weekly snapshots via background jobs
   - Add ETL pipeline for metric computation

4. **N+1 Queries**: Some calculations iterate over results
   - Batch queries or use window functions
   - Denormalize frequently-accessed aggregations

### Frontend Performance

5. **D3 Chart Rendering**: Currently renders full chart on every data update
   - Implement chart virtualization for large datasets
   - Use web workers for heavy calculations
   - Consider canvas rendering for charts with many data points

6. **Data Transfer**: All data sent to frontend
   - Implement pagination for list views
   - Add server-side filtering
   - Use GraphQL for selective field fetching

### Operational Concerns

7. **No Rate Limiting**: API is open
   - Add rate limiting middleware
   - Implement authentication/authorization

8. **No Monitoring**: No visibility into performance
   - Add APM (Application Performance Monitoring)
   - Implement structured logging
   - Set up alerting for slow queries

---

## What did AI help with vs what you decided?

### AI-Assisted (Claude/Copilot)

1. **Boilerplate Code Generation**
   - Express server setup and middleware configuration
   - TypeScript interfaces from JSON schema
   - Material UI component structure
   - D3 chart scaffolding

2. **SQL Query Construction**
   - Complex aggregation queries with CASE statements
   - Window functions for period-over-period comparisons
   - Subqueries for correlated data (last activity per account)

3. **Error Handling Patterns**
   - Try-catch structures for async operations
   - Null coalescing for missing data
   - TypeScript type guards

### Human Decisions (Me)

1. **Metric Definitions**
   - What constitutes "stale" (30 days)
   - Win rate formula (excluding pipeline)
   - Which quarter to analyze (Q4 2025)

2. **UX/Visual Design**
   - Dashboard layout and component hierarchy
   - Color coding for positive/negative indicators
   - Which metrics to highlight prominently

3. **Data Quality Handling**
   - Decision to exclude null amounts vs impute
   - How to handle inconsistent stage/closed_at combinations
   - Reference date selection

4. **Architecture Choices**
   - sql.js for cross-platform compatibility
   - Component structure and state management approach
   - API response shapes

5. **Business Logic**
   - Recommendation priority ordering
   - Risk factor severity thresholds
   - Which segments/reps to highlight

### Key Insight
AI excels at generating syntactically correct code quickly, but business logic, edge case handling, and architectural decisions require human judgment based on understanding the problem domain and intended use case.
