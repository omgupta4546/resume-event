import { io } from 'socket.io-client';

// In production on Vercel, the socket needs to connect to the Render backend.
// Set VITE_BACKEND_URL in Vercel environment variables.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || undefined;

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 2000,
  timeout: 10000,
});

socket.on('connect', () => {
  console.log('🔌 Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.warn('❌ Socket disconnected:', reason);
});

socket.on('connect_error', (err) => {
  console.error('⚠️ Connection error:', err.message);
});

export default socket;
