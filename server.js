const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const http = require('http');
const socketIo = require('socket.io');

// Initialize the Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
fs.ensureDirSync(dataDir);

// Initialize playlists.json if it doesn't exist
const playlistsFile = path.join(dataDir, 'playlists.json');
if (!fs.existsSync(playlistsFile)) {
    fs.writeJsonSync(playlistsFile, { playlists: [] });
}

// Routes
const filesRouter = require('./routes/files');
const playlistsRouter = require('./routes/playlists');
const bluetoothRouter = require('./routes/bluetooth');

app.use('/api/files', filesRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/bluetooth', bluetoothRouter);

// Socket.io for real-time updates
io.on('connection', (socket) => {
    console.log('Client connected');

    // Handle Bluetooth events
    socket.on('bluetooth:scan', () => {
        // Socket event handlers will be implemented in the bluetooth.js route
        socket.emit('bluetooth:scanning');
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});