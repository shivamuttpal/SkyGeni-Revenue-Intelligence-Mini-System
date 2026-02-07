import React, { useRef, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import * as d3 from 'd3';
import type { DriversData } from '../api/api';

interface RevenueDriversProps {
    data: DriversData | null;
    loading: boolean;
}

const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString()}`;
};

interface SparklineProps {
    data: number[];
    color: string;
    width?: number;
    height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color, width = 80, height = 30 }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const xScale = d3.scaleLinear()
            .domain([0, data.length - 1])
            .range([2, width - 2]);

        const yScale = d3.scaleLinear()
            .domain([d3.min(data) || 0, d3.max(data) || 0])
            .range([height - 2, 2]);

        const line = d3.line<number>()
            .x((_, i) => xScale(i))
            .y(d => yScale(d))
            .curve(d3.curveMonotoneX);

        const area = d3.area<number>()
            .x((_, i) => xScale(i))
            .y0(height)
            .y1(d => yScale(d))
            .curve(d3.curveMonotoneX);

        svg.append('path')
            .datum(data)
            .attr('fill', `${color}20`)
            .attr('d', area);

        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2)
            .attr('d', line);
    }, [data, color, width, height]);

    return <svg ref={svgRef} width={width} height={height} />;
};

interface DriverCardProps {
    title: string;
    value: string;
    change: number;
    changeLabel: string;
    sparklineData: number[];
    color: string;
}

const DriverCard: React.FC<DriverCardProps> = ({
    title,
    value,
    change,
    changeLabel,
    sparklineData,
    color,
}) => {
    const isPositive = change >= 0;
    const TrendIcon = isPositive ? TrendingUpIcon : TrendingDownIcon;

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                        {value}
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            color: isPositive ? 'success.main' : 'error.main',
                        }}
                    >
                        <TrendIcon sx={{ fontSize: 18, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {isPositive ? '+' : ''}{changeLabel}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ mt: 1 }}>
                    <Sparkline data={sparklineData} color={color} />
                </Box>
            </CardContent>
        </Card>
    );
};

const RevenueDrivers: React.FC<RevenueDriversProps> = ({ data, loading }) => {
    if (loading || !data) {
        return (
            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Revenue Drivers
                </Typography>
                <Typography color="text.secondary">Loading...</Typography>
            </Box>
        );
    }

    // Generate sparkline data from monthly trend
    const revenueData = data.monthlyTrend.map(m => m.revenue);

    // Create synthetic sparkline data for other metrics
    const generateRandomTrend = (baseValue: number, count: number = 6): number[] => {
        const result = [];
        let val = baseValue * 0.8;
        for (let i = 0; i < count; i++) {
            val = val * (0.95 + Math.random() * 0.15);
            result.push(val);
        }
        result[result.length - 1] = baseValue;
        return result;
    };

    const pipelineData = generateRandomTrend(data.pipelineSize);
    const winRateData = generateRandomTrend(data.winRate);
    const dealSizeData = generateRandomTrend(data.avgDealSize);
    const cycleData = generateRandomTrend(data.salesCycleTime);

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Revenue Drivers
            </Typography>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <DriverCard
                        title="Pipeline Value"
                        value={formatCurrency(data.pipelineSize)}
                        change={data.pipelineChange}
                        changeLabel={`${data.pipelineChange}%`}
                        sparklineData={pipelineData}
                        color="#1976d2"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <DriverCard
                        title="Win Rate"
                        value={`${data.winRate}%`}
                        change={data.winRateChange}
                        changeLabel={`${data.winRateChange}%`}
                        sparklineData={winRateData}
                        color="#2e7d32"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <DriverCard
                        title="Avg Deal Size"
                        value={formatCurrency(data.avgDealSize)}
                        change={data.avgDealSizeChange}
                        changeLabel={`${data.avgDealSizeChange}%`}
                        sparklineData={dealSizeData}
                        color="#9c27b0"
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <DriverCard
                        title="Sales Cycle"
                        value={`${data.salesCycleTime} Days`}
                        change={-data.salesCycleTimeChange}
                        changeLabel={`${Math.abs(data.salesCycleTimeChange)} Days`}
                        sparklineData={cycleData}
                        color="#ed6c02"
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default RevenueDrivers;
