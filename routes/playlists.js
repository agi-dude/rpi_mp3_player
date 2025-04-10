const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');

const playlistsFile = path.join(__dirname, '../data/playlists.json');

// Get all playlists
router.get('/', async (req, res) => {
    try {
        const data = await fs.readJson(playlistsFile);
        res.json(data);
    } catch (error) {
        console.error('Error reading playlists:', error);
        res.status(500).json({ error: 'Error reading playlists' });
    }
});

// Get a specific playlist
router.get('/:id', async (req, res) => {
    try {
        const data = await fs.readJson(playlistsFile);
        const playlist = data.playlists.find(p => p.id === req.params.id);

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        res.json(playlist);
    } catch (error) {
        console.error('Error reading playlist:', error);
        res.status(500).json({ error: 'Error reading playlist' });
    }
});

// Create a new playlist
router.post('/', async (req, res) => {
    try {
        const { name, tracks } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Playlist name is required' });
        }

        const data = await fs.readJson(playlistsFile);

        const newPlaylist = {
            id: Date.now().toString(),
            name,
            tracks: tracks || [],
            createdAt: new Date().toISOString()
        };

        data.playlists.push(newPlaylist);

        await fs.writeJson(playlistsFile, data, { spaces: 2 });

        res.status(201).json(newPlaylist);
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ error: 'Error creating playlist' });
    }
});

// Update a playlist
router.put('/:id', async (req, res) => {
    try {
        const { name, tracks } = req.body;
        const playlistId = req.params.id;

        const data = await fs.readJson(playlistsFile);
        const playlistIndex = data.playlists.findIndex(p => p.id === playlistId);

        if (playlistIndex === -1) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Update the playlist
        if (name) {
            data.playlists[playlistIndex].name = name;
        }

        if (tracks) {
            data.playlists[playlistIndex].tracks = tracks;
        }

        data.playlists[playlistIndex].updatedAt = new Date().toISOString();

        await fs.writeJson(playlistsFile, data, { spaces: 2 });

        res.json(data.playlists[playlistIndex]);
    } catch (error) {
        console.error('Error updating playlist:', error);
        res.status(500).json({ error: 'Error updating playlist' });
    }
});

// Add a track to playlist
router.post('/:id/tracks', async (req, res) => {
    try {
        const { track } = req.body;
        const playlistId = req.params.id;

        if (!track || !track.path) {
            return res.status(400).json({ error: 'Valid track object with path is required' });
        }

        const data = await fs.readJson(playlistsFile);
        const playlistIndex = data.playlists.findIndex(p => p.id === playlistId);

        if (playlistIndex === -1) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Add the track if it doesn't already exist
        const trackExists = data.playlists[playlistIndex].tracks.some(t => t.path === track.path);

        if (!trackExists) {
            data.playlists[playlistIndex].tracks.push(track);
            data.playlists[playlistIndex].updatedAt = new Date().toISOString();

            await fs.writeJson(playlistsFile, data, { spaces: 2 });
        }

        res.json(data.playlists[playlistIndex]);
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        res.status(500).json({ error: 'Error adding track to playlist' });
    }
});

// Remove a track from playlist
router.delete('/:id/tracks/:trackIndex', async (req, res) => {
    try {
        const playlistId = req.params.id;
        const trackIndex = parseInt(req.params.trackIndex, 10);

        if (isNaN(trackIndex)) {
            return res.status(400).json({ error: 'Invalid track index' });
        }

        const data = await fs.readJson(playlistsFile);
        const playlistIndex = data.playlists.findIndex(p => p.id === playlistId);

        if (playlistIndex === -1) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Check if track exists
        if (trackIndex < 0 || trackIndex >= data.playlists[playlistIndex].tracks.length) {
            return res.status(404).json({ error: 'Track not found' });
        }

        // Remove the track
        data.playlists[playlistIndex].tracks.splice(trackIndex, 1);
        data.playlists[playlistIndex].updatedAt = new Date().toISOString();

        await fs.writeJson(playlistsFile, data, { spaces: 2 });

        res.json(data.playlists[playlistIndex]);
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        res.status(500).json({ error: 'Error removing track from playlist' });
    }
});

// Delete a playlist
router.delete('/:id', async (req, res) => {
    try {
        const playlistId = req.params.id;

        const data = await fs.readJson(playlistsFile);
        const playlistIndex = data.playlists.findIndex(p => p.id === playlistId);

        if (playlistIndex === -1) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Remove the playlist
        data.playlists.splice(playlistIndex, 1);

        await fs.writeJson(playlistsFile, data, { spaces: 2 });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ error: 'Error deleting playlist' });
    }
});

module.exports = router;