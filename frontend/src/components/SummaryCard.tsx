import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { SummaryData } from '../api/api';

interface SummaryCardProps {
    data: SummaryData | null;
    loading: boolean;
}

const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
};

const SummaryCard: React.FC<SummaryCardProps> = ({ data, loading }) => {
    if (loading || !data) {
        return (
            <Paper
                sx={{
                    background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                    color: 'white',
                    p: 3,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 100,
                }}
            >
                <Typography>Loading summary...</Typography>
            </Paper>
        );
    }

    const isAhead = data.gapAmount <= 0;
    const gapText = isAhead
        ? `+${Math.abs(data.gapPercent)}% ahead`
        : `-${Math.abs(data.gapPercent)}% to Goal`;

    return (
        <Paper
            sx={{
                background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
                color: 'white',
                p: 3,
                mb: 3,
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                {/* QTD Revenue */}
                <Box sx={{ textAlign: 'center', minWidth: 200 }}>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
                        QTD Revenue
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {formatCurrency(data.currentQuarterRevenue)}
                    </Typography>
                </Box>

                {/* Target */}
                <Box sx={{ textAlign: 'center', minWidth: 150 }}>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
                        Target
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {formatCurrency(data.target)}
                    </Typography>
                </Box>

                {/* Gap */}
                <Box sx={{ textAlign: 'center', minWidth: 150 }}>
                    <Chip
                        label={gapText}
                        sx={{
                            backgroundColor: isAhead ? 'rgba(46, 125, 50, 0.3)' : 'rgba(211, 47, 47, 0.3)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '1rem',
                            height: 36,
                            px: 1,
                        }}
                        icon={
                            isAhead ? (
                                <TrendingUpIcon sx={{ color: '#81c784 !important' }} />
                            ) : (
                                <TrendingDownIcon sx={{ color: '#ef9a9a !important' }} />
                            )
                        }
                    />
                </Box>

                {/* QoQ Change */}
                <Box sx={{ textAlign: 'center', minWidth: 120 }}>
                    <Typography variant="body2" sx={{ opacity: 0.8, mb: 0.5 }}>
                        QoQ Change
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        {data.qoqChange >= 0 ? (
                            <TrendingUpIcon sx={{ color: '#81c784' }} />
                        ) : (
                            <TrendingDownIcon sx={{ color: '#ef9a9a' }} />
                        )}
                        <Typography
                            variant="h6"
                            sx={{ color: data.qoqChange >= 0 ? '#81c784' : '#ef9a9a' }}
                        >
                            {data.qoqChange >= 0 ? '+' : ''}{data.qoqChange}%
                        </Typography>
                    </Box>
                </Box>

                {/* Quarter Label */}
                <Box sx={{ textAlign: 'center', minWidth: 100 }}>
                    <Chip
                        label={data.quarterLabel}
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'white',
                            fontWeight: 500,
                        }}
                    />
                </Box>
            </Box>
        </Paper>
    );
};

export default SummaryCard;
