import React, { useRef, useEffect } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import * as d3 from 'd3';
import type { DriversData } from '../api/api';

interface RevenueTrendChartProps {
    data: DriversData | null;
    loading: boolean;
}

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data, loading }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || !data || loading) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = 280;
        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        svg.attr('width', width).attr('height', height);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const monthlyData = data.monthlyTrend;

        // Scales
        const xScale = d3.scaleBand()
            .domain(monthlyData.map(d => d.month))
            .range([0, innerWidth])
            .padding(0.3);

        const maxValue = Math.max(
            d3.max(monthlyData, d => d.revenue) || 0,
            d3.max(monthlyData, d => d.target) || 0
        ) * 1.1;

        const yScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([innerHeight, 0]);

        // Grid lines
        g.append('g')
            .attr('class', 'grid')
            .call(
                d3.axisLeft(yScale)
                    .ticks(5)
                    .tickSize(-innerWidth)
                    .tickFormat(() => '')
            )
            .selectAll('line')
            .attr('stroke', '#e0e0e0')
            .attr('stroke-dasharray', '3,3');

        g.selectAll('.grid .domain').remove();

        // X-axis
        const formatMonth = (month: string) => {
            const [year, m] = month.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return monthNames[parseInt(m) - 1];
        };

        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).tickFormat((d: any) => formatMonth(d)))
            .selectAll('text')
            .attr('fill', '#666')
            .attr('font-size', '12px');

        // Y-axis
        g.append('g')
            .call(
                d3.axisLeft(yScale)
                    .ticks(5)
                    .tickFormat((d: any) => {
                        if (d >= 1000000) return `$${d / 1000000}M`;
                        if (d >= 1000) return `$${d / 1000}K`;
                        return `$${d}`;
                    })
            )
            .selectAll('text')
            .attr('fill', '#666')
            .attr('font-size', '12px');

        // Remove domain lines
        g.selectAll('.domain').attr('stroke', '#e0e0e0');

        // Bars (Revenue)
        g.selectAll('.bar')
            .data(monthlyData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.month) || 0)
            .attr('y', d => yScale(d.revenue))
            .attr('width', xScale.bandwidth())
            .attr('height', d => innerHeight - yScale(d.revenue))
            .attr('fill', '#1976d2')
            .attr('rx', 4);

        // Line (Target)
        const line = d3.line<{ month: string; target: number }>()
            .x(d => (xScale(d.month) || 0) + xScale.bandwidth() / 2)
            .y(d => yScale(d.target))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(monthlyData)
            .attr('fill', 'none')
            .attr('stroke', '#ff9800')
            .attr('stroke-width', 3)
            .attr('d', line);

        // Dots on line
        g.selectAll('.dot')
            .data(monthlyData)
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => (xScale(d.month) || 0) + xScale.bandwidth() / 2)
            .attr('cy', d => yScale(d.target))
            .attr('r', 5)
            .attr('fill', '#ff9800')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);

        // Legend
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${height - 10})`);

        legend.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 16)
            .attr('height', 12)
            .attr('fill', '#1976d2')
            .attr('rx', 2);

        legend.append('text')
            .attr('x', 22)
            .attr('y', 10)
            .attr('font-size', '12px')
            .attr('fill', '#666')
            .text('Revenue');

        legend.append('line')
            .attr('x1', 100)
            .attr('y1', 6)
            .attr('x2', 130)
            .attr('y2', 6)
            .attr('stroke', '#ff9800')
            .attr('stroke-width', 3);

        legend.append('circle')
            .attr('cx', 115)
            .attr('cy', 6)
            .attr('r', 4)
            .attr('fill', '#ff9800');

        legend.append('text')
            .attr('x', 138)
            .attr('y', 10)
            .attr('font-size', '12px')
            .attr('fill', '#666')
            .text('Target');

    }, [data, loading]);

    if (loading || !data) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Revenue Trend (Last 6 Months)
                    </Typography>
                    <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">Loading chart...</Typography>
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Revenue Trend (Last 6 Months)
                </Typography>
                <Box ref={containerRef} sx={{ width: '100%' }}>
                    <svg ref={svgRef} style={{ display: 'block' }} />
                </Box>
            </CardContent>
        </Card>
    );
};

export default RevenueTrendChart;
