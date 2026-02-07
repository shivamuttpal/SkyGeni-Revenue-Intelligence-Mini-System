import { Router } from 'express';
import { getDatabase } from '../db/database';

const router = Router();

interface Recommendation {
    id: string;
    priority: 'high' | 'medium' | 'low';
    category: 'deals' | 'reps' | 'accounts' | 'pipeline';
    title: string;
    description: string;
    impact: string;
    metric?: string;
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
        const recommendations: Recommendation[] = [];

        // 1. Enterprise deals aging - open during this quarter
        const enterpriseAgingDeals = queryOne(`
            SELECT COUNT(*) as count, COALESCE(SUM(d.amount), 0) as value
            FROM deals d
            JOIN accounts a ON d.account_id = a.account_id
            WHERE d.stage IN ('Prospecting', 'Negotiation')
                AND a.segment = 'Enterprise'
                AND d.created_at <= ?
                AND (d.closed_at IS NULL OR d.closed_at > ?)
                AND JULIANDAY(?) - JULIANDAY(d.created_at) > 30
                AND d.amount IS NOT NULL
        `, [current.end, current.start, referenceDate]) || { count: 0, value: 0 };

        if (enterpriseAgingDeals.count > 0) {
            recommendations.push({
                id: 'rec-1',
                priority: 'high',
                category: 'deals',
                title: 'Focus on aging Enterprise deals',
                description: `${enterpriseAgingDeals.count} Enterprise deals worth $${Math.round(enterpriseAgingDeals.value / 1000)}K have been open for over 30 days.`,
                impact: `Potential to close $${Math.round(enterpriseAgingDeals.value / 1000)}K in revenue`,
                metric: `${enterpriseAgingDeals.count} deals`
            });
        }

        // 2. Rep with lowest win rate - based on deals closed in this quarter
        const worstRep = queryOne(`
            SELECT 
                r.name as rep_name,
                SUM(CASE WHEN d.stage = 'Closed Won' AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN d.stage IN ('Closed Won', 'Closed Lost') AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END) as total,
                CAST(SUM(CASE WHEN d.stage = 'Closed Won' AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END) AS FLOAT) /
                NULLIF(SUM(CASE WHEN d.stage IN ('Closed Won', 'Closed Lost') AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END), 0) * 100 as win_rate
            FROM reps r
            JOIN deals d ON r.rep_id = d.rep_id
            GROUP BY r.rep_id, r.name
            HAVING total >= 3
            ORDER BY win_rate ASC
            LIMIT 1
        `, [current.start, current.end, current.start, current.end, current.start, current.end, current.start, current.end]);

        if (worstRep && worstRep.win_rate !== null && worstRep.win_rate < 40) {
            recommendations.push({
                id: 'rec-2',
                priority: 'high',
                category: 'reps',
                title: `Coach ${worstRep.rep_name} on win rate`,
                description: `${worstRep.rep_name} has a ${Math.round(worstRep.win_rate)}% win rate in ${quarter} ${year}, below team average.`,
                impact: 'Improving win rate by 10% could add significant revenue',
                metric: `${Math.round(worstRep.win_rate)}% win rate`
            });
        }

        // 3. Segment performance - based on deals closed in this quarter
        const segmentPerformance = queryAll(`
            SELECT 
                a.segment,
                SUM(CASE WHEN d.stage IN ('Prospecting', 'Negotiation') AND d.created_at <= ? AND (d.closed_at IS NULL OR d.closed_at > ?) THEN 1 ELSE 0 END) as open_deals,
                COALESCE(SUM(CASE WHEN d.stage IN ('Prospecting', 'Negotiation') AND d.created_at <= ? AND (d.closed_at IS NULL OR d.closed_at > ?) THEN d.amount ELSE 0 END), 0) as pipeline_value,
                CAST(SUM(CASE WHEN d.stage = 'Closed Won' AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END) AS FLOAT) /
                NULLIF(SUM(CASE WHEN d.stage IN ('Closed Won', 'Closed Lost') AND d.closed_at >= ? AND d.closed_at <= ? THEN 1 ELSE 0 END), 0) * 100 as win_rate
            FROM accounts a
            JOIN deals d ON a.account_id = d.account_id
            GROUP BY a.segment
        `, [current.end, current.start, current.end, current.start, current.start, current.end, current.start, current.end]);

        const worstSegment = segmentPerformance
            .filter(seg => seg.win_rate !== null)
            .reduce((worst, seg) =>
                (seg.win_rate || 100) < (worst?.win_rate || 100) ? seg : worst, segmentPerformance[0]);

        if (worstSegment && worstSegment.pipeline_value > 0) {
            recommendations.push({
                id: 'rec-3',
                priority: 'medium',
                category: 'accounts',
                title: `Increase activity for ${worstSegment.segment} segment`,
                description: `${worstSegment.segment} segment has ${worstSegment.open_deals} open deals worth $${Math.round(worstSegment.pipeline_value / 1000)}K.`,
                impact: 'Strategic focus could improve segment conversion',
                metric: `${Math.round(worstSegment.win_rate || 0)}% win rate`
            });
        }

        // 4. Inactive accounts - deals open during this quarter
        const inactiveAccounts = queryOne(`
            SELECT COUNT(DISTINCT a.account_id) as count
            FROM accounts a
            JOIN deals d ON a.account_id = d.account_id
            WHERE d.stage IN ('Prospecting', 'Negotiation')
                AND d.created_at <= ?
                AND (d.closed_at IS NULL OR d.closed_at > ?)
                AND NOT EXISTS (
                    SELECT 1 FROM activities act
                    JOIN deals deal ON act.deal_id = deal.deal_id
                    WHERE deal.account_id = a.account_id
                        AND act.timestamp >= ? AND act.timestamp <= ?
                        AND JULIANDAY(?) - JULIANDAY(act.timestamp) <= 14
                )
        `, [current.end, current.start, current.start, current.end, referenceDate]) || { count: 0 };

        if (inactiveAccounts.count > 5) {
            recommendations.push({
                id: 'rec-4',
                priority: 'medium',
                category: 'accounts',
                title: 'Increase outreach to inactive accounts',
                description: `${inactiveAccounts.count} accounts with open deals have had no recent activity in ${quarter} ${year}.`,
                impact: 'Prevents deal stagnation and potential loss',
                metric: `${inactiveAccounts.count} accounts`
            });
        }

        // 5. Negotiation stage quick wins - deals open during this quarter
        const negotiationDeals = queryOne(`
            SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as value
            FROM deals
            WHERE stage = 'Negotiation'
                AND amount IS NOT NULL
                AND created_at <= ?
                AND (closed_at IS NULL OR closed_at > ?)
        `, [current.end, current.start]) || { count: 0, value: 0 };

        if (negotiationDeals.count > 3) {
            recommendations.push({
                id: 'rec-5',
                priority: 'high',
                category: 'deals',
                title: 'Accelerate negotiation-stage deals',
                description: `${negotiationDeals.count} deals worth $${Math.round(negotiationDeals.value / 1000)}K are in negotiation stage.`,
                impact: `Potential quick wins: $${Math.round(negotiationDeals.value / 1000)}K`,
                metric: `${negotiationDeals.count} deals`
            });
        }

        const priorityOrder = { high: 0, medium: 1, low: 2 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        res.json({
            recommendations: recommendations.slice(0, 5),
            totalRecommendations: recommendations.length
        });
    } catch (error) {
        console.error('Error in /api/recommendations:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});

export default router;
