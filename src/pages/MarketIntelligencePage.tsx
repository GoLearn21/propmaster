import React, { useState, useEffect } from 'react';
import { marketIntelligenceService, type MarketData as MarketDataType } from '../services/marketIntelligenceService';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Home,
  MapPin,
  BarChart3,
  LineChart as LineChartIcon,
  Search,
  Filter
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type MarketData = MarketDataType;

interface RentTrend {
  month: string;
  avgRent: number;
  yourAvgRent: number;
}

const MOCK_MARKET_DATA: Record<string, MarketData> = {
  'Downtown': {
    propertyType: 'Urban Apartments',
    avgRent: 2850,
    rentChange: 5.2,
    occupancyRate: 94,
    daysOnMarket: 12,
    avgPropertyValue: 425000,
    valueChange: 3.8
  },
  'Riverside': {
    propertyType: 'Waterfront Complex',
    avgRent: 3200,
    rentChange: 7.1,
    occupancyRate: 96,
    daysOnMarket: 8,
    avgPropertyValue: 580000,
    valueChange: 6.2
  },
  'Suburbs': {
    propertyType: 'Family Homes',
    avgRent: 2400,
    rentChange: 3.5,
    occupancyRate: 91,
    daysOnMarket: 18,
    avgPropertyValue: 385000,
    valueChange: 2.9
  }
};

const RENT_TRENDS: RentTrend[] = [
  { month: 'May', avgRent: 2650, yourAvgRent: 2500 },
  { month: 'Jun', avgRent: 2700, yourAvgRent: 2550 },
  { month: 'Jul', avgRent: 2750, yourAvgRent: 2600 },
  { month: 'Aug', avgRent: 2800, yourAvgRent: 2650 },
  { month: 'Sep', avgRent: 2850, yourAvgRent: 2700 },
  { month: 'Oct', avgRent: 2900, yourAvgRent: 2750 },
  { month: 'Nov', avgRent: 2950, yourAvgRent: 2800 }
];

const COMPARABLE_PROPERTIES = [
  {
    id: '1',
    name: 'Luxury Heights',
    distance: '0.3 miles',
    avgRent: 2950,
    occupancy: 95,
    units: 48,
    amenities: ['Pool', 'Gym', 'Parking']
  },
  {
    id: '2',
    name: 'Metro Plaza',
    distance: '0.5 miles',
    avgRent: 2800,
    occupancy: 92,
    units: 64,
    amenities: ['Gym', 'Parking', 'Pet Friendly']
  },
  {
    id: '3',
    name: 'Urban Oasis',
    distance: '0.7 miles',
    avgRent: 3100,
    occupancy: 97,
    units: 36,
    amenities: ['Pool', 'Gym', 'Concierge']
  },
  {
    id: '4',
    name: 'Central Square',
    distance: '0.9 miles',
    avgRent: 2750,
    occupancy: 89,
    units: 52,
    amenities: ['Parking', 'Storage']
  }
];

