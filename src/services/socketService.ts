import { io, Socket } from 'socket.io-client';

// Point to our backend server
// import.meta.env.VITE_SOCKET_URL is set during build or by the hosting platform (Vercel/Netlify)
const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket: Socket = io(URL, {
    autoConnect: false,
    transports: ['websocket'] // Skip polling to avoid 'xhr poll error'
});

// Helper to debug connection events
socket.onAny((event, ...args) => {
    console.log(`[Socket Event] ${event}`, args);
});
