import React, { useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import * as d3 from 'd3';
import type { DriversData } from '../api/api';

interface PipelineDonutChartProps {
    data: DriversData | null;
    loading: boolean;
}

const COLORS = ['#1a237e', '#3949ab', '#5c6bc0', '#7986cb', '#9fa8da'];

const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
};

const PipelineDonutChart: React.FC<PipelineDonutChartProps> = ({ data, loading }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || !data || loading) return;

        const pipelineData = data.pipelineByStage || [];
        if (pipelineData.length === 0) return;

        // Clear previous chart
        d3.select(svgRef.current).selectAll('*').remove();

        const width = 280;
        const height = 280;
        const radius = Math.min(width, height) / 2 - 10;
        const innerRadius = radius * 0.6;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        const pie = d3.pie<any>()
            .value(d => d.value)
            .sort(null);

        const arc = d3.arc<any>()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        const hoverArc = d3.arc<any>()
            .innerRadius(innerRadius)
            .outerRadius(radius + 8);

        const arcs = svg.selectAll('.arc')
            .data(pie(pipelineData))
            .enter()
            .append('g')
            .attr('class', 'arc');

        arcs.append('path')
            .attr('d', arc)
            .attr('fill', (_, i) => COLORS[i % COLORS.length])
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', hoverArc);
            })
            .on('mouseout', function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arc);
            });

        // Center text
        const total = pipelineData.reduce((sum, d) => sum + d.value, 0);
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.5em')
            .style('font-size', '24px')
            .style('font-weight', '600')
            .style('fill', '#1a237e')
            .text(formatCurrency(total));

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '1.5em')
            .style('font-size', '12px')
            .style('fill', '#666')
            .text('Total Pipeline');

    }, [data, loading]);

    if (loading || !data) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Pipeline by Stage
                    </Typography>
                    <Typography color="text.secondary">Loading...</Typography>
                </CardContent>
            </Card>
        );
    }

    const pipelineData = data.pipelineByStage || [];

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Pipeline by Stage
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <svg ref={svgRef}></svg>
                    <Box sx={{ ml: 2 }}>
                        {pipelineData.map((item, index) => (
                            <Box key={item.stage} sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: COLORS[index % COLORS.length],
                                        mr: 1.5,
                                    }}
                                />
                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {item.stage}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatCurrency(item.value)} ({item.count} deals)
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default PipelineDonutChart;
