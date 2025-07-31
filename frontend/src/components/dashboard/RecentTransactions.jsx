import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Clock, CheckCircle, XCircle } from 'lucide-react';

const RecentTransactions = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
        <p className="text-gray-500">Your recent transactions will appear here</p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning-500" />;
      case 'declined':
        return <XCircle className="h-4 w-4 text-error-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'pending':
        return 'status-pending';
      case 'declined':
        return 'status-declined';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {transactions.map((transaction, index) => (
        <motion.div
          key={transaction._id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CreditCard className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{transaction.merchantName || 'Unknown Merchant'}</h4>
              <p className="text-sm text-gray-500">
                {transaction.cardId ? `Card ending in ${transaction.cardId.slice(-4)}` : 'Virtual Card'} • {new Date(transaction.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                KES {transaction.amount.toLocaleString()}
              </p>
              <div className={`status-indicator ${getStatusColor(transaction.status)}`}>
                {getStatusIcon(transaction.status)}
                <span className="ml-1 capitalize">{transaction.status}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default RecentTransactions; 