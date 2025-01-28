const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ["GET", "POST"]
    }
});
const cors = require('cors');
app.use(cors());

const queue = new Set();
const matches = new Map();

server.listen(3000, async () => {
    console.log('listening on *:3000');
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('enterQueue', () => {
        if (queue.has(socket.id)) return;

        if (queue.size > 0) {
            // Match with the first person in queue
            const peer = queue.values().next().value;
            queue.delete(peer);

            // Create a match
            const matchId = `${peer}-${socket.id}`;
            matches.set(matchId, { peer1: peer, peer2: socket.id });

            // Notify both peers
            io.to(peer).emit('matched', { matchId, initiator: true });
            socket.emit('matched', { matchId, initiator: false });
        } else {
            // Add to queue
            queue.add(socket.id);
            socket.emit('queued');
        }
    });

    socket.on('leaveQueue', () => {
        queue.delete(socket.id);
    });

    socket.on('offer', ({ matchId, offer }) => {
        const match = matches.get(matchId);
        if (match && match.peer1 === socket.id) {
            io.to(match.peer2).emit('offer', { matchId, offer });
        }
    });

    socket.on('answer', ({ matchId, answer }) => {
        const match = matches.get(matchId);
        if (match && match.peer2 === socket.id) {
            io.to(match.peer1).emit('answer', { matchId, answer });
        }
    });

    socket.on('iceCandidate', ({ matchId, candidate }) => {
        const match = matches.get(matchId);
        if (match) {
            const peer = match.peer1 === socket.id ? match.peer2 : match.peer1;
            io.to(peer).emit('iceCandidate', { matchId, candidate });
        }
    });

    socket.on('disconnect', () => {
        queue.delete(socket.id);
        // Notify peers if in a match
        for (const [matchId, match] of matches.entries()) {
            if (match.peer1 === socket.id || match.peer2 === socket.id) {
                const peer = match.peer1 === socket.id ? match.peer2 : match.peer1;
                io.to(peer).emit('peerDisconnected', { matchId });
                matches.delete(matchId);
            }
        }
    });
});