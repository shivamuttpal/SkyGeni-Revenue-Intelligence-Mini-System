import { Router } from 'express';
import { getDatabase } from '../db/database';

const router = Router();

interface StaleDeals {
  count: number;
  totalValue: number;
  deals: { deal_id: string; account_name: string; amount: number; days_stale: number; stage: string }[];
}

interface UnderperformingRep {
  rep_id: string;
  rep_name: string;
  winRate: number;
  dealsWon: number;
  dealsLost: number;
  avgWinRate: number;
}

interface LowActivityAccount {
  account_id: string;
  account_name: string;
  segment: string;
  openDeals: number;
  totalValue: number;
  lastActivityDate: string | null;
  daysSinceActivity: number;
}

interface RiskFactorsData {
  staleDeals: StaleDeals;
  underperformingReps: UnderperformingRep[];
  lowActivityAccounts: LowActivityAccount[];
  summary: {
    staleDealsCount: number;
    underperformingRepsCount: number;
    lowActivityAccountsCount: number;
  };
}

function queryOne(sql: string, params: any[] = []): any {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function queryAll(sql: string, params: any[] = []): any[] {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Get quarter date range
function getQuarterDates(quarter: string, year: string) {
  const quarterRanges: Record<string, { start: string; end: string }> = {
    Q1: { start: `${year}-01-01`, end: `${year}-03-31` },
    Q2: { start: `${year}-04-01`, end: `${year}-06-30` },
    Q3: { start: `${year}-07-01`, end: `${year}-09-30` },
    Q4: { start: `${year}-10-01`, end: `${year}-12-31` },
  };
  return quarterRanges[quarter];
}

router.get('/', (req, res) => {
  try {
    const quarter = (req.query.quarter as string) || 'Q4';
    const year = (req.query.year as string) || '2025';

    const current = getQuarterDates(quarter, year);
    const referenceDate = current.end;
    const staleThresholdDays = 30;
    const activityThresholdDays = 14;

    // 1. Stale Deals - deals that were open during this quarter and stale
    const staleDealsResult = queryAll(`
            SELECT 
                d.deal_id,
                a.name as account_name,
                d.amount,
                d.stage,
                CAST(JULIANDAY(?) - JULIANDAY(d.created_at) AS INTEGER) as days_open
            FROM deals d
            JOIN accounts a ON d.account_id = a.account_id
            WHERE d.stage IN ('Prospecting', 'Negotiation')
                AND d.created_at <= ?
                AND (d.closed_at IS NULL OR d.closed_at > ?)
                AND JULIANDAY(?) - JULIANDAY(d.created_at) > ?
                AND d.amount IS NOT NULL
            ORDER BY d.amount DESC
            LIMIT 10
        `, [referenceDate, current.end, current.start, referenceDate, staleThresholdDays]);

    const staleDeals: StaleDeals = {
      count: staleDealsResult.length,
      totalValue: staleDealsResult.reduce((sum, d) => sum + (d.amount || 0), 0),
      deals: staleDealsResult.map(d => ({
        deal_id: d.deal_id,
        account_name: d.account_name,
        amount: d.amount || 0,
        days_stale: d.days_open,
        stage: d.stage
      }))
    };

    const totalStaleCount = queryOne(`
            SELECT COUNT(*) as count
            FROM deals d
            WHERE d.stage IN ('Prospecting', 'Negotiation')
                AND d.created_at <= ?
                AND (d.closed_at IS NULL OR d.closed_at > ?)
                AND JULIANDAY(?) - JULIANDAY(d.created_at) > ?
        `, [current.end, current.start, referenceDate, staleThresholdDays]) || { count: 0 };
    staleDeals.count = totalStaleCount.count;

    // 2. Underperforming Reps - based on deals closed in this quarter
    const avgWinRateResult = queryOne(`
            SELECT 
                CAST(SUM(CASE WHEN stage = 'Closed Won' THEN 1 ELSE 0 END) AS FLOAT) /
                NULLIF(SUM(CASE WHEN stage IN ('Closed Won', 'Closed Lost') THEN 1 ELSE 0 END), 0) * 100 as avg_win_rate
            FROM deals
            WHERE stage IN ('Closed Won', 'Closed Lost')
                AND (closed_at >= ? AND closed_at <= ?)
        `, [current.start, current.end]) || { avg_win_rate: 50 };

    const avgWinRate = avgWinRateResult.avg_win_rate || 50;

    const repPerformance = queryAll(`
            SELECT 
                r.rep_id,
                r.name as rep_name,
                SUM(CASE WHEN d.stage = 'Closed Won' AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN d.stage = 'Closed Lost' AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END) as lost,
                SUM(CASE WHEN d.stage IN ('Closed Won', 'Closed Lost') AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END) as total
            FROM reps r
            LEFT JOIN deals d ON r.rep_id = d.rep_id
            GROUP BY r.rep_id, r.name
            HAVING total > 0
        `, [current.start, current.end, current.start, current.end, current.start, current.end]);

    const underperformingReps: UnderperformingRep[] = repPerformance
      .map(rep => {
        const winRate = rep.total > 0 ? (rep.won / rep.total) * 100 : 0;
        return {
          rep_id: rep.rep_id,
          rep_name: rep.rep_name,
          winRate: Math.round(winRate * 10) / 10,
          dealsWon: rep.won,
          dealsLost: rep.lost,
          avgWinRate: Math.round(avgWinRate * 10) / 10
        };
      })
      .filter(rep => rep.winRate < avgWinRate)
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 5);

    // 3. Low Activity Accounts - accounts with open deals during this quarter
    const lowActivityResult = queryAll(`
            SELECT 
                a.account_id,
                a.name as account_name,
                a.segment,
                COUNT(DISTINCT d.deal_id) as open_deals,
                COALESCE(SUM(d.amount), 0) as total_value,
                (
                    SELECT MAX(act.timestamp)
                    FROM activities act
                    JOIN deals deal ON act.deal_id = deal.deal_id
                    WHERE deal.account_id = a.account_id
                        AND act.timestamp <= ?
                ) as last_activity_date
            FROM accounts a
            JOIN deals d ON a.account_id = d.account_id
            WHERE d.stage IN ('Prospecting', 'Negotiation')
                AND d.created_at <= ?
                AND (d.closed_at IS NULL OR d.closed_at > ?)
            GROUP BY a.account_id, a.name, a.segment
            HAVING last_activity_date IS NULL 
                OR JULIANDAY(?) - JULIANDAY(last_activity_date) > ?
            ORDER BY total_value DESC
            LIMIT 15
        `, [referenceDate, current.end, current.start, referenceDate, activityThresholdDays]);

    const lowActivityAccounts: LowActivityAccount[] = lowActivityResult.map(acc => {
      const daysSince = acc.last_activity_date
        ? Math.round((new Date(referenceDate).getTime() - new Date(acc.last_activity_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return {
        account_id: acc.account_id,
        account_name: acc.account_name,
        segment: acc.segment,
        openDeals: acc.open_deals,
        totalValue: acc.total_value,
        lastActivityDate: acc.last_activity_date,
        daysSinceActivity: daysSince
      };
    });

    const riskFactors: RiskFactorsData = {
      staleDeals,
      underperformingReps,
      lowActivityAccounts,
      summary: {
        staleDealsCount: staleDeals.count,
        underperformingRepsCount: underperformingReps.length,
        lowActivityAccountsCount: lowActivityAccounts.length
      }
    };

    res.json(riskFactors);
  } catch (error) {
    console.error('Error in /api/risk-factors:', error);
    res.status(500).json({ error: 'Failed to fetch risk factors' });
  }
});

export default router;
