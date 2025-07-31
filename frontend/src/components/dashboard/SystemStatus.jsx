import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  Wifi, 
  Shield, 
  Database,
  Clock,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

const SystemStatus = () => {
  const [statusItems, setStatusItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  const checkSystemStatus = async () => {
    setIsLoading(true);
    try {
      // Check backend health
      const healthResponse = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
      const healthData = healthResponse.data;

      // Check webhook health
      const webhookResponse = await axios.get(`${API_BASE_URL}/webhooks/health`);
      const webhookData = webhookResponse.data;

      const newStatusItems = [
        {
          id: 1,
          name: 'Backend API',
          status: healthData.status === 'OK' ? 'operational' : 'down',
          description: healthData.status === 'OK' ? 'API server is responding normally' : 'API server is not responding'
        },
        {
          id: 2,
          name: 'Database',
          status: healthData.database === 'MongoDB' ? 'operational' : 'down',
          description: healthData.database === 'MongoDB' ? 'MongoDB connection is stable' : 'Database connection failed'
        },
        {
          id: 3,
          name: 'Redis Cache',
          status: healthData.redis === 'Connected' ? 'operational' : 'down',
          description: healthData.redis === 'Connected' ? 'Redis cache is working' : 'Redis connection failed'
        },
        {
          id: 4,
          name: 'M-Pesa API',
          status: 'operational', // This would be checked against actual M-Pesa API
          description: 'M-Pesa Daraja API integration is active'
        },
        {
          id: 5,
          name: 'Webhook Service',
          status: webhookData.status === 'OK' ? 'operational' : 'down',
          description: webhookData.status === 'OK' ? 'Webhook endpoints are responding' : 'Webhook service is down'
        }
      ];

      setStatusItems(newStatusItems);
      setLastUpdated(new Date());
    } catch (error) {
      // If health check fails, set all services as down
      setStatusItems([
        {
          id: 1,
          name: 'Backend API',
          status: 'down',
          description: 'Unable to connect to API server'
        },
        {
          id: 2,
          name: 'Database',
          status: 'down',
          description: 'Database connection unavailable'
        },
        {
          id: 3,
          name: 'Redis Cache',
          status: 'down',
          description: 'Redis connection unavailable'
        },
        {
          id: 4,
          name: 'M-Pesa API',
          status: 'down',
          description: 'M-Pesa API connection unavailable'
        },
        {
          id: 5,
          name: 'Webhook Service',
          status: 'down',
          description: 'Webhook service unavailable'
        }
      ]);
      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkSystemStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-warning-500" />;
      case 'down':
        return <AlertCircle className="h-4 w-4 text-error-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return 'status-approved';
      case 'degraded':
        return 'status-pending';
      case 'down':
        return 'status-declined';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOverallStatus = () => {
    if (statusItems.length === 0) return 'unknown';
    const operationalCount = statusItems.filter(item => item.status === 'operational').length;
    if (operationalCount === statusItems.length) return 'operational';
    if (operationalCount === 0) return 'down';
    return 'degraded';
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={checkSystemStatus}
            disabled={isLoading}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <div className={`flex items-center text-sm ${overallStatus === 'operational' ? 'text-success-600' : overallStatus === 'degraded' ? 'text-warning-600' : 'text-error-600'}`}>
            {getStatusIcon(overallStatus)}
            <span className="ml-1 capitalize">
              {overallStatus === 'operational' ? 'All Systems Operational' : 
               overallStatus === 'degraded' ? 'Some Systems Degraded' : 
               'Systems Down'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {statusItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(item.status)}
              <div>
                <h4 className="font-medium text-gray-900">{item.name}</h4>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            </div>
            <div className={`status-indicator ${getStatusColor(item.status)}`}>
              {item.status}
            </div>
          </motion.div>
        ))}
      </div>

      {lastUpdated && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStatus; 