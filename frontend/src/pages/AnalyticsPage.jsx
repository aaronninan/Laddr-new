import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AnalyticsPage = () => {
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState('');
  const [budgetRange, setBudgetRange] = useState([0, 1000000]);
  const [selectedPropertyType, setSelectedPropertyType] = useState('Residential');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('Low Risk');
  const [selectedStrategy, setSelectedStrategy] = useState('Capital Appreciation');
  const [selectedHorizon, setSelectedHorizon] = useState('Short-Term (1-3 years)');
  const [timeframe, setTimeframe] = useState('5 Years');

  const [comparedProperties, setComparedProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState({
    totalProperties: 0,
    avgPrice: 0,
    avgPricePerSqFt: 0,
    totalValue: 0
  });

  const [amenitiesAnalysis, setAmenitiesAnalysis] = useState({
    popularAmenities: [],
    keyAmenitiesImpact: {
      avgPriceWithLift: 0,
      avgPriceWithParking: 0,
      avgPriceWithSecurity: 0
    }
  });

  const [possessionStatus, setPossessionStatus] = useState([]);

  const [priceTrends, setPriceTrends] = useState({
    current: 0,
    last5Years: 0,
    data: {
      '5': [],
      '10': [],
      '20': []
    }
  });

  // Load cities on mount and set default selected city from CSV
  useEffect(() => {
    const loadCities = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/cities`);
        const cities = res.data || [];
        setAvailableCities(cities);
        if (cities.length > 0 && !selectedCity) {
          setSelectedCity(cities[0]);
        }
      } catch (e) {
        console.error('Error loading cities', e);
      }
    };
    loadCities();
  }, []);

  // Fetch historical price trends data and available locations
  useEffect(() => {
    const fetchHistoricalPriceTrends = async () => {
      if (!selectedCity) return;
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/historical-price-trends`, {
          params: { years: timeframe.split(' ')[0], city: selectedCity }
        });
        const data = response.data;

        if (data.length > 0) {
          // Transform data to match expected structure: { location: [{year, price}] }
          const aggregatedData = {};
          data.forEach(trend => {
            if (trend.location && trend.data) {
              aggregatedData[trend.location] = trend.data.map(item => ({
                year: item.year,
                price: Math.round(item.price)
              }));
            }
          });

          // Extract unique locations for the "Add City" functionality
          const locations = Object.keys(aggregatedData);
          setAvailableLocations(locations);

          if (locations.length > 0) {
            const firstLocation = locations[0];
            const chartData = aggregatedData[firstLocation];

            setPriceTrends(prev => ({
              ...prev,
              data: {
                ...prev.data,
                [timeframe.split(' ')[0]]: chartData
              }
            }));

            // Calculate current and last 5 years growth
            if (chartData.length >= 2) {
              const latest = chartData[chartData.length - 1].price;
              const oldest = chartData[0].price;
              const growth = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;

              setPriceTrends(prev => ({
                ...prev,
                current: Math.round(growth),
                last5Years: Math.round(growth)
              }));
            }
          } else {
            // No data available
            setPriceTrends(prev => ({
              ...prev,
              data: {
                ...prev.data,
                [timeframe.split(' ')[0]]: []
              },
              current: 0,
              last5Years: 0
            }));
          }
        } else {
          // No data available
          setPriceTrends(prev => ({
            ...prev,
            data: {
              ...prev.data,
              [timeframe.split(' ')[0]]: []
            },
            current: 0,
            last5Years: 0
          }));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching historical price trends:', error);
        setPriceTrends(prev => ({
          ...prev,
          data: {
            ...prev.data,
            [timeframe.split(' ')[0]]: []
          },
          current: 0,
          last5Years: 0
        }));
        setLoading(false);
      }
    };

    fetchHistoricalPriceTrends();
  }, [timeframe, selectedCity]);

  // Fetch summary, ROI forecast, rental yield, amenities analysis, possession status
  useEffect(() => {
    const loadAll = async () => {
      if (!selectedCity) return;
      try {
        const [summaryRes, roiRes, yieldRes, amenitiesRes, possessionRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/summary`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/roi-forecast`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/rental-yield`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/amenities-analysis`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/possession-status`, { params: { city: selectedCity } })
        ]);

        setSummary({
          totalProperties: summaryRes.data.totalProperties || 0,
          avgPrice: summaryRes.data.avgPrice || 0,
          avgPricePerSqFt: summaryRes.data.avgPricePerSqFt || 0,
          totalValue: summaryRes.data.totalValue || 0
        });

        setRoiForecast(roiRes.data || { current: 0, projectedCAGR: 0, data: [] });
        setRentalYield(yieldRes.data || { average: 0, change: 0, data: [] });
        setAmenitiesAnalysis(amenitiesRes.data || { popularAmenities: [], keyAmenitiesImpact: {} });
        setPossessionStatus(possessionRes.data || []);
      } catch (e) {
        console.error('Error loading analytics data', e);
      }
    };
    loadAll();
  }, [selectedCity]);

  const [roiForecast, setRoiForecast] = useState({
    current: 12.3,
    projectedCAGR: 2.1,
    data: [
      { period: '1 Year', value: 8.5 },
      { period: '3 Years', value: 10.2 },
      { period: '5 Years', value: 12.3 },
      { period: '10 Years', value: 15.8 }
    ]
  });

  const [rentalYield, setRentalYield] = useState({
    average: 6.8,
    change: 0.5,
    data: [
      { neighborhood: 'Neighborhood A', value: 7.2 },
      { neighborhood: 'Neighborhood B', value: 6.8 },
      { neighborhood: 'Neighborhood C', value: 6.5 },
      { neighborhood: 'Neighborhood D', value: 6.1 }
    ]
  });

  const [riskFactors, setRiskFactors] = useState([
    { name: 'Flood Risk', level: 'Low' },
    { name: 'Crime/Safety', level: 'Medium' },
    { name: 'Market Volatility', level: 'High' },
    { name: 'Economic Stability', level: 'Stable' }
  ]);

  const [recommendations, setRecommendations] = useState([
    {
      id: 1,
      title: 'Oceanview Villa',
      name: 'Oceanview Villa',
      neighborhood: 'Coastal District',
      image: '/api/placeholder/300/200',
      currentPrice: 850000,
      priceTrend: '+12.5% over 5 years',
      predictedGrowth: 52.4,
      rentalYield: 6.2,
      riskLevel: 'Low',
      riskScore: 2,
      paybackPeriod: 8,
      maintenanceCost: 12000
    },
    {
      id: 2,
      title: 'Downtown Heights',
      name: 'Downtown Heights',
      neighborhood: 'Financial District',
      image: '/api/placeholder/300/200',
      currentPrice: 1200000,
      priceTrend: '+8.3% over 5 years',
      predictedGrowth: 34.7,
      rentalYield: 7.2,
      riskLevel: 'Medium',
      riskScore: 4,
      paybackPeriod: 10,
      maintenanceCost: 18000
    },
    {
      id: 3,
      title: 'Suburban Retreat',
      name: 'Suburban Retreat',
      neighborhood: 'Green Valley',
      image: '/api/placeholder/300/200',
      currentPrice: 650000,
      priceTrend: '+15.7% over 5 years',
      predictedGrowth: 28.9,
      rentalYield: 5.8,
      riskLevel: 'Low',
      riskScore: 3,
      paybackPeriod: 12,
      maintenanceCost: 9500
    }
  ]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-red-100 text-red-800';
      case 'Stable': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCombinedChartData = () => {
    const timeframeKey = timeframe.split(' ')[0];
    
    if (comparedProperties.length > 0) {
      const years = comparedProperties[0].data[timeframeKey]?.map(item => item.year) || [];
      return years.map(year => {
        const dataPoint = { year };
        comparedProperties.forEach(property => {
          const propertyData = property.data[timeframeKey]?.find(item => item.year === year);
          if (propertyData) {
            dataPoint[property.name] = propertyData.price;
          }
        });
        return dataPoint;
      });
    }
    
    // Return single location data if no comparisons
    if (priceTrends.data[timeframeKey] && priceTrends.data[timeframeKey].length > 0) {
      return priceTrends.data[timeframeKey];
    }
    
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Investment Dashboard</h1>
          <p className="text-gray-600 text-lg">
            Analyze property investments with interactive widgets and visualizations
          </p>
        </div>

        {/* Summary Statistics */}
        {selectedCity && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Properties</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalProperties.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🏠</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Price</p>
                  <p className="text-2xl font-bold text-gray-900">₹{summary.avgPrice.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Price per Sqft</p>
                  <p className="text-2xl font-bold text-gray-900">₹{summary.avgPricePerSqFt.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📐</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Market Value</p>
                  <p className="text-2xl font-bold text-gray-900">₹{(summary.totalValue / 1000000).toFixed(1)}M</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters & Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select City/Region</label>
              <select 
                value={selectedCity} 
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a city</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget Range</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="range" 
                  min="0" 
                  max="2000000" 
                  step="50000"
                  value={budgetRange[1]}
                  onChange={(e) => setBudgetRange([budgetRange[0], parseInt(e.target.value)])}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600">₹{budgetRange[1].toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="mt-6 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Property Type</h4>
              <div className="flex space-x-2">
                {['Residential', 'Commercial', 'Mixed-Use'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedPropertyType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedPropertyType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Level</h4>
              <div className="flex space-x-2">
                {['Low Risk', 'Medium Risk', 'High Risk'].map((risk) => (
                  <button
                    key={risk}
                    onClick={() => setSelectedRiskLevel(risk)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedRiskLevel === risk
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {risk}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Investment Strategy</h4>
              <div className="flex space-x-2">
                {['Capital Appreciation', 'Rental Income', 'Balanced'].map((strategy) => (
                  <button
                    key={strategy}
                    onClick={() => setSelectedStrategy(strategy)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedStrategy === strategy
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {strategy}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Investment Horizon</h4>
              <div className="flex space-x-2">
                {['Short-Term (1-3 years)', 'Mid-Term (3-5 years)', 'Long-Term (5+ years)'].map((horizon) => (
                  <button
                    key={horizon}
                    onClick={() => setSelectedHorizon(horizon)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedHorizon === horizon
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {horizon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Historical Price Trends */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Historical Price Trends</h3>
            <div className="flex space-x-2">
              {['City', 'Region', 'Property Type'].map((filter) => (
                <button key={filter} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center mb-6">
            <div className="text-4xl font-bold text-gray-900 mr-4">
              {priceTrends.current > 0 ? '+' : ''}{priceTrends.current}%
            </div>
            <div className={`text-sm ${priceTrends.last5Years >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Last {timeframe} {priceTrends.last5Years >= 0 ? '+' : ''}{priceTrends.last5Years}%
            </div>
          </div>

          <div className="h-64 bg-white rounded-lg border mb-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading price trends...</p>
              </div>
            ) : priceTrends.data[timeframe.split(' ')[0]]?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getCombinedChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Price']} />
                  <Legend />
                  {comparedProperties.length > 0 ? (
                    comparedProperties.map((property) => (
                      <Line
                        key={property.id}
                        type="monotone"
                        dataKey={property.name}
                        stroke={property.color}
                        strokeWidth={2}
                        name={property.name}
                      />
                    ))
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Average Price"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No data available. Please select a city.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {['5 Years', '10 Years', '20 Years'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeframe(period)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeframe === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (comparedProperties.length > 0) {
                    setComparedProperties(comparedProperties.slice(0, -1));
                  }
                }}
                disabled={comparedProperties.length === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  comparedProperties.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                - Remove City
              </button>
              <button
                onClick={() => {
                  try {
                    if (availableLocations.length > 0) {
                      const nextLocation = availableLocations.find(loc =>
                        !comparedProperties.some(cp => cp.name === loc)
                      );
                      if (nextLocation) {
                        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
                        const newProperty = {
                          id: Date.now(),
                          name: nextLocation,
                          color: colors[comparedProperties.length % colors.length],
                          data: priceTrends.data
                        };
                        setComparedProperties([...comparedProperties, newProperty]);
                      }
                    }
                  } catch (error) {
                    console.error('Error fetching location data:', error);
                    alert('Error loading location data. Please try again.');
                  }
                }}
                disabled={availableLocations.length === 0 || comparedProperties.length >= 5}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  comparedProperties.length >= 5 || !selectedCity
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title={!selectedCity ? 'Please select a city first' : comparedProperties.length >= 5 ? 'Maximum 5 locations can be compared' : 'Add a location to compare'}
              >
                + Add Location {availableLocations.length > 0 && `(${availableLocations.length} available)`}
              </button>
            </div>
          </div>
        </div>

        {/* Top Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ROI Forecast</h3>
          
          <div className="flex items-center mb-6">
            <div className="text-4xl font-bold text-gray-900 mr-4">{roiForecast.current}%</div>
            <div className="text-sm text-green-600">Projected CAGR +{roiForecast.projectedCAGR}%</div>
          </div>
          
          <div className="h-48 bg-white rounded-lg border">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roiForecast.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'ROI']} />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Amenities Impact */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Amenities Impact on Pricing</h3>
            
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {amenitiesAnalysis.popularAmenities?.slice(0, 4).map((amenity, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900">{amenity._id}</h4>
                <p className="text-sm text-gray-600">{amenity.count} properties</p>
                <p className="text-sm text-green-600">₹{amenity.avgPrice?.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h4 className="font-semibold text-gray-900 mb-4">Key Amenities Price Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h5 className="font-medium text-gray-900">With Lift</h5>
                <p className="text-lg font-bold text-green-600">₹{amenitiesAnalysis.keyAmenitiesImpact?.avgPriceWithLift?.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-gray-900">With Parking</h5>
                <p className="text-lg font-bold text-blue-600">₹{amenitiesAnalysis.keyAmenitiesImpact?.avgPriceWithParking?.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h5 className="font-medium text-gray-900">With Security</h5>
                <p className="text-lg font-bold text-purple-600">₹{amenitiesAnalysis.keyAmenitiesImpact?.avgPriceWithSecurity?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Possession Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Possession Status Analysis</h3>
            
          </div>
          <div className="h-48 bg-white rounded-lg border mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rentalYield.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="neighborhood" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}%`, 'Yield']} />
                <Legend />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {possessionStatus.slice(0, 2).map((status, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900">{status._id}</h4>
                <p className="text-sm text-gray-600">{status.count} properties</p>
                <p className="text-sm text-green-600">Avg: ₹{status.avgPrice?.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bedroom Analysis */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {riskFactors.map((risk, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">{risk.name}</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(risk.level)}`}>
                  {risk.level}
                </span>
              </div>
            ))}
          </div>
        </div>



        {/* Neighborhood Rankings */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((property) => (
              <div key={property.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={selectedProperties.some(p => p.id === property.id)}
                    onChange={() => {
                      const isSelected = selectedProperties.some(p => p.id === property.id);
                      if (isSelected) {
                        setSelectedProperties(selectedProperties.filter(p => p.id !== property.id));
                      } else if (selectedProperties.length < 3) {
                        setSelectedProperties([...selectedProperties, property]);
                      }
                    }}
                    className="mr-2"
                  />
                  <h4 className="font-semibold text-gray-900">{property.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">{property.neighborhood}</p>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Price:</span>
                    <span className="font-semibold text-gray-900">${property.currentPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Price Trend:</span>
                    <span className="font-semibold text-green-600">{property.priceTrend}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Predicted Growth:</span>
                    <span className="font-semibold text-blue-600">{property.predictedGrowth}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rental Yield:</span>
                    <span className="font-semibold text-purple-600">{property.rentalYield}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Risk Level:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(property.riskLevel)}`}>
                      {property.riskLevel}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payback Period:</span>
                    <span className="font-semibold text-gray-900">{property.paybackPeriod} years</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate('/compare', { state: { selectedProperties } })}
              disabled={selectedProperties.length === 0}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                selectedProperties.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Compare Selected ({selectedProperties.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsPage;
