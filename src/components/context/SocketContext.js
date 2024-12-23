import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { generateDeviceId } from '../utils/peerConnectionUtils';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isSocketConnected, setSocketIsConnected] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const newSocket = io(apiUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      const deviceId = generateDeviceId();

      newSocket.emit('registerDevice', deviceId);
      console.log('Connected to server with socket ID:', newSocket.id);
      // setSocket(newSocket); // Set the socket after connection
      setSocketIsConnected(true); //
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setSocketIsConnected(false); //
    });

    return () => {
      newSocket.disconnect(); //
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isSocketConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
