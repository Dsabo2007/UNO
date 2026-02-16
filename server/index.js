const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173", // Dynamic for production
        methods: ["GET", "POST"]
    }
});

// Store active rooms
// Room structure: { 
//   id: string, 
//   players: [{id: string, name: string, socketId: string}], 
//   gameState: object 
// }
const rooms = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create a Room
    socket.on('create_room', (data) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { playerName } = data;

        rooms.set(roomId, {
            id: roomId,
            players: [{
                id: socket.id,
                name: playerName,
                socketId: socket.id
            }],
            gameState: null // Will be initialized when game starts
        });

        socket.join(roomId);
        socket.emit('room_created', { roomId });
        console.log(`Room creating: ${roomId} by ${playerName}`);
    });

    // Join a Room
    socket.on('join_room', (data) => {
        const { roomId, playerName } = data;
        const room = rooms.get(roomId);

        if (room) {
            if (room.players.length >= 4) {
                socket.emit('error', { message: 'Room is full' });
                return;
            }

            const newPlayer = {
                id: socket.id,
                name: playerName,
                socketId: socket.id
            };

            room.players.push(newPlayer);
            socket.join(roomId);

            // Notify everyone in the room (including sender) about the new player list
            io.to(roomId).emit('player_joined', { players: room.players });
            console.log(`${playerName} joined room ${roomId}`);
        } else {
            socket.emit('error', { message: 'Room not found' });
        }
    });

    // Start Game
    socket.on('start_game', (data) => {
        const { roomId, initialGameState } = data;
        const room = rooms.get(roomId);
        if (room) {
            // Assign server-side socket IDs to the player objects if needed
            // For simplicity, we trust the client's initial state but override player IDs
            // to match socket IDs so we can manage turns correctly.

            // Actually, let's keep it simple: Client generates state, sends it, server broadcasts it.
            room.gameState = initialGameState;

            // Broadcast to all players in the room
            io.to(roomId).emit('game_started', { gameState: initialGameState });
            console.log(`Game started in room ${roomId}`);
        }
    });

    // Update Game State (Player played a card, drew, etc.)
    socket.on('update_game_state', (data) => {
        const { roomId, gameState } = data;
        const room = rooms.get(roomId);
        if (room) {
            room.gameState = gameState;
            // Broadcast the new state to everyone ELSE in the room
            // or everyone including sender to stay in sync
            socket.to(roomId).emit('game_state_updated', { gameState });
        }
    });

    // Chat/Messages/Action Logs
    socket.on('send_message', (data) => {
        socket.to(data.roomId).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected', socket.id);
        // Remove player from rooms
        rooms.forEach((room, roomId) => {
            const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                io.to(roomId).emit('player_left', { players: room.players });

                if (room.players.length === 0) {
                    rooms.delete(roomId);
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
