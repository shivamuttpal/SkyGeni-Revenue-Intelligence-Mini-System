import React, { useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import * as d3 from 'd3';
import type { RiskFactorsData } from '../api/api';

interface RepPerformanceChartProps {
    data: RiskFactorsData | null;
    loading: boolean;
}

const RepPerformanceChart: React.FC<RepPerformanceChartProps> = ({ data, loading }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data || loading) return;

        const reps = data.underperformingReps || [];
        if (reps.length === 0) return;

        // Clear previous chart
        d3.select(svgRef.current).selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 100 };
        const width = 450 - margin.left - margin.right;
        const height = Math.max(200, reps.length * 45) - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current)
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        // X scale
        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);

        // Y scale
        const y = d3.scaleBand()
            .domain(reps.map(d => d.rep_name))
            .range([0, height])
            .padding(0.3);

        // Add gridlines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisBottom(x)
                .tickSize(height)
                .tickFormat(() => '')
            )
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.1)
            .select('.domain')
            .remove();

        // Average line
        const avgWinRate = reps[0]?.avgWinRate || 50;
        svg.append('line')
            .attr('x1', x(avgWinRate))
            .attr('x2', x(avgWinRate))
            .attr('y1', 0)
            .attr('y2', height)
            .attr('stroke', '#2e7d32')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5');

        svg.append('text')
            .attr('x', x(avgWinRate) + 5)
            .attr('y', -5)
            .attr('fill', '#2e7d32')
            .style('font-size', '10px')
            .text(`Avg: ${avgWinRate}%`);

        // Bars
        svg.selectAll('.bar')
            .data(reps)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => y(d.rep_name)!)
            .attr('width', 0)
            .attr('height', y.bandwidth())
            .attr('fill', d => d.winRate < 30 ? '#d32f2f' : '#ed6c02')
            .attr('rx', 4)
            .transition()
            .duration(800)
            .attr('width', d => x(d.winRate));

        // Bar labels
        svg.selectAll('.bar-label')
            .data(reps)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => x(d.winRate) + 5)
            .attr('y', d => y(d.rep_name)! + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('fill', '#333')
            .text(d => `${d.winRate}%`);

        // Y axis
        svg.append('g')
            .call(d3.axisLeft(y))
            .select('.domain')
            .remove();

        svg.selectAll('.tick line').remove();
        svg.selectAll('.tick text')
            .style('font-size', '12px');

        // X axis
        svg.append('g')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d => `${d}%`))
            .select('.domain')
            .remove();

    }, [data, loading]);

    if (loading || !data) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Rep Performance (Below Average)
                    </Typography>
                    <Typography color="text.secondary">Loading...</Typography>
                </CardContent>
            </Card>
        );
    }

    const reps = data.underperformingReps || [];

    if (reps.length === 0) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Rep Performance
                    </Typography>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography color="success.main" variant="body1">
                            🎉 All reps are performing above average!
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Rep Performance (Below Average)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Win rate comparison for underperforming reps
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                    <svg ref={svgRef}></svg>
                </Box>
            </CardContent>
        </Card>
    );
};

export default RepPerformanceChart;
