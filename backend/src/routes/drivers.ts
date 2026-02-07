import { Router } from 'express';
import { getDatabase } from '../db/database';

const router = Router();

interface DriversData {
    pipelineSize: number;
    pipelineChange: number;
    winRate: number;
    winRateChange: number;
    avgDealSize: number;
    avgDealSizeChange: number;
    salesCycleTime: number;
    salesCycleTimeChange: number;
    pipelineByStage: { stage: string; value: number; count: number }[];
    monthlyTrend: { month: string; revenue: number; target: number }[];
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

// Helper to get quarter info from query params
function getQuarterDates(quarter: string, year: string) {
    const quarterRanges: Record<string, { start: string; end: string; months: string[] }> = {
        Q1: { start: `${year}-01-01`, end: `${year}-03-31`, months: [`${year}-01`, `${year}-02`, `${year}-03`] },
        Q2: { start: `${year}-04-01`, end: `${year}-06-30`, months: [`${year}-04`, `${year}-05`, `${year}-06`] },
        Q3: { start: `${year}-07-01`, end: `${year}-09-30`, months: [`${year}-07`, `${year}-08`, `${year}-09`] },
        Q4: { start: `${year}-10-01`, end: `${year}-12-31`, months: [`${year}-10`, `${year}-11`, `${year}-12`] },
    };
    return quarterRanges[quarter];
}

function getPreviousQuarter(quarter: string, year: string) {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const idx = quarters.indexOf(quarter);
    if (idx === 0) {
        return { quarter: 'Q4', year: String(parseInt(year) - 1) };
    }
    return { quarter: quarters[idx - 1], year };
}

// Get 6 months ending with the current quarter's last month
function getLast6Months(quarter: string, year: string): string[] {
    const quarterEndMonth: Record<string, number> = { Q1: 3, Q2: 6, Q3: 9, Q4: 12 };
    const endMonth = quarterEndMonth[quarter];
    const months: string[] = [];

    for (let i = 5; i >= 0; i--) {
        let m = endMonth - i;
        let y = parseInt(year);
        while (m <= 0) {
            m += 12;
            y -= 1;
        }
        months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
    return months;
}

router.get('/', (req, res) => {
    try {
        const quarter = (req.query.quarter as string) || 'Q4';
        const year = (req.query.year as string) || '2025';

        const current = getQuarterDates(quarter, year);
        const prev = getPreviousQuarter(quarter, year);
        const previous = getQuarterDates(prev.quarter, prev.year);

        // Pipeline size - deals created within or before the quarter that are still open
        // Scoped to deals that existed during this quarter
        const currentPipeline = queryOne(`
            SELECT COALESCE(SUM(amount), 0) as value
            FROM deals
            WHERE stage IN ('Prospecting', 'Negotiation')
                AND amount IS NOT NULL
                AND created_at <= ?
                AND (closed_at IS NULL OR closed_at > ?)
        `, [current.end, current.end]) || { value: 0 };

        // Previous period pipeline (deals open at end of previous quarter)
        const previousPipeline = queryOne(`
            SELECT COALESCE(SUM(amount), 0) as value
            FROM deals
            WHERE stage IN ('Prospecting', 'Negotiation')
                AND amount IS NOT NULL
                AND created_at <= ?
                AND (closed_at IS NULL OR closed_at > ?)
        `, [previous.end, previous.end]) || { value: 0 };

        // Win rate calculation - deals closed in this quarter
        const currentWinLoss = queryOne(`
            SELECT 
                SUM(CASE WHEN stage = 'Closed Won' THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN stage IN ('Closed Won', 'Closed Lost') THEN 1 ELSE 0 END) as total
            FROM deals
            WHERE (closed_at >= ? AND closed_at <= ?)
                OR (closed_at IS NULL AND stage IN ('Closed Won', 'Closed Lost') AND created_at >= ? AND created_at <= ?)
        `, [current.start, current.end, current.start, current.end]) || { won: 0, total: 0 };

        const previousWinLoss = queryOne(`
            SELECT 
                SUM(CASE WHEN stage = 'Closed Won' THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN stage IN ('Closed Won', 'Closed Lost') THEN 1 ELSE 0 END) as total
            FROM deals
            WHERE closed_at >= ? AND closed_at <= ?
        `, [previous.start, previous.end]) || { won: 0, total: 0 };

        // Average deal size - deals closed won in this quarter
        const currentAvgDeal = queryOne(`
            SELECT COALESCE(AVG(amount), 0) as avg_amount
            FROM deals
            WHERE stage = 'Closed Won'
                AND amount IS NOT NULL
                AND (closed_at >= ? AND closed_at <= ?)
        `, [current.start, current.end]) || { avg_amount: 0 };

        const previousAvgDeal = queryOne(`
            SELECT COALESCE(AVG(amount), 0) as avg_amount
            FROM deals
            WHERE stage = 'Closed Won'
                AND amount IS NOT NULL
                AND closed_at >= ? AND closed_at <= ?
        `, [previous.start, previous.end]) || { avg_amount: 0 };

        // Sales cycle time - deals closed in this quarter
        const currentCycle = queryOne(`
            SELECT AVG(JULIANDAY(closed_at) - JULIANDAY(created_at)) as avg_days
            FROM deals
            WHERE stage = 'Closed Won'
                AND closed_at IS NOT NULL
                AND closed_at >= ? AND closed_at <= ?
        `, [current.start, current.end]) || { avg_days: null };

        const previousCycle = queryOne(`
            SELECT AVG(JULIANDAY(closed_at) - JULIANDAY(created_at)) as avg_days
            FROM deals
            WHERE stage = 'Closed Won'
                AND closed_at IS NOT NULL
                AND closed_at >= ? AND closed_at <= ?
        `, [previous.start, previous.end]) || { avg_days: null };

        // Pipeline by stage - deals open during this quarter
        const pipelineByStage = queryAll(`
            SELECT stage, COALESCE(SUM(amount), 0) as value, COUNT(*) as count
            FROM deals
            WHERE stage IN ('Prospecting', 'Negotiation')
                AND created_at <= ?
                AND (closed_at IS NULL OR closed_at > ?)
            GROUP BY stage
        `, [current.end, current.end]);

        // Last 6 months trend
        const months = getLast6Months(quarter, year);
        const monthlyTrend = months.map(month => {
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

            const targetResult = queryOne(`
                SELECT COALESCE(target, 0) as target
                FROM targets
                WHERE month = ?
            `, [month]);

            return {
                month,
                revenue: revenueResult.revenue,
                target: targetResult?.target || 0
            };
        });

        const currentWinRate = currentWinLoss.total > 0
            ? (currentWinLoss.won / currentWinLoss.total) * 100
            : 0;
        const previousWinRate = previousWinLoss.total > 0
            ? (previousWinLoss.won / previousWinLoss.total) * 100
            : 0;

        const pipelineChange = previousPipeline.value > 0
            ? ((currentPipeline.value - previousPipeline.value) / previousPipeline.value) * 100
            : 0;

        const avgDealSizeChange = previousAvgDeal.avg_amount > 0
            ? ((currentAvgDeal.avg_amount - previousAvgDeal.avg_amount) / previousAvgDeal.avg_amount) * 100
            : 0;

        const currentCycleTime = currentCycle.avg_days || 0;
        const previousCycleTime = previousCycle.avg_days || 0;
        const cycleTimeChange = previousCycleTime > 0
            ? currentCycleTime - previousCycleTime
            : 0;

        const drivers: DriversData = {
            pipelineSize: Math.round(currentPipeline.value),
            pipelineChange: Math.round(pipelineChange * 10) / 10,
            winRate: Math.round(currentWinRate * 10) / 10,
            winRateChange: Math.round((currentWinRate - previousWinRate) * 10) / 10,
            avgDealSize: Math.round(currentAvgDeal.avg_amount),
            avgDealSizeChange: Math.round(avgDealSizeChange * 10) / 10,
            salesCycleTime: Math.round(currentCycleTime) || 0,
            salesCycleTimeChange: Math.round(cycleTimeChange),
            pipelineByStage,
            monthlyTrend
        };

        res.json(drivers);
    } catch (error) {
        console.error('Error in /api/drivers:', error);
        res.status(500).json({ error: 'Failed to fetch revenue drivers' });
    }
});

export default router;
