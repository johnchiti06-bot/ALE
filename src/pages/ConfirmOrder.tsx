 import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Bike, Car } from 'lucide-react';
import { MapBackground } from '../components/MapBackground';
import { useFirebaseRide } from '../hooks/useFirebaseRide';
import { useUserProfile } from '../hooks/useUserProfile';
import { calculatePriceWithStops, getCarTypePrice } from '../utils/priceCalculation';
import { useRideContext } from '../contexts/RideContext';
import { FoodItem } from '../types';

interface ConfirmOrderProps {
  destination?: string;
  pickup?: string;
  stops?: string[];
  carType?: string;
  price?: number;
  onBack?: () => void;
  onRideConfirmed?: () => void;
  onRideCreated?: (rideId: string) => void;
}

export const ConfirmOrder: React.FC<ConfirmOrderProps> = ({
  destination: propDestination,
  pickup: propPickup,
  stops: propStops = [],
  carType: propCarType,
  price: propPrice,
  onBack: propOnBack,
  onRideConfirmed: propOnRideConfirmed,
  onRideCreated: propOnRideCreated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useUserProfile();
  const { createRide } = useFirebaseRide();
  const { isRideActive } = useRideContext();
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state as any) || {};
  const requestType = state.requestType || 'ride';

  const isFood = requestType === 'food';

  const foodItems = state.foodItems as FoodItem[] || [];
  const foodSubtotal = state.subtotal || 0;
  const deliveryFee = state.deliveryFee || 0;
  const foodTotal = state.total || 0;
  const selectedDeliveryType = state.selectedDeliveryType || 'car';
  const pickupLocation = state.pickupLocation || 'Current Location';
  const dropoffLocation = state.dropoffLocation || 'Delivery Location';

  // Ride mode data
  const destination = propDestination || dropoffLocation;
  const pickup = propPickup || pickupLocation;
  const stops = propStops || [];
  const carType = propCarType || selectedDeliveryType;

  const priceCalculation = calculatePriceWithStops(pickup, destination, stops);
  const finalPrice = isFood ? foodTotal : getCarTypePrice(priceCalculation.totalPrice, carType);

  const handleBack = () => {
    if (propOnBack) {
      propOnBack();
    } else {
      navigate(-1);
    }
  };

  const handleConfirmOrder = async () => {
    if (isLoading || isRideActive) {
      if (isRideActive) {
        alert('You already have an active ride.');
      }
      return;
    }

    setIsLoading(true);

    try {
      if (isFood) {
        const foodRequest = {
          type: 'food' as const,
          deliveryType: selectedDeliveryType as 'motorbike' | 'car' | 'bicycle',
          items: foodItems,
          subtotal: foodSubtotal,
          deliveryFee,
          total: foodTotal,
          pickupLocation,
          dropoffLocation,
          status: 'pending' as const,
          userId: profile?.id || 'user123',
          userName: profile?.name || 'Unknown User'
        };

        console.log('[ConfirmOrder] Creating food request:', foodRequest);
        const requestId = await createRide(foodRequest as any);
        console.log('[ConfirmOrder] Food request created with ID:', requestId);
        console.log('[ConfirmOrder] Storing in localStorage as currentRideId:', requestId);
        localStorage.setItem('currentRideId', requestId);

        setIsLoading(false);
        navigate('/waiting-for-driver', {
          state: {
            requestType: 'food',
            foodItems,
            foodSubtotal,
            deliveryFee,
            deliveryMode: selectedDeliveryType,
            requestId
          }
        });
      } else {
        const rideRequest = {
          pickup,
          destination,
          stops: stops || [],
          carType,
          price: finalPrice,
          status: 'pending' as const,
          userId: profile?.id || 'user123',
          userName: profile?.name || 'Unknown User'
        };

        console.log('[ConfirmOrder] Creating ride request:', rideRequest);
        const rideId = await createRide(rideRequest);
        console.log('[ConfirmOrder] Ride request created with ID:', rideId);
        console.log('[ConfirmOrder] Storing in localStorage as currentRideId:', rideId);
        localStorage.setItem('currentRideId', rideId);

        if (propOnRideCreated) {
          propOnRideCreated(rideId);
        }

        if (propOnRideConfirmed) {
          propOnRideConfirmed();
        } else {
          console.log('[ConfirmOrder] Navigating to /waiting-for-driver');
          navigate('/waiting-for-driver');
        }
      }
    } catch (error) {
      console.error('Failed to create request:', error);
      setIsLoading(false);
      alert('Failed to confirm order. Please try again.');
    }
  };

  const getDeliveryIcon = () => {
    switch (selectedDeliveryType) {
      case 'motorbike':
        return <Bike size={20} className="text-green-600" />;
      case 'car':
        return <Car size={20} className="text-green-600" />;
      case 'bicycle':
        return <span className="text-xl">🚴</span>;
      default:
        return <Bike size={20} className="text-green-600" />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <MapBackground />

      {/* Header */}
      <AnimatePresence>
        {!isLoading && (
          <motion.div
            className="absolute top-0 left-0 right-0 z-10 p-4"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={handleBack}
              className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-800" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ETA info */}
      <motion.div
        className="absolute top-24 left-1/2 transform -translate-x-1/2 z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg">
          <div className="text-center">
            <div className="text-2xl font-bold">{isFood ? '15' : '2'}</div>
            <div className="text-sm">min</div>
          </div>
        </div>
      </motion.div>

      {/* Bottom confirmation panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6 z-20 max-h-[75vh] flex flex-col"
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.2 }}
      >
        <div className="flex-1 overflow-y-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isFood ? (dropoffLocation || 'Delivery Location') : destination}
            </h2>
            <p className="text-gray-600">
              {isFood ? 'Confirm your food delivery' : 'Confirm your ride'}
            </p>
            {!isFood && stops.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">via {stops.length} stop{stops.length > 1 ? 's' : ''}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {stops.map((stop, index) => (
                    <span key={index}>
                      {stop}{index < stops.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isFood && foodItems.length > 0 && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Order</h3>
              <div className="space-y-2 mb-4">
                {foodItems.map((food) => (
                  <div key={food.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{food.name}</p>
                      <p className="text-xs text-gray-500">{food.storeName}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-900">R {food.price}</span>
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
                  <span className="font-bold text-green-600 text-lg">R {foodTotal}</span>
                </div>
              </div>
            </div>
          )}

          {isFood && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Delivery Details</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Delivery to</p>
                    <p className="text-sm text-gray-600">{dropoffLocation || 'Delivery Location'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  {getDeliveryIcon()}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Delivery via</p>
                    <p className="text-sm text-gray-600 capitalize">{selectedDeliveryType || 'Motorbike'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isFood && (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <span className="text-lg font-medium text-gray-700">{carType}</span>
                <span className="text-2xl font-bold text-gray-900">R {finalPrice}</span>
              </div>
              <div className="text-sm text-gray-500 text-center">
                {priceCalculation.totalDistance}km total distance
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 flex-shrink-0">
          <motion.button
            onClick={handleConfirmOrder}
            disabled={isLoading || isRideActive}
            className={`w-full py-4 rounded-xl font-semibold text-lg shadow-lg transition-colors
              ${isLoading || isRideActive ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: isLoading || isRideActive ? 1 : 1.02 }}
          >
            {isLoading ? 'Processing...' : isRideActive ? 'Ride Active' : 'Confirm order'}
          </motion.button>
          {isRideActive && (
            <p className="text-gray-500 text-center text-sm mt-2">
              You have an active ride
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};