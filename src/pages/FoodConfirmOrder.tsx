import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Bike, Car } from 'lucide-react';
import { useFoodOrderSession } from '../contexts/FoodOrderSession';
import { useFoodPayment } from '../contexts/FoodPaymentContext';
import { useFirebaseRide } from '../hooks/useFirebaseRide';
import { useUserProfile } from '../hooks/useUserProfile';

export function FoodConfirmOrder() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { createRide } = useFirebaseRide();
  const {
    cartItems,
    getCurrentLocationFoods,
    selectedDeliveryMode,
    deliveryModeFee,
    deliveryLocation,
    clearCart
  } = useFoodOrderSession();

  const currentLocationFoods = getCurrentLocationFoods();
  const foodSubtotal = currentLocationFoods.reduce((sum, item) => sum + item.price, 0);
  const deliveryFee = deliveryModeFee || 0;
  const total = foodSubtotal + deliveryFee;

  const getDeliveryIcon = () => {
    switch (selectedDeliveryMode) {
      case 'motorbike':
        return <Bike size={20} className="text-gray-600" />;
      case 'car':
        return <Car size={20} className="text-gray-600" />;
      case 'bicycle':
        return <span className="text-xl">🚴</span>;
      default:
        return <Bike size={20} className="text-gray-600" />;
    }
  };

  const [isConfirming, setIsConfirming] = useState(false);
  const { capturePayment } = useFoodPayment();

  const handleConfirmOrder = async () => {
    setIsConfirming(true);

    try {
      console.log('[FoodConfirmOrder] Creating food delivery request in rides collection');

      const foodRequest = {
        type: 'food' as const,
        deliveryType: selectedDeliveryMode as 'motorbike' | 'car' | 'bicycle',
        items: currentLocationFoods,
        subtotal: foodSubtotal,
        deliveryFee,
        total,
        pickupLocation: currentLocationFoods[0]?.storeName || 'Restaurant',
        dropoffLocation: deliveryLocation || 'Current Location',
        destination: deliveryLocation || 'Current Location',
        pickup: currentLocationFoods[0]?.storeName || 'Restaurant',
        stops: [],
        carType: selectedDeliveryMode || 'motorbike',
        price: total,
        status: 'pending' as const,
        userId: profile?.id || 'user123',
        userName: profile?.name || 'Unknown User'
      };

      const rideId = await createRide(foodRequest as any);
      console.log('[FoodConfirmOrder] Food request created with ID:', rideId);

      localStorage.setItem('currentRideId', rideId);

      setIsConfirming(false);
      navigate('/waiting-for-driver');
    } catch (error) {
      console.error('[FoodConfirmOrder] Error confirming order:', error);
      setIsConfirming(false);
      alert('Error confirming order. Please try again.');
    }
  };

  if (cartItems.length === 0) {
    navigate('/shop');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-blue-50 to-green-50">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      <motion.div
        className="absolute top-0 left-0 right-0 z-10 p-4"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <button
          onClick={() => navigate('/food-delivery')}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50"
        >
          <ArrowLeft size={20} className="text-gray-800" />
        </button>
      </motion.div>

      <motion.div
        className="absolute top-24 left-1/2 transform -translate-x-1/2 z-10 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="text-center">
          <div className="text-2xl font-bold">15</div>
          <div className="text-sm">min</div>
        </div>
      </motion.div>

      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-20 max-h-[75vh] flex flex-col"
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
      >
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{deliveryLocation || 'Current Location'}</h2>
            <p className="text-gray-600">Confirm your food delivery</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Your Order</h3>
            <div className="space-y-2 mb-4">
              {currentLocationFoods.map((food) => (
                <div key={food.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{food.name}</p>
                    <p className="text-xs text-gray-500">{food.storeName}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">K{food.price}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Food subtotal</span>
                <span className="font-medium text-gray-900">R {foodSubtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery fee</span>
                <span className="font-medium text-gray-900">R {deliveryFee}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-green-600 text-lg">R {total}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Delivery Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="text-green-600 flex-shrink-0 mt-1" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Delivery to</p>
                  <p className="text-sm text-gray-600">{deliveryLocation || 'Current Location'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                {getDeliveryIcon()}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Delivery via</p>
                  <p className="text-sm text-gray-600 capitalize">{selectedDeliveryMode || 'Motorbike'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-200 pt-4 flex-shrink-0">
          <motion.button
            onClick={handleConfirmOrder}
            disabled={isConfirming}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg disabled:bg-gray-300 disabled:text-gray-500"
            whileTap={{ scale: 0.98 }}
          >
            {isConfirming ? 'Confirming...' : 'Confirm order'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