export default function MarketIntelligencePage() {
  const [selectedArea, setSelectedArea] = useState<string>('Downtown');
  const [marketData, setMarketData] = useState<MarketData>(MOCK_MARKET_DATA['Downtown']);
  const [loading, setLoading] = useState(true);

  // Load real data from database
  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const data = await marketIntelligenceService.getMarketData(selectedArea);
        if (data) {
          setMarketData(data);
        } else {
          // Use fallback data for the selected area
          setMarketData(MOCK_MARKET_DATA[selectedArea] || MOCK_MARKET_DATA['Downtown']);
        }
      } catch (error) {
        console.error('Failed to load market data, using fallback data:', error);
        setMarketData(MOCK_MARKET_DATA[selectedArea] || MOCK_MARKET_DATA['Downtown']);
      } finally {
        setLoading(false);
      }
    };
    loadMarketData();
  }, [selectedArea]);

  // Calculate opportunity score
  const opportunityScore = Math.round(
    (marketData.rentChange * 10) + 
    (marketData.occupancyRate * 0.5) + 
    ((30 - marketData.daysOnMarket) * 2)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-darker">Market Intelligence</h1>
          <p className="text-neutral-medium mt-1">Real-time market analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-4 py-2 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Downtown">Downtown Area</option>
            <option value="Riverside">Riverside District</option>
            <option value="Suburbs">Suburban Region</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-neutral-medium">Avg Market Rent</p>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-neutral-darker">${marketData.avgRent}</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">
              +{marketData.rentChange}% YoY
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-neutral-medium">Occupancy Rate</p>
            <Home className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-neutral-darker">{marketData.occupancyRate}%</p>
          <p className="text-sm text-neutral-medium mt-2">
            {marketData.occupancyRate >= 95 ? 'High demand' : marketData.occupancyRate >= 90 ? 'Strong market' : 'Moderate'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-neutral-medium">Days on Market</p>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-neutral-darker">{marketData.daysOnMarket}</p>
          <p className="text-sm text-neutral-medium mt-2">
            {marketData.daysOnMarket <= 10 ? 'Very fast' : marketData.daysOnMarket <= 20 ? 'Fast' : 'Average'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-neutral-medium">Avg Property Value</p>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-neutral-darker">${(marketData.avgPropertyValue / 1000).toFixed(0)}k</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">
              +{marketData.valueChange}% YoY
            </span>
          </div>
        </div>
      </div>

      {/* Opportunity Score */}
      <div className="bg-gradient-to-r from-primary to-primary-dark p-6 rounded-lg shadow-sm text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Market Opportunity Score</h3>
            <p className="text-sm opacity-90">Based on rent growth, occupancy, and market velocity</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{opportunityScore}</div>
            <div className="text-sm opacity-90">out of 100</div>
          </div>
        </div>
        <div className="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-white h-full transition-all"
            style={{ width: `${opportunityScore}%` }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rent Trends */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h3 className="text-lg font-semibold text-neutral-darker mb-4">
            Rent Trends (6 months)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={RENT_TRENDS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgRent" 
                stroke="#20B2AA" 
                strokeWidth={2}
                name="Market Average"
                dot={{ fill: '#20B2AA', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="yourAvgRent" 
                stroke="#00CC66" 
                strokeWidth={2}
                name="Your Properties"
                dot={{ fill: '#00CC66', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparable Properties */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
          <h3 className="text-lg font-semibold text-neutral-darker mb-4">
            Comparable Properties Nearby
          </h3>
          <div className="space-y-3">
            {COMPARABLE_PROPERTIES.map((prop) => (
              <div key={prop.id} className="p-4 bg-neutral-lighter rounded-lg hover:bg-neutral-light transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-neutral-darker">{prop.name}</div>
                  <div className="flex items-center gap-1 text-sm text-neutral-medium">
                    <MapPin className="w-4 h-4" />
                    {prop.distance}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <div className="text-xs text-neutral-medium">Avg Rent</div>
                    <div className="text-lg font-bold text-primary">${prop.avgRent}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-medium">Occupancy</div>
                    <div className="text-lg font-bold text-neutral-darker">{prop.occupancy}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-medium">Units</div>
                    <div className="text-lg font-bold text-neutral-darker">{prop.units}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {prop.amenities.map((amenity, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-white rounded text-neutral-medium">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Insights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-light">
        <h3 className="text-lg font-semibold text-neutral-darker mb-4">Market Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900 mb-1">Strong Growth</h4>
                <p className="text-sm text-green-700">
                  {selectedArea} area showing {marketData.rentChange}% rent growth, above regional average of 4.2%
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">High Demand</h4>
                <p className="text-sm text-blue-700">
                  {marketData.occupancyRate}% occupancy rate indicates strong rental demand in this market
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 mb-1">Fast Market</h4>
                <p className="text-sm text-purple-700">
                  Properties leasing in {marketData.daysOnMarket} days on average, {marketData.daysOnMarket <= 10 ? 'well' : 'slightly'} below market norm
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
