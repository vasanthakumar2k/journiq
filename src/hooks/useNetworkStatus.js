import { useState, useEffect } from 'react';

// In a real app, this would use @react-native-community/netinfo
export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Logic to monitor network status
  }, []);

  return isConnected;
};
