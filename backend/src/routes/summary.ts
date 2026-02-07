import { Router } from 'express';
import { getDatabase } from '../db/database';

const router = Router();

interface SummaryData {
  currentQuarterRevenue: number;
  target: number;
  gapPercent: number;
  gapAmount: number;
  qoqChange: number;
  yoyChange: number | null;
  quarterLabel: string;
  monthlyData: { month: string; revenue: number; target: number }[];
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

// Helper to get quarter info from query params or defaults
function getQuarterDates(quarter?: string, year?: string) {
  const q = quarter || 'Q4';
  const y = year || '2025';

  const quarterRanges: Record<string, { start: string; end: string; months: string[] }> = {
    Q1: { start: `${y}-01-01`, end: `${y}-03-31`, months: [`${y}-01`, `${y}-02`, `${y}-03`] },
    Q2: { start: `${y}-04-01`, end: `${y}-06-30`, months: [`${y}-04`, `${y}-05`, `${y}-06`] },
    Q3: { start: `${y}-07-01`, end: `${y}-09-30`, months: [`${y}-07`, `${y}-08`, `${y}-09`] },
    Q4: { start: `${y}-10-01`, end: `${y}-12-31`, months: [`${y}-10`, `${y}-11`, `${y}-12`] },
  };

  return {
    ...quarterRanges[q],
    label: `${q} ${y}`,
    quarter: q,
    year: y,
  };
}

function getPreviousQuarter(quarter: string, year: string) {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const idx = quarters.indexOf(quarter);
  if (idx === 0) {
    return { quarter: 'Q4', year: String(parseInt(year) - 1) };
  }
  return { quarter: quarters[idx - 1], year };
}

router.get('/', (req, res) => {
  try {
    // Get quarter and year from query params
    const quarter = (req.query.quarter as string) || 'Q4';
    const year = (req.query.year as string) || '2025';

    const current = getQuarterDates(quarter, year);
    const prev = getPreviousQuarter(quarter, year);
    const previous = getQuarterDates(prev.quarter, prev.year);
    const lastYear = getQuarterDates(quarter, String(parseInt(year) - 1));

    // Current quarter revenue (Closed Won deals)
    const currentRevenueResult = queryOne(`
            SELECT COALESCE(SUM(amount), 0) as revenue
            FROM deals
            WHERE stage = 'Closed Won'
                AND amount IS NOT NULL
                AND (
                    (closed_at >= ? AND closed_at <= ?)
                    OR (closed_at IS NULL AND created_at >= ? AND created_at <= ?)
                )
        `, [current.start, current.end, current.start, current.end]) || { revenue: 0 };

    // Previous quarter revenue
    const previousRevenueResult = queryOne(`
            SELECT COALESCE(SUM(amount), 0) as revenue
            FROM deals
            WHERE stage = 'Closed Won'
                AND amount IS NOT NULL
                AND (
                    (closed_at >= ? AND closed_at <= ?)
                    OR (closed_at IS NULL AND created_at >= ? AND created_at <= ?)
                )
        `, [previous.start, previous.end, previous.start, previous.end]) || { revenue: 0 };

    // Check for YoY data
    const lastYearRevenueResult = queryOne(`
            SELECT COALESCE(SUM(amount), 0) as revenue
            FROM deals
            WHERE stage = 'Closed Won'
                AND amount IS NOT NULL
                AND (closed_at >= ? AND closed_at <= ?)
        `, [lastYear.start, lastYear.end]) || { revenue: 0 };

    // Target for current quarter
    const targetResult = queryOne(`
            SELECT COALESCE(SUM(target), 0) as target
            FROM targets
            WHERE month IN (?, ?, ?)
        `, current.months) || { target: 0 };

    // Monthly breakdown
    const monthlyData = current.months.map(month => {
      const [yr, m] = month.split('-');
      const daysInMonth = new Date(parseInt(yr), parseInt(m), 0).getDate();
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-${daysInMonth}`;

      const revenueResult = queryOne(`
                SELECT COALESCE(SUM(amount), 0) as revenue
                FROM deals
                WHERE stage = 'Closed Won'
                    AND amount IS NOT NULL
                    AND (
                        (closed_at >= ? AND closed_at <= ?)
                        OR (closed_at IS NULL AND created_at >= ? AND created_at <= ?)
                    )
            `, [monthStart, monthEnd, monthStart, monthEnd]) || { revenue: 0 };

      const targetRes = queryOne(`
                SELECT COALESCE(target, 0) as target
                FROM targets
                WHERE month = ?
            `, [month]);

      return {
        month,
        revenue: revenueResult.revenue,
        target: targetRes?.target || 0
      };
    });

    const currentRevenue = currentRevenueResult.revenue;
    const previousRevenue = previousRevenueResult.revenue;
    const target = targetResult.target;
    const lastYearRevenue = lastYearRevenueResult.revenue;

    const gapAmount = target - currentRevenue;
    const gapPercent = target > 0 ? ((gapAmount / target) * 100) : 0;
    const qoqChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
    const yoyChange = lastYearRevenue > 0
      ? ((currentRevenue - lastYearRevenue) / lastYearRevenue) * 100
      : null;

    const summary: SummaryData = {
      currentQuarterRevenue: currentRevenue,
      target,
      gapPercent: Math.round(gapPercent * 10) / 10,
      gapAmount,
      qoqChange: Math.round(qoqChange * 10) / 10,
      yoyChange: yoyChange !== null ? Math.round(yoyChange * 10) / 10 : null,
      quarterLabel: current.label,
      monthlyData
    };

    res.json(summary);
  } catch (error) {
    console.error('Error in /api/summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

export default router;
