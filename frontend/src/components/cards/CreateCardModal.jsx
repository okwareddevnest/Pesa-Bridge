import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { X, CreditCard, User, DollarSign, Calendar, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import axiosInstance from '../../utils/axios.js';
import toast from 'react-hot-toast';

const CreateCardModal = ({ isOpen, onClose, onCardCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    trigger,
    setValue
  } = useForm({
    defaultValues: {
      cardholderName: '',
      dailyLimit: 70000,
      monthlyLimit: 1000000
    }
  });

  const watchedValues = watch();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      console.log('Submitting card creation with data:', data);
      
      const response = await axiosInstance.post('/cards', {
        cardholderName: data.cardholderName.trim(),
        dailyLimit: parseInt(data.dailyLimit),
        monthlyLimit: parseInt(data.monthlyLimit)
      });

      console.log('Card creation response:', response.data);

      if (response.data.success) {
        toast.success('🎉 Virtual card created successfully!');
        reset();
        setStep(1);
        onCardCreated?.(response.data.data);
        onClose();
      } else {
        throw new Error(response.data.error || 'Failed to create card');
      }
    } catch (error) {
      console.error('Card creation error:', error);
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.details?.[0]?.msg || 
                          error.message ||
                          'Failed to create card. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setStep(1);
    onClose();
  };

  const nextStep = () => {
    console.log('nextStep called, current step:', step);
    console.log('Current form values:', watchedValues);
    console.log('Current errors:', errors);
    
    if (step === 1) {
      // Simple validation for step 1
      const name = watchedValues.cardholderName?.trim();
      console.log('Validating name:', name);
      
      if (!name || name.length < 2) {
        console.log('Name validation failed: too short');
        return;
      }
      
      if (name.split(' ').length < 2) {
        console.log('Name validation failed: need full name');
        return;
      }
      
      console.log('Step 1 validation passed, moving to step 2');
      setStep(2);
      
    } else if (step === 2) {
      // Simple validation for step 2
      const daily = parseInt(watchedValues.dailyLimit);
      const monthly = parseInt(watchedValues.monthlyLimit);
      
      console.log('Validating limits:', { daily, monthly });
      
      if (isNaN(daily) || daily < 1000 || daily > 100000) {
        console.log('Daily limit validation failed');
        return;
      }
      
      if (isNaN(monthly) || monthly < 10000 || monthly > 1000000) {
        console.log('Monthly limit validation failed');
        return;
      }
      
      if (monthly < daily) {
        console.log('Monthly must be >= daily');
        return;
      }
      
      console.log('Step 2 validation passed, moving to step 3');
      setStep(3);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="inline-block w-full max-w-lg p-0 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl"
            >
              {/* Progress Bar */}
              <div className="h-1 bg-gray-200">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
                  initial={{ width: '33%' }}
                  animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary-50 to-blue-50 px-6 py-6">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white hover:bg-opacity-50 rounded-full transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-xl shadow-soft">
                    <CreditCard className="h-8 w-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Create Virtual Card
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {step === 1 && "Let's start with your basic information"}
                      {step === 2 && "Set your spending limits"}
                      {step === 3 && "Review and confirm your card details"}
                    </p>
                  </div>
                </div>

                {/* Step indicators */}
                <div className="flex justify-center mt-6 space-x-2">
                  {[1, 2, 3].map((stepNum) => (
                    <div
                      key={stepNum}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        stepNum <= step ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                <AnimatePresence mode="wait">
                  {/* Step 1: Cardholder Information */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                          <User className="h-8 w-8 text-primary-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">Cardholder Information</h4>
                        <p className="text-gray-500 text-sm">This name will appear on your virtual card</p>
                      </div>

                      <div>
                        <label htmlFor="cardholderName" className="form-label">
                          Full Name <span className="text-error-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            id="cardholderName"
                            type="text"
                            {...register('cardholderName', {
                              required: 'Full name is required',
                              validate: (value) => {
                                const trimmed = value?.trim() || '';
                                if (trimmed.length < 2) return 'Name must be at least 2 characters';
                                if (trimmed.length > 50) return 'Name must be less than 50 characters';
                                if (!/^[a-zA-Z\s\.\']+$/.test(trimmed)) return 'Name should only contain letters, spaces, dots, and apostrophes';
                                if (trimmed.split(' ').length < 2) return 'Please enter your full name (first and last name)';
                                return true;
                              }
                            })}
                            className={`form-input pl-10 text-lg ${
                              errors.cardholderName ? 'border-error-300 focus:ring-error-500' : 'focus:ring-primary-500'
                            }`}
                            placeholder="Enter your full name"
                            autoComplete="name"
                          />
                        </div>
                        {errors.cardholderName && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center mt-2 text-error-600"
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            <span className="text-sm">{errors.cardholderName.message}</span>
                          </motion.div>
                        )}
                        
                        {/* Live preview */}
                        {watchedValues.cardholderName && !errors.cardholderName && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white"
                          >
                            <div className="flex justify-between items-start mb-8">
                              <div>
                                <div className="text-xs opacity-75">VIRTUAL CARD</div>
                                <div className="text-sm font-medium">VISA</div>
                              </div>
                              <div className="w-8 h-8 bg-white bg-opacity-20 rounded"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm opacity-75">**** **** **** ****</div>
                              <div className="text-lg font-semibold">{watchedValues.cardholderName.toUpperCase()}</div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Spending Limits */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                          <DollarSign className="h-8 w-8 text-green-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">Spending Limits</h4>
                        <p className="text-gray-500 text-sm">Set limits to control your spending</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Daily Limit */}
                        <div className="space-y-2">
                          <label htmlFor="dailyLimit" className="form-label">
                            Daily Limit <span className="text-error-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              id="dailyLimit"
                              type="number"
                              min="1000"
                              max="100000"
                              step="1000"
                              {...register('dailyLimit', {
                                required: 'Daily limit is required',
                                validate: (value) => {
                                  const numValue = parseInt(value);
                                  if (isNaN(numValue)) return 'Please enter a valid amount';
                                  if (numValue < 1000) return 'Minimum daily limit is KES 1,000';
                                  if (numValue > 100000) return 'Maximum daily limit is KES 100,000';
                                  return true;
                                }
                              })}
                              className={`form-input pl-10 ${
                                errors.dailyLimit ? 'border-error-300 focus:ring-error-500' : 'focus:ring-primary-500'
                              }`}
                              placeholder="70000"
                            />
                          </div>
                          {errors.dailyLimit && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center text-error-600"
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              <span className="text-sm">{errors.dailyLimit.message}</span>
                            </motion.div>
                          )}
                          {watchedValues.dailyLimit && !errors.dailyLimit && (
                            <div className="text-sm text-green-600 font-medium">
                              {formatCurrency(watchedValues.dailyLimit)} per day
                            </div>
                          )}
                        </div>

                        {/* Monthly Limit */}
                        <div className="space-y-2">
                          <label htmlFor="monthlyLimit" className="form-label">
                            Monthly Limit <span className="text-error-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              id="monthlyLimit"
                              type="number"
                              min="10000"
                              max="1000000"
                              step="10000"
                              {...register('monthlyLimit', {
                                required: 'Monthly limit is required',
                                validate: (value) => {
                                  const numValue = parseInt(value);
                                  const dailyLimit = parseInt(watchedValues.dailyLimit);
                                  
                                  if (isNaN(numValue)) return 'Please enter a valid amount';
                                  if (numValue < 10000) return 'Minimum monthly limit is KES 10,000';
                                  if (numValue > 1000000) return 'Maximum monthly limit is KES 1,000,000';
                                  
                                  if (!isNaN(dailyLimit) && numValue < dailyLimit) {
                                    return 'Monthly limit must be greater than or equal to daily limit';
                                  }
                                  return true;
                                }
                              })}
                              className={`form-input pl-10 ${
                                errors.monthlyLimit ? 'border-error-300 focus:ring-error-500' : 'focus:ring-primary-500'
                              }`}
                              placeholder="1000000"
                            />
                          </div>
                          {errors.monthlyLimit && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center text-error-600"
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              <span className="text-sm">{errors.monthlyLimit.message}</span>
                            </motion.div>
                          )}
                          {watchedValues.monthlyLimit && !errors.monthlyLimit && (
                            <div className="text-sm text-green-600 font-medium">
                              {formatCurrency(watchedValues.monthlyLimit)} per month
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="bg-gray-50 p-4 rounded-xl">
                        <p className="text-sm font-medium text-gray-700 mb-3">Quick Presets</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setValue('dailyLimit', 10000);
                              setValue('monthlyLimit', 300000);
                              trigger(['dailyLimit', 'monthlyLimit']);
                            }}
                            className="p-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Conservative<br />
                            <span className="text-xs text-gray-500">KES 10K/300K</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('dailyLimit', 50000);
                              setValue('monthlyLimit', 1000000);
                              trigger(['dailyLimit', 'monthlyLimit']);
                            }}
                            className="p-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Standard<br />
                            <span className="text-xs text-gray-500">KES 50K/1M</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Review */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                          <CheckCircle className="h-8 w-8 text-blue-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">Review Your Card</h4>
                        <p className="text-gray-500 text-sm">Please review the details before creating your card</p>
                      </div>

                      {/* Card Preview */}
                      <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white shadow-large">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <div className="text-xs opacity-75">VIRTUAL CARD</div>
                            <div className="text-lg font-bold">VISA</div>
                          </div>
                          <div className="flex space-x-2">
                            <div className="w-6 h-6 bg-white bg-opacity-30 rounded-full"></div>
                            <div className="w-6 h-6 bg-white bg-opacity-50 rounded-full"></div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm opacity-75 mb-1">Card Number</div>
                            <div className="text-xl font-mono tracking-wider">**** **** **** ****</div>
                          </div>
                          <div className="flex justify-between">
                            <div>
                              <div className="text-xs opacity-75">CARDHOLDER</div>
                              <div className="font-semibold">{watchedValues.cardholderName?.toUpperCase()}</div>
                            </div>
                            <div>
                              <div className="text-xs opacity-75">EXPIRES</div>
                              <div className="font-semibold">**/**</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details Summary */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h5 className="font-semibold text-gray-900">Card Details</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Cardholder Name:</span>
                            <span className="font-medium">{watchedValues.cardholderName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Daily Limit:</span>
                            <span className="font-medium text-green-600">{formatCurrency(watchedValues.dailyLimit)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly Limit:</span>
                            <span className="font-medium text-green-600">{formatCurrency(watchedValues.monthlyLimit)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Security Notice */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <h6 className="font-medium text-blue-900">Secure & Encrypted</h6>
                            <p className="text-sm text-blue-700 mt-1">
                              Your virtual card will be generated using bank-level security with 256-bit encryption.
                              Full card details will be available after creation.
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Debug info (remove in production) */}
                <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
                  <strong>Debug:</strong> Step {step} | 
                  Values: {JSON.stringify(watchedValues, null, 2)} | 
                  Errors: {JSON.stringify(errors, null, 2)}
                  <br />
                  <button 
                    onClick={() => {
                      console.log('Force step 2');
                      setStep(2);
                    }}
                    className="mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded"
                  >
                    Force Step 2
                  </button>
                  <button 
                    onClick={() => {
                      console.log('Current form state:', { step, watchedValues, errors });
                    }}
                    className="mt-2 ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
                  >
                    Log State
                  </button>
                  {step === 3 && (
                    <button 
                      onClick={() => {
                        console.log('Force create card');
                        onSubmit(watchedValues);
                      }}
                      className="mt-2 ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded"
                    >
                      Force Create
                    </button>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-8">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      disabled={isLoading}
                      className="btn btn-outline flex-1"
                    >
                      Back
                    </button>
                  )}
                  
                  {step < 3 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Button clicked!');
                          nextStep();
                        }}
                        className="btn btn-primary flex-1 relative z-10"
                        style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      >
                        {step === 1 ? 'Continue →' : step === 2 ? 'Review →' : 'Next Step'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('Force next step');
                          setStep(step + 1);
                        }}
                        className="btn btn-outline text-xs px-2 py-1"
                        title="Skip validation (debug)"
                      >
                        Skip →
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Create Card button clicked!');
                        handleSubmit(onSubmit)();
                      }}
                      disabled={isLoading}
                      className="btn btn-primary flex-1 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 relative z-10"
                      style={{ pointerEvents: 'auto', cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center">
                          <div className="spinner h-5 w-5 mr-2"></div>
                          Creating Card...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <CreditCard className="h-5 w-5 mr-2" />
                          Create Virtual Card
                        </div>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateCardModal;