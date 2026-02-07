import { useState, useEffect } from 'react';
import {
  ThemeProvider, CssBaseline, Container, Box, Typography, AppBar, Toolbar, Grid,
  CircularProgress, FormControl, Select, MenuItem, InputLabel
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import theme from './theme';
import api from './api/api';
import type { SummaryData, DriversData, RiskFactorsData, RecommendationsData, QuarterParams } from './api/api';
import SummaryCard from './components/SummaryCard';
import RevenueDrivers from './components/RevenueDrivers';
import RiskFactors from './components/RiskFactors';
import Recommendations from './components/Recommendations';
import RevenueTrendChart from './components/RevenueTrendChart';
import PipelineDonutChart from './components/PipelineDonutChart';
import RepPerformanceChart from './components/RepPerformanceChart';

// Available quarters for dropdown
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const YEARS = ['2024', '2025', '2026'];

function App() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [drivers, setDrivers] = useState<DriversData | null>(null);
  const [riskFactors, setRiskFactors] = useState<RiskFactorsData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quarter selection state
  const [selectedQuarter, setSelectedQuarter] = useState('Q4');
  const [selectedYear, setSelectedYear] = useState('2025');

  const fetchData = async (params: QuarterParams) => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, driversData, riskData, recData] = await Promise.all([
        api.getSummary(params),
        api.getDrivers(params),
        api.getRiskFactors(params),
        api.getRecommendations(params),
      ]);

      setSummary(summaryData);
      setDrivers(driversData);
      setRiskFactors(riskData);
      setRecommendations(recData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data. Make sure the backend server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({ quarter: selectedQuarter, year: selectedYear });
  }, [selectedQuarter, selectedYear]);

  const handleQuarterChange = (event: { target: { value: string } }) => {
    setSelectedQuarter(event.target.value);
  };

  const handleYearChange = (event: { target: { value: string } }) => {
    setSelectedYear(event.target.value);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
        {/* Header */}
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ShowChartIcon sx={{ mr: 2 }} />
              <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                Revenue Intelligence Console
              </Typography>
            </Box>

            {/* Quarter Selector */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Quarter</InputLabel>
                <Select
                  value={selectedQuarter}
                  label="Quarter"
                  onChange={handleQuarterChange}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.8)',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white',
                    },
                  }}
                >
                  {QUARTERS.map(q => (
                    <MenuItem key={q} value={q}>{q}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Year</InputLabel>
                <Select
                  value={selectedYear}
                  label="Year"
                  onChange={handleYearChange}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.5)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.8)',
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white',
                    },
                  }}
                >
                  {YEARS.map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {error ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
              }}
            >
              <Typography color="error" variant="h6" gutterBottom>
                ⚠️ Connection Error
              </Typography>
              <Typography color="text.secondary" textAlign="center">
                {error}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Run <code>npm run dev</code> in the backend directory first.
              </Typography>
            </Box>
          ) : loading ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 400,
              }}
            >
              <CircularProgress size={48} />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                Loading dashboard data...
              </Typography>
            </Box>
          ) : (
            <>
              {/* Summary Banner */}
              <SummaryCard data={summary} loading={loading} />

              {/* Revenue Drivers */}
              <RevenueDrivers data={drivers} loading={loading} />

              {/* Risk Factors & Recommendations Row */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RiskFactors data={riskFactors} loading={loading} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Recommendations data={recommendations} loading={loading} />
                </Grid>
              </Grid>

              {/* Charts Row - Pipeline & Rep Performance */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <PipelineDonutChart data={drivers} loading={loading} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RepPerformanceChart data={riskFactors} loading={loading} />
                </Grid>
              </Grid>

              {/* Revenue Trend Chart */}
              <RevenueTrendChart data={drivers} loading={loading} />
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
