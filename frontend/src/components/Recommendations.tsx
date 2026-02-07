import React from 'react';
import { Box, Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import type { RecommendationsData } from '../api/api';

interface RecommendationsProps {
    data: RecommendationsData | null;
    loading: boolean;
}

const getPriorityColor = (priority: string): string => {
    switch (priority) {
        case 'high':
            return '#d32f2f';
        case 'medium':
            return '#ed6c02';
        case 'low':
            return '#2e7d32';
        default:
            return '#757575';
    }
};

const Recommendations: React.FC<RecommendationsProps> = ({ data, loading }) => {
    if (loading || !data) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                        Recommended Actions
                    </Typography>
                    <Typography color="text.secondary">Loading...</Typography>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <LightbulbOutlinedIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Recommended Actions
                    </Typography>
                </Box>
                <List dense disablePadding>
                    {data.recommendations.map((rec, index) => (
                        <ListItem key={rec.id} disableGutters sx={{ py: 0.75, alignItems: 'flex-start' }}>
                            <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                                <CheckCircleOutlineIcon
                                    sx={{
                                        fontSize: 18,
                                        color: getPriorityColor(rec.priority),
                                    }}
                                />
                            </ListItemIcon>
                            <ListItemText
                                primary={rec.title}
                                secondary={rec.metric && `(${rec.metric})`}
                                primaryTypographyProps={{
                                    variant: 'body2',
                                    sx: { fontWeight: 500, lineHeight: 1.4 },
                                }}
                                secondaryTypographyProps={{
                                    variant: 'caption',
                                    sx: { color: 'text.secondary' },
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
};

export default Recommendations;
