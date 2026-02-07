import React from 'react';
import { Box, Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText, Chip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { RiskFactorsData } from '../api/api';

interface RiskFactorsProps {
    data: RiskFactorsData | null;
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

const RiskFactors: React.FC<RiskFactorsProps> = ({ data, loading }) => {
    if (loading || !data) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Top Risk Factors
                    </Typography>
                    <Typography color="text.secondary">Loading...</Typography>
                </CardContent>
            </Card>
        );
    }

    const riskItems = [];

    // Stale deals
    if (data.staleDeals.count > 0) {
        riskItems.push({
            severity: 'high',
            text: `${data.staleDeals.count} deals stuck over 30 days (${formatCurrency(data.staleDeals.totalValue)})`,
        });
    }

    // Underperforming reps
    data.underperformingReps.slice(0, 2).forEach(rep => {
        riskItems.push({
            severity: rep.winRate < 30 ? 'high' : 'medium',
            text: `${rep.rep_name} - Win Rate: ${rep.winRate}%`,
        });
    });

    // Low activity accounts
    if (data.lowActivityAccounts.length > 0) {
        riskItems.push({
            severity: 'medium',
            text: `${data.lowActivityAccounts.length} Accounts with no recent activity`,
        });
    }

    // Enterprise stale deals (highlight)
    const enterpriseDeals = data.staleDeals.deals.filter(d => d.amount > 50000);
    if (enterpriseDeals.length > 0) {
        riskItems.push({
            severity: 'high',
            text: `${enterpriseDeals.length} High-value deals at risk`,
        });
    }

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Top Risk Factors
                    </Typography>
                </Box>
                <List dense disablePadding>
                    {riskItems.slice(0, 5).map((item, index) => (
                        <ListItem key={index} disableGutters sx={{ py: 0.75 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <FiberManualRecordIcon
                                    sx={{
                                        fontSize: 12,
                                        color: item.severity === 'high' ? 'error.main' : 'warning.main',
                                    }}
                                />
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    sx: { lineHeight: 1.4 },
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
                {riskItems.length > 5 && (
                    <Chip
                        label={`+${riskItems.length - 5} more risks`}
                        size="small"
                        sx={{ mt: 1 }}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default RiskFactors;
