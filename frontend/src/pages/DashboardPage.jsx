import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlaskConical, Scale, Tag, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Compounds',
      value: dashboardData?.total_compounds || 0,
      icon: FlaskConical,
      color: 'blue'
    },
    {
      title: 'Total Usages',
      value: dashboardData?.total_usages || 0,
      icon: Scale,
      color: 'green'
    },
    {
      title: 'Labels Generated',
      value: dashboardData?.total_labels || 0,
      icon: Tag,
      color: 'purple'
    },
    {
      title: 'Critical Stocks',
      value: dashboardData?.critical_stocks?.length || 0,
      icon: AlertTriangle,
      color: 'red'
    }
  ];

  const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' }
  };

  return (
    <div className="p-8" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of laboratory stock and activities</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const colors = colorMap[stat.color];
            return (
              <Card key={stat.title} className="shadow-soft hover:shadow-hover transition-shadow" data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-4 rounded-full ${colors.bg}`}>
                      <Icon className={`w-8 h-8 ${colors.text}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Critical Stocks */}
        {dashboardData?.critical_stocks && dashboardData.critical_stocks.length > 0 && (
          <Card className="shadow-soft" data-testid="critical-stocks-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Critical Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Compound Name</th>
                      <th>CAS Number</th>
                      <th>Current Stock</th>
                      <th>Critical Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.critical_stocks.map((compound) => (
                      <tr key={compound.id} data-testid={`critical-stock-${compound.id}`}>
                        <td className="font-medium">{compound.name}</td>
                        <td className="font-mono text-sm">{compound.cas_number}</td>
                        <td className="critical-stock">
                          {compound.stock_value.toFixed(2)} {compound.stock_unit}
                        </td>
                        <td className="text-gray-600">
                          {compound.critical_value.toFixed(2)} {compound.critical_unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activities */}
        <Card className="shadow-soft" data-testid="recent-activities-card">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.recent_usages && dashboardData.recent_usages.length > 0 ? (
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Compound</th>
                      <th>Weighed Amount</th>
                      <th>Concentration</th>
                      <th>Prepared By</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_usages.map((usage) => (
                      <tr key={usage.id} data-testid={`recent-usage-${usage.id}`}>
                        <td className="font-medium">{usage.compound_name}</td>
                        <td>{usage.weighed_amount.toFixed(2)} {usage.weighed_unit}</td>
                        <td className="font-semibold text-green-600">
                          {usage.concentration.toFixed(3)} {usage.concentration_unit}
                        </td>
                        <td>{usage.prepared_by}</td>
                        <td className="text-sm text-gray-600">
                          {new Date(usage.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activities</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}