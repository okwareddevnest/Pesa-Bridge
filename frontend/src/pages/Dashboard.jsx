import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  Activity,
  Users,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import axiosInstance from '../utils/axios.js';
import toast from 'react-hot-toast';

// Components
import StatCard from '../components/dashboard/StatCard.jsx';
import TransactionChart from '../components/dashboard/TransactionChart.jsx';
import RecentTransactions from '../components/dashboard/RecentTransactions.jsx';
import CardOverview from '../components/dashboard/CardOverview.jsx';
import QuickActions from '../components/dashboard/QuickActions.jsx';
import SystemStatus from '../components/dashboard/SystemStatus.jsx';


const Dashboard = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery(
    ['dashboard', refreshKey],
    async () => {
      const [overview, transactions, cards, analytics] = await Promise.all([
        axiosInstance.get('/dashboard/overview'),
        axiosInstance.get('/transactions?limit=5'),
        axiosInstance.get('/cards'),
        axiosInstance.get('/dashboard/transactions')
      ]);

      return {
        overview: overview.data.data,
        recentTransactions: transactions.data.data,
        cards: cards.data.data,
        analytics: analytics.data.data
      };
    },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 10000,
      retry: 3,
      retryDelay: 1000,
    }
  );

  // Refresh data
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Dashboard refreshed!');
  };

  // Handle card creation
  const handleCardCreated = (newCard) => {
    // Refresh dashboard data to show new card
    setRefreshKey(prev => prev + 1);
    toast.success('New card added to dashboard!');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner h-12 w-12"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-error-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { overview, recentTransactions, cards, analytics } = dashboardData || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your account.</p>
            </div>
            <button
              onClick={handleRefresh}
              className="btn btn-primary"
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard
            title="Total Cards"
            value={overview?.totalCards || 0}
            change={overview?.cardsChange || 0}
            icon={CreditCard}
            color="blue"
          />
          <StatCard
            title="Total Spent"
            value={`KES ${(overview?.totalSpent || 0).toLocaleString()}`}
            change={overview?.spendingChange || 0}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            title="Transactions"
            value={overview?.totalTransactions || 0}
            change={overview?.transactionsChange || 0}
            icon={TrendingUp}
            color="purple"
          />
          <StatCard
            title="Success Rate"
            value={`${(overview?.successRate || 0).toFixed(1)}%`}
            change={overview?.successRateChange || 0}
            icon={CheckCircle}
            color="emerald"
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts and Analytics */}
          <div className="lg:col-span-2 space-y-8">
            {/* Transaction Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Transaction Analytics</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                  Last 30 Days
                </div>
              </div>
              <TransactionChart data={analytics} />
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  View All
                </button>
              </div>
              <RecentTransactions transactions={recentTransactions} />
            </motion.div>
          </div>

          {/* Right Column - Cards and Actions */}
          <div className="space-y-8">
            {/* Card Overview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Your Cards</h2>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Manage
                </button>
              </div>
              <CardOverview cards={cards} onCardCreated={handleCardCreated} />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="card p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
              <QuickActions onCardCreated={handleCardCreated} />
            </motion.div>

            {/* System Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="card p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">System Status</h2>
              <SystemStatus />
            </motion.div>
          </div>
        </div>

        {/* Bottom Section - Additional Analytics */}
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Merchant Analytics */}
            {overview.topMerchants && overview.topMerchants.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Top Merchants</h3>
                </div>
                <div className="space-y-3">
                  {overview.topMerchants.slice(0, 5).map((merchant, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{merchant.name}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {merchant.count} transactions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spending by Category */}
            {overview.spendingByCategory && overview.spendingByCategory.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
                </div>
                <div className="space-y-3">
                  {overview.spendingByCategory.slice(0, 5).map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{category.name}</span>
                      <span className="text-sm font-medium text-gray-900">
                        KES {category.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {overview.recentActivity && overview.recentActivity.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <div className="space-y-3">
                  {overview.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'success' ? 'bg-success-500' :
                        activity.type === 'warning' ? 'bg-warning-500' :
                        'bg-error-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">{activity.message}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 