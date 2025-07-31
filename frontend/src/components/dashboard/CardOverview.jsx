import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Eye, EyeOff, Plus, Unlock } from 'lucide-react';
import CreateCardModal from '../cards/CreateCardModal';
import CardRevealModal from '../cards/CardRevealModal';

const CardOverview = ({ cards, onCardCreated }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const handleCreateCard = () => {
    setShowCreateCardModal(true);
  };

  const handleCardCreated = (newCard) => {
    onCardCreated?.(newCard);
  };

  const handleRevealCard = (card) => {
    setSelectedCard(card);
    setShowRevealModal(true);
  };

  if (!cards || cards.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl flex items-center justify-center mx-auto">
              <CreditCard className="h-10 w-10 text-primary-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No virtual cards yet</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                Create your first Visa virtual card to start making secure online payments with M-Pesa
              </p>
            </div>
            <motion.button 
              onClick={handleCreateCard} 
              className="btn btn-primary bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 px-6 py-3 text-base"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Card
            </motion.button>
          </motion.div>
        </div>
        
        <CreateCardModal
          isOpen={showCreateCardModal}
          onClose={() => setShowCreateCardModal(false)}
          onCardCreated={handleCardCreated}
        />
      </>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-approved';
      case 'suspended':
        return 'status-pending';
      case 'expired':
        return 'status-declined';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Virtual Cards</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCreateCard}
              className="btn btn-primary btn-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Card
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-sm text-primary-600 hover:text-primary-700"
            >
              {showDetails ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Show Details
                </>
              )}
            </button>
          </div>
        </div>

      {cards.map((card, index) => (
        <motion.div
          key={card._id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="virtual-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-6 w-6" />
              <div>
                <h4 className="font-semibold">{card.cardholder_name}</h4>
                <p className="text-blue-100 text-sm">
                  {card.masked_card_number || '**** **** **** ****'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`status-indicator ${getStatusColor(card.status)}`}>
                {card.status}
              </div>
              <button
                onClick={() => handleRevealCard(card)}
                className="p-2 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors"
                title="Reveal card details"
              >
                <Unlock className="h-4 w-4 text-primary-600" />
              </button>
            </div>
          </div>

          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 text-sm"
            >
              <div className="flex justify-between">
                <span className="text-blue-100">Expires:</span>
                <span>{card.expiry_month?.toString().padStart(2, '0')}/{card.expiry_year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Daily Limit:</span>
                <span>KES {card.daily_limit?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Daily Spent:</span>
                <span>KES {(card.total_spent_today || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-100">Monthly Spent:</span>
                <span>KES {(card.total_spent_month || 0).toLocaleString()}</span>
              </div>
              {(card.total_spent_today || 0) > 0 && (
                <div className="w-full bg-blue-400 rounded-full h-2 mt-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(((card.total_spent_today || 0) / (card.daily_limit || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      ))}
      </div>

      {/* Create Card Modal */}
      <CreateCardModal
        isOpen={showCreateCardModal}
        onClose={() => setShowCreateCardModal(false)}
        onCardCreated={handleCardCreated}
      />

      {/* Card Reveal Modal */}
      <CardRevealModal
        isOpen={showRevealModal}
        onClose={() => setShowRevealModal(false)}
        cardId={selectedCard?._id}
        cardholderName={selectedCard?.cardholder_name}
      />
    </>
  );
};

export default CardOverview; 