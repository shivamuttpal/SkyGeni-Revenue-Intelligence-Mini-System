const API_BASE_URL = 'http://localhost:3001/api';

export interface SummaryData {
    currentQuarterRevenue: number;
    target: number;
    gapPercent: number;
    gapAmount: number;
    qoqChange: number;
    yoyChange: number | null;
    quarterLabel: string;
    monthlyData: { month: string; revenue: number; target: number }[];
}

export interface DriversData {
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

export interface RiskFactorsData {
    staleDeals: {
        count: number;
        totalValue: number;
        deals: { deal_id: string; account_name: string; amount: number; days_stale: number; stage: string }[];
    };
    underperformingReps: {
        rep_id: string;
        rep_name: string;
        winRate: number;
        dealsWon: number;
        dealsLost: number;
        avgWinRate: number;
    }[];
    lowActivityAccounts: {
        account_id: string;
        account_name: string;
        segment: string;
        openDeals: number;
        totalValue: number;
        lastActivityDate: string | null;
        daysSinceActivity: number;
    }[];
    summary: {
        staleDealsCount: number;
        underperformingRepsCount: number;
        lowActivityAccountsCount: number;
    };
}

export interface Recommendation {
    id: string;
    priority: 'high' | 'medium' | 'low';
    category: 'deals' | 'reps' | 'accounts' | 'pipeline';
    title: string;
    description: string;
    impact: string;
    metric?: string;
}

export interface RecommendationsData {
    recommendations: Recommendation[];
    totalRecommendations: number;
}

export interface QuarterParams {
    quarter: string;
    year: string;
}

async function fetchApi<T>(endpoint: string, params?: QuarterParams): Promise<T> {
    let url = `${API_BASE_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams({
            quarter: params.quarter,
            year: params.year,
        });
        url += `?${searchParams.toString()}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
}

export const api = {
    getSummary: (params?: QuarterParams) => fetchApi<SummaryData>('/summary', params),
    getDrivers: (params?: QuarterParams) => fetchApi<DriversData>('/drivers', params),
    getRiskFactors: (params?: QuarterParams) => fetchApi<RiskFactorsData>('/risk-factors', params),
    getRecommendations: (params?: QuarterParams) => fetchApi<RecommendationsData>('/recommendations', params),
};

export default api;
