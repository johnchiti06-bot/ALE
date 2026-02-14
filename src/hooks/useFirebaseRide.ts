 import { useState, useEffect, useCallback } from 'react';
import { firebaseService } from '../services/firebaseService';
import { RideRequest } from '../types';

export const useFirebaseRide = (rideId?: string | null) => {
  const [currentRide, setCurrentRide] = useState<RideRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    if (!rideId) {
      console.log('[useFirebaseRide] No rideId provided, skipping listener setup');
      return;
    }

    console.log('[useFirebaseRide] Setting up listener for rideId:', rideId);

    const unsubscribe = firebaseService.listenToRideRequest(rideId, (ride) => {
      console.log('[useFirebaseRide] Ride data received:', {
        rideId: ride?.id,
        status: ride?.status,
        type: (ride as any)?.type,
        driverId: ride?.driverId,
        hasRide: !!ride
      });

      if (ride) {
        setCurrentRide(ride);

        if (ride.driverId && ride.status === 'accepted') {
          console.log('[useFirebaseRide] Ride accepted! Setting isAccepted to true');
          setIsAccepted(true);
        }
      }
    });

    return () => {
      console.log('[useFirebaseRide] Cleaning up listener for rideId:', rideId);
      unsubscribe();
    };
  }, [rideId]);

  const createRide = useCallback(async (rideData: Omit<RideRequest, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    try {
      console.log('[useFirebaseRide] Creating ride with data:', rideData);
      const rideId = await firebaseService.createRideRequest(rideData);
      console.log('[useFirebaseRide] Ride created successfully with ID:', rideId);

      return rideId;
    } catch (error) {
      console.error('[useFirebaseRide] Error creating ride:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelRide = useCallback(async (rideId: string) => {
    try {
      await firebaseService.updateRideStatus(rideId, 'cancelled');
      setCurrentRide(null);
    } catch (error) {
      console.error('Error cancelling ride:', error);
      throw error;
    }
  }, []);

  return {
    currentRide,
    isLoading,
    isAccepted,
    createRide,
    cancelRide
  };
};
