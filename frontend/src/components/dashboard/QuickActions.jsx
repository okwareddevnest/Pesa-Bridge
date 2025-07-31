import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  CreditCard, 
  Download, 
  Settings, 
  Shield, 
  HelpCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import CreateCardModal from '../cards/CreateCardModal';

const QuickActions = ({ onCardCreated }) => {
  const navigate = useNavigate();
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);

  const handleCreateCard = () => {
    setShowCreateCardModal(true);
  };

  const handleCardCreated = (newCard) => {
    onCardCreated?.(newCard);
  };

  const handleViewCards = () => {
    // Navigate to cards management page
    toast.success('Cards management feature coming soon!');
  };

  const handleDownloadStatement = async () => {
    try {
      // Implement actual download functionality
      const response = await fetch('/api/transactions/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transaction-statement-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Statement downloaded successfully!');
      } else {
        toast.error('Failed to download statement');
      }
    } catch (error) {
      toast.error('Download feature coming soon!');
    }
  };

  const handleSecuritySettings = () => {
    // Navigate to security settings page
    toast.success('Security settings feature coming soon!');
  };

  const actions = [
    {
      id: 1,
      title: 'Create New Card',
      description: 'Generate a new virtual card',
      icon: Plus,
      color: 'bg-blue-500',
      action: handleCreateCard
    },
    {
      id: 2,
      title: 'View All Cards',
      description: 'Manage your virtual cards',
      icon: CreditCard,
      color: 'bg-green-500',
      action: handleViewCards
    },
    {
      id: 3,
      title: 'Download Statement',
      description: 'Get your transaction history',
      icon: Download,
      color: 'bg-purple-500',
      action: handleDownloadStatement
    },
    {
      id: 4,
      title: 'Security Settings',
      description: 'Manage card security',
      icon: Shield,
      color: 'bg-red-500',
      action: handleSecuritySettings
    }
  ];

  return (
    <>
      <div className="space-y-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.action}
            className="w-full flex items-center space-x-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <div className={`p-2 rounded-lg ${action.color} text-white`}>
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{action.title}</h4>
              <p className="text-sm text-gray-500">{action.description}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Create Card Modal */}
      <CreateCardModal
        isOpen={showCreateCardModal}
        onClose={() => setShowCreateCardModal(false)}
        onCardCreated={handleCardCreated}
      />
    </>
  );
};

export default QuickActions; 