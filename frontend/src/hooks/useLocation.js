import { useState, useEffect } from 'react';

export const useLocation = (enableTracking = false) => {
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enableTracking || !navigator.geolocation) {
      return;
    }

    const handleSuccess = (position) => {
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setError(null);
    };

    const handleError = (err) => {
      setError(err.message);
    };

    // Single capture first
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError);

    // Watch position coordinates in real-time
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enableTracking]);

  return { coords, error };
};
