import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Eye, EyeOff, Clock, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../utils/axios';

const CardRevealModal = ({ isOpen, onClose, cardId, cardholderName }) => {
  const [cardDetails, setCardDetails] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch card details when modal opens
  useEffect(() => {
    if (isOpen && cardId) {
      fetchCardDetails();
    }
  }, [isOpen, cardId]);

  // Countdown timer
  useEffect(() => {
    if (cardDetails && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [cardDetails, timeLeft, onClose]);

  const fetchCardDetails = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/cards/${cardId}/reveal`);
      setCardDetails(response.data.data);
      setTimeLeft(60);
    } catch (error) {
      console.error('Error fetching card details:', error);
      toast.error('Failed to reveal card details');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatCardNumber = (cardNumber) => {
    if (!cardNumber) return '';
    return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (month, year) => {
    return `${month.toString().padStart(2, '0')}/${year}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="h-6 w-6" />
                <div>
                  <h2 className="text-xl font-bold">Card Details</h2>
                  <p className="text-primary-100 text-sm">{cardholderName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-primary-100 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Countdown Timer */}
            <div className="mt-4 flex items-center justify-center space-x-2 bg-white bg-opacity-20 rounded-lg p-3">
              <Clock className="h-5 w-5" />
              <span className="font-mono text-lg font-bold">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-sm">remaining</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner h-8 w-8"></div>
                <span className="ml-3 text-gray-600">Loading card details...</span>
              </div>
            ) : cardDetails ? (
              <div className="space-y-6">
                {/* Card Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Card Number</label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-50 rounded-lg p-3 font-mono text-lg">
                      {formatCardNumber(cardDetails.card_number)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(cardDetails.card_number)}
                      className="p-2 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5 text-primary-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Expiry Date</label>
                    <div className="bg-gray-50 rounded-lg p-3 font-mono">
                      {formatExpiry(cardDetails.expiry_month, cardDetails.expiry_year)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">CVV</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-50 rounded-lg p-3 font-mono">
                        {cardDetails.cvv}
                      </div>
                      <button
                        onClick={() => copyToClipboard(cardDetails.cvv)}
                        className="p-2 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5 text-primary-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Limits */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Card Limits</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Daily Limit:</span>
                      <div className="font-semibold">KES {cardDetails.daily_limit?.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Monthly Limit:</span>
                      <div className="font-semibold">KES {cardDetails.monthly_limit?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Security Notice</p>
                      <p>These details will automatically hide in {timeLeft} seconds for your security.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                Failed to load card details
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CardRevealModal; 