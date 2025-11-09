import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = () => {
  // Basic user & portfolio state
  const [user, setUser] = useState({ name: 'User' });
  const [metrics, setMetrics] = useState({ propertiesSaved: 0, averageROI: 0, rentalYield: 0, riskIndex: '—' });

  // Analytics state (pulled from the analytics endpoints)
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [timeframe, setTimeframe] = useState('5 Years');
  const [loading, setLoading] = useState(true);

  const [priceTrends, setPriceTrends] = useState({ current: 0, last5Years: 0, data: { '5': [], '10': [], '20': [] } });
  const [roiForecast, setRoiForecast] = useState({ current: 0, projectedCAGR: 0, data: [] });
  const [rentalYield, setRentalYield] = useState({ average: 0, data: [] });
  const [possessionStatus, setPossessionStatus] = useState([]);
  const [amenitiesAnalysis, setAmenitiesAnalysis] = useState({ popularAmenities: [], keyAmenitiesImpact: {} });

  useEffect(() => {
    // try to fetch a small set of user/portfolio metrics from local storage or API
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${process.env.REACT_APP_API_URL}/api/auth/me`).then(res => setUser(res.data)).catch(() => {});
    }

    // Load cities list for filter dropdown
    const loadCities = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/cities`);
        const cities = res.data || [];
        setAvailableCities(cities);
        if (cities.length > 0 && !selectedCity) setSelectedCity(cities[0]);
      } catch (e) {
        console.error('Error loading cities', e);
      }
    };
    loadCities();
  }, [selectedCity]);

  // Fetch analytics when selectedCity or timeframe changes
  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedCity) return;
      setLoading(true);
      try {
        const [trendsRes, summaryRes, roiRes, yieldRes, amenitiesRes, possessionRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/historical-price-trends`, { params: { years: timeframe.split(' ')[0], city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/summary`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/roi-forecast`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/rental-yield`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/amenities-analysis`, { params: { city: selectedCity } }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/analytics/possession-status`, { params: { city: selectedCity } })
        ]);

        // trendsRes expected to be an array of { location, data: [{year,price}] }
        const trendsData = trendsRes.data || [];
        if (trendsData.length > 0) {
          // pick first location for dashboard chart if present
          const first = trendsData[0];
          setPriceTrends(prev => ({ ...prev, data: { ...prev.data, [timeframe.split(' ')[0]]: first.data || [] } }));
          if (first.data && first.data.length >= 2) {
            const oldest = first.data[0].price;
            const latest = first.data[first.data.length - 1].price;
            const growth = oldest > 0 ? Math.round(((latest - oldest) / oldest) * 100) : 0;
            setPriceTrends(prev => ({ ...prev, current: growth, last5Years: growth }));
          }
        }

        // summary
        const summary = summaryRes.data || {};
        setMetrics(prev => ({
          ...prev,
          propertiesSaved: summary.totalProperties || prev.propertiesSaved,
          averageROI: (summary.avgROI || prev.averageROI),
          rentalYield: (summary.avgRentalYield || prev.rentalYield),
          riskIndex: summary.riskIndex || prev.riskIndex
        }));

        setRoiForecast(roiRes.data || { current: 0, projectedCAGR: 0, data: [] });
        setRentalYield(yieldRes.data || { average: 0, data: [] });
        setAmenitiesAnalysis(amenitiesRes.data || { popularAmenities: [], keyAmenitiesImpact: {} });
        setPossessionStatus(possessionRes.data || []);
      } catch (err) {
        console.error('Error fetching analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [selectedCity, timeframe]);

  // Helper to convert trend payload to chart-friendly dataset
  const getLineChartData = () => {
    const key = timeframe.split(' ')[0];
    return (priceTrends.data[key] || []).map(item => ({ year: item.year, price: item.price }));
  };

  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Laddr</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                💡 Try city comparisons for smarter decisions
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}</h2>
          <p className="text-gray-600">Overview of your market and portfolio insights.</p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Properties</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.propertiesSaved.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Avg ROI</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.averageROI}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Avg Rental Yield</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.rentalYield}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <p className="text-sm font-medium text-gray-600">Risk Index</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.riskIndex}</p>
          </div>
        </div>

        {/* Filters + Charts */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Market Snapshot</h3>
            <div className="flex items-center space-x-3">
              <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="border rounded px-3 py-2">
                <option value="">Select city</option>
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex space-x-2">
                {['5 Years','10 Years','20 Years'].map(p => (
                  <button key={p} onClick={() => setTimeframe(p)} className={`px-3 py-1 rounded text-sm ${timeframe===p? 'bg-blue-600 text-white':'bg-gray-100 text-gray-700'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Price Trends Line Chart */}
            <div className="col-span-2 bg-gray-50 p-4 rounded">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Historical Price Trends</h4>
              <div className="h-64">
                {loading ? (
                  <div className="flex items-center justify-center h-full">Loading...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getLineChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Price']} />
                      <Legend />
                      <Line type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={2} name="Average Price" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ROI Bar Chart / Rental Yield Pie */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded h-44">
                <h4 className="text-sm font-medium text-gray-800 mb-2">ROI Forecast</h4>
                <div className="h-28">
                  {roiForecast.data && roiForecast.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={roiForecast.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(v) => [`${v}%`, 'ROI']} />
                        <Bar dataKey="value" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">No ROI data</div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded h-44">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Rental Yield Split</h4>
                <div className="h-28 flex items-center justify-center">
                  {rentalYield.data && rentalYield.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={rentalYield.data} dataKey="value" nameKey="neighborhood" outerRadius={60} fill="#8884d8">
                          {rentalYield.data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => [`${v}%`, 'Yield']} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div>No rental data</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amenities & Possession (compact) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Amenities</h3>
            <div className="grid grid-cols-1 gap-3">
              {amenitiesAnalysis.popularAmenities?.slice(0,4).map((am, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-700">
                  <span>{am._id}</span>
                  <span className="text-gray-500">{am.count}</span>
                </div>
              ))}
              {(!amenitiesAnalysis.popularAmenities || amenitiesAnalysis.popularAmenities.length===0) && (
                <div className="text-sm text-gray-500">No amenity data</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Possession Status</h3>
            <div className="grid grid-cols-1 gap-3">
              {possessionStatus.slice(0,4).map((s, idx) => (
                <div key={idx} className="flex justify-between text-sm text-gray-700">
                  <span>{s._id}</span>
                  <span className="text-gray-500">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded">Compare Cities</button>
              <button className="w-full px-4 py-2 border rounded">Export Report</button>
            </div>
          </div>
        </div>

        {/* Recent Activity (kept compact) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-blue-600 hover:underline">View all</button>
          </div>
          <p className="text-sm text-gray-600">Your most recent interactions will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;