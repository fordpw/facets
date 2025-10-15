import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Card, CardHeader, CardBody, LoadingSpinner, Badge } from '../components/common';
import { healthcareAPI, apiHelpers } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  // Fetch dashboard data
  const { data: executiveData, isLoading: executiveLoading } = useQuery(
    'executive-dashboard',
    () => healthcareAPI.dashboard.executive(),
    { refetchInterval: 5 * 60 * 1000 } // Refresh every 5 minutes
  );

  const { data: operationalData, isLoading: operationalLoading } = useQuery(
    'operational-dashboard',
    () => healthcareAPI.dashboard.operational(),
    { refetchInterval: 2 * 60 * 1000 } // Refresh every 2 minutes
  );

  const executive = executiveData?.data?.data || {};
  const operational = operationalData?.data?.data || {};

  // Chart colors
  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const quickActions = [
    {
      title: 'Add New Member',
      description: 'Register a new healthcare member',
      href: '/members/new',
      icon: UserPlusIcon,
      color: 'bg-healthcare-500',
    },
    {
      title: 'Submit Claim',
      description: 'Submit a new insurance claim',
      href: '/claims/new',
      icon: DocumentPlusIcon,
      color: 'bg-success-500',
    },
    {
      title: 'Add Provider',
      description: 'Register a new healthcare provider',
      href: '/providers/new',
      icon: BuildingOffice2Icon,
      color: 'bg-warning-500',
    },
    {
      title: 'View Reports',
      description: 'Access analytics and reports',
      href: '/reports',
      icon: ChartBarIcon,
      color: 'bg-purple-500',
    },
  ];

  const statCards = [
    {
      title: 'Active Members',
      value: executive.summary?.activeMembers || 0,
      change: '+12%',
      changeType: 'positive',
      icon: UsersIcon,
    },
    {
      title: 'Total Claims',
      value: executive.summary?.totalClaims || 0,
      change: '+8%',
      changeType: 'positive',
      icon: DocumentTextIcon,
    },
    {
      title: 'Total Payments',
      value: apiHelpers.formatCurrency(executive.summary?.totalPayments || 0),
      change: '+5%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
    },
    {
      title: 'Processing Rate',
      value: `${executive.summary?.processingRate || 0}%`,
      change: '+2%',
      changeType: 'positive',
      icon: ClockIcon,
    },
  ];

  if (executiveLoading || operationalLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to your healthcare management dashboard
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardBody>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="mt-2">
                <div className={`flex items-baseline text-sm ${
                  stat.changeType === 'positive' ? 'text-success-600' : 'text-danger-600'
                }`}>
                  <span className="font-medium">{stat.change}</span>
                  <span className="ml-1 text-gray-500">from last month</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Claims Trend Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Claims Trend (Last 7 Days)</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={executive.claimsTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value, 'Claims']}
                />
                <Line 
                  type="monotone" 
                  dataKey="claimCount" 
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Claim Status Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Claim Status Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={executive.claimStatusDistribution || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {(executive.claimStatusDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Today's Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Summary */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Today's Activity</h3>
          </CardHeader>
          <CardBody>
            <dl className="space-y-4">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Claims Submitted</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {operational.todaysSummary?.todaysClaims || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Claims Processed</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {operational.todaysSummary?.todaysProcessed || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">New Members</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {operational.todaysSummary?.newMembersToday || 0}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">New Enrollments</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {operational.todaysSummary?.newEnrollmentsToday || 0}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Alerts</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {operational.todaysSummary?.overduePended > 0 && (
                <div className="flex items-center p-3 rounded-md bg-warning-50 border border-warning-200">
                  <ExclamationTriangleIcon className="h-5 w-5 text-warning-400" />
                  <div className="ml-3">
                    <p className="text-sm text-warning-800">
                      {operational.todaysSummary.overduePended} claims pending for 3+ days
                    </p>
                  </div>
                </div>
              )}
              
              {operational.todaysSummary?.overdueProcessing > 0 && (
                <div className="flex items-center p-3 rounded-md bg-danger-50 border border-danger-200">
                  <ExclamationCircleIcon className="h-5 w-5 text-danger-400" />
                  <div className="ml-3">
                    <p className="text-sm text-danger-800">
                      {operational.todaysSummary.overdueProcessing} claims processing for 7+ days
                    </p>
                  </div>
                </div>
              )}
              
              {!operational.todaysSummary?.overduePended && !operational.todaysSummary?.overdueProcessing && (
                <div className="text-center py-4">
                  <CheckCircleIcon className="mx-auto h-8 w-8 text-success-400" />
                  <p className="mt-2 text-sm text-gray-500">No alerts at this time</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Top Plans */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Top Plans by Claims</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {(executive.topPlans || []).slice(0, 5).map((plan, index) => (
                <div key={plan.planCode} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      {index + 1}.
                    </span>
                    <div className="ml-2">
                      <p className="text-sm font-medium text-gray-900">{plan.planName}</p>
                      <p className="text-xs text-gray-500">{plan.planCode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{plan.claimCount}</p>
                    <p className="text-xs text-gray-500">
                      {apiHelpers.formatCurrency(plan.totalPaid)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-healthcare-500 rounded-lg border border-gray-300 hover:border-healthcare-300 transition-colors"
              >
                <div>
                  <span className={`rounded-lg inline-flex p-3 ${action.color} text-white`}>
                    <action.icon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-healthcare-600">
                    {action.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

// Icon components
const UsersIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);

const DocumentTextIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const CurrencyDollarIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const ClockIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const UserPlusIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
  </svg>
);

const DocumentPlusIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const BuildingOffice2Icon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18v18m13.5-18v18m2.25-18v18M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.75m-.75 3h.75m-.75 3h.75m-3.75-3.75h.75m-.75-3h.75m-6.75-4.5h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
  </svg>
);

const ChartBarIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
);

const ExclamationTriangleIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

const ExclamationCircleIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export default Dashboard;