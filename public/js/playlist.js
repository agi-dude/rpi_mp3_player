// Playlist.js - Playlist management

class PlaylistManager {
    constructor() {
        // Elements
        this.playlistsListEl = document.getElementById('playlistsList');
        this.createPlaylistBtn = document.getElementById('createPlaylistBtn');
        this.playlistDetailView = document.getElementById('playlistDetailView');
        this.playlistNameEl = document.getElementById('playlistName');
        this.playlistTracksEl = document.getElementById('playlistTracks');
        this.backToPlaylistsBtn = document.getElementById('backToPlaylistsBtn');
        this.playPlaylistBtn = document.getElementById('playPlaylistBtn');
        this.shufflePlaylistBtn = document.getElementById('shufflePlaylistBtn');
        this.editPlaylistBtn = document.getElementById('editPlaylistBtn');

        // State
        this.playlists = [];
        this.currentPlaylist = null;

        // Initialize
        this.init();
    }

    init() {
        // Load playlists
        this.loadPlaylists();

        // Event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Create playlist button
        this.createPlaylistBtn.addEventListener('click', () => {
            this.createNewPlaylist();
        });

        // Back button
        this.backToPlaylistsBtn.addEventListener('click', () => {
            player.showView('playlistsView');
        });

        // Play playlist button
        this.playPlaylistBtn.addEventListener('click', () => {
            if (this.currentPlaylist) {
                this.playPlaylist(this.currentPlaylist);
            }
        });

        // Shuffle playlist button
        this.shufflePlaylistBtn.addEventListener('click', () => {
            if (this.currentPlaylist) {
                this.playPlaylist(this.currentPlaylist, true);
            }
        });

        // Edit playlist button
        this.editPlaylistBtn.addEventListener('click', () => {
            if (this.currentPlaylist) {
                this.showEditPlaylistModal(this.currentPlaylist);
            }
        });

        // Navigation events
        document.getElementById('navPlaylists').addEventListener('click', () => {
            // Refresh playlists when navigating to playlists view
            this.loadPlaylists();
        });
    }

    loadPlaylists() {
        this.playlistsListEl.innerHTML = '<div class="loading">Loading playlists...</div>';

        fetch('/api/playlists')
            .then(response => response.json())
            .then(data => {
                this.playlists = data.playlists || [];
                this.renderPlaylists();
            })
            .catch(error => {
                console.error('Error loading playlists:', error);
                this.playlistsListEl.innerHTML = '<div class="error">Error loading playlists. Please try again.</div>';
            });
    }

    renderPlaylists() {
        this.playlistsListEl.innerHTML = '';

        if (this.playlists.length === 0) {
            this.playlistsListEl.innerHTML = '<div class="empty">No playlists found. Create a new playlist to get started.</div>';
            return;
        }

        this.playlists.forEach(playlist => {
            const item = document.createElement('div');
            item.className = 'playlist-item';

            item.innerHTML = `
        <div class="playlist-info">
          <div class="playlist-title">${playlist.name}</div>
          <div class="playlist-count">${playlist.tracks.length} tracks</div>
        </div>
        <div class="playlist-actions">
          <button class="icon-btn play-btn" title="Play">
            <i class="fas fa-play"></i>
          </button>
          <button class="icon-btn delete-btn" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

            // Open playlist on click
            item.addEventListener('click', (e) => {
                // Don't open if clicking on action buttons
                if (e.target.closest('.playlist-actions')) {
                    return;
                }

                this.openPlaylist(playlist);
            });

            // Play button
            const playBtn = item.querySelector('.play-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playPlaylist(playlist);
            });

            // Delete button
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeletePlaylist(playlist);
            });

            this.playlistsListEl.appendChild(item);
        });
    }

    openPlaylist(playlist) {
        this.currentPlaylist = playlist;

        // Update UI
        this.playlistNameEl.textContent = playlist.name;
        this.renderPlaylistTracks(playlist);

        // Show the detail view
        player.showView('playlistDetailView');
    }

    renderPlaylistTracks(playlist) {
        this.playlistTracksEl.innerHTML = '';

        if (!playlist.tracks || playlist.tracks.length === 0) {
            this.playlistTracksEl.innerHTML = '<div class="empty">No tracks in this playlist.</div>';
            return;
        }

        playlist.tracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'track-item';

            item.innerHTML = `
        <div class="track-item-info">
          <div class="track-item-title">${track.title || 'Unknown Track'}</div>
          <div class="track-item-artist">${track.artist || 'Unknown Artist'}</div>
        </div>
        <div class="track-item-duration">${this.formatDuration(track.duration)}</div>
        <div class="track-item-actions">
          <button class="icon-btn remove-btn" title="Remove">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;

            // Play track on click
            item.addEventListener('click', (e) => {
                // Don't play if clicking on action buttons
                if (e.target.closest('.track-item-actions')) {
                    return;
                }

                this.playTrack(playlist, index);
            });

            // Remove button
            const removeBtn = item.querySelector('.remove-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeTrackFromPlaylist(playlist, index);
            });

            this.playlistTracksEl.appendChild(item);
        });
    }

    playTrack(playlist, index) {
        if (!playlist || !playlist.tracks || index >= playlist.tracks.length) return;

        // Set the queue to this playlist starting from the selected track
        window.player.setQueue(playlist.tracks, index);

        // Show now playing view
        player.showView('nowPlayingView');
    }

    playPlaylist(playlist, shuffle = false) {
        if (!playlist || !playlist.tracks || playlist.tracks.length === 0) {
            player.showNotification('No tracks in this playlist');
            return;
        }

        // Set the player's shuffle state
        window.player.isShuffled = shuffle;

        // Set the queue to this playlist
        window.player.setQueue(playlist.tracks, 0);

        // Show now playing view
        player.showView('nowPlayingView');
    }

    createNewPlaylist() {
        keyboard.prompt('New Playlist', 'Enter playlist name', (name) => {
            if (!name) return;

            fetch('/api/playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    tracks: []
                })
            })
                .then(response => response.json())
                .then(data => {
                    player.showNotification(`Playlist "${name}" created`);
                    this.loadPlaylists();
                })
                .catch(error => {
                    console.error('Error creating playlist:', error);
                    player.showNotification('Error creating playlist');
                });
        });
    }

    confirmDeletePlaylist(playlist) {
        modal.show({
            title: 'Delete Playlist',
            content: `Are you sure you want to delete the playlist "${playlist.name}"?`,
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn btn-secondary'
                },
                {
                    text: 'Delete',
                    class: 'btn btn-danger',
                    callback: () => this.deletePlaylist(playlist)
                }
            ]
        });
    }

    deletePlaylist(playlist) {
        fetch(`/api/playlists/${playlist.id}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                player.showNotification(`Playlist "${playlist.name}" deleted`);
                this.loadPlaylists();
            })
            .catch(error => {
                console.error('Error deleting playlist:', error);
                player.showNotification('Error deleting playlist');
            });
    }

    removeTrackFromPlaylist(playlist, index) {
        fetch(`/api/playlists/${playlist.id}/tracks/${index}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                player.showNotification('Track removed from playlist');

                // Update the current playlist
                this.currentPlaylist = data;
                this.renderPlaylistTracks(data);
            })
            .catch(error => {
                console.error('Error removing track:', error);
                player.showNotification('Error removing track');
            });
    }

    showEditPlaylistModal(playlist) {
        const content = document.createElement('div');

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = playlist.name;
        nameInput.placeholder = 'Playlist name';

        content.appendChild(nameInput);

        modal.show({
            title: 'Edit Playlist',
            content,
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn btn-secondary'
                },
                {
                    text: 'Save',
                    class: 'btn',
                    callback: () => {
                        const newName = nameInput.value.trim();
                        if (newName) {
                            this.updatePlaylistName(playlist, newName);
                        }
                    }
                }
            ]
        });

        // Focus input and show keyboard
        setTimeout(() => {
            nameInput.focus();
            keyboard.show(nameInput);
        }, 300);
    }

    updatePlaylistName(playlist, newName) {
        fetch(`/api/playlists/${playlist.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: newName
            })
        })
            .then(response => response.json())
            .then(data => {
                player.showNotification('Playlist updated');

                // Update the current playlist
                this.currentPlaylist = data;
                this.playlistNameEl.textContent = data.name;

                // Refresh the playlists list
                this.loadPlaylists();
            })
            .catch(error => {
                console.error('Error updating playlist:', error);
                player.showNotification('Error updating playlist');
            });
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) {
            return '--:--';
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize the playlist manager
window.playlistManager = new PlaylistManager();