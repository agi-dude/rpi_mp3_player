// FileBrowser.js - File browsing and management

class FileBrowser {
    constructor() {
        // Elements
        this.fileListEl = document.getElementById('fileList');
        this.currentPathEl = document.getElementById('currentPath');
        this.browseBackBtn = document.getElementById('browseBackBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.scanFolderBtn = document.getElementById('scanFolderBtn');

        // State
        this.currentPath = '';
        this.pathHistory = [];
        this.fileCache = {};

        // Initialize
        this.init();
    }

    init() {
        // Load default directories
        this.loadDefaultDirectories();

        // Event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Back button
        this.browseBackBtn.addEventListener('click', () => {
            if (this.pathHistory.length > 0) {
                this.currentPath = this.pathHistory.pop();
                this.loadDirectory(this.currentPath);
            } else {
                this.loadDefaultDirectories();
            }
        });

        // Refresh button
        this.refreshBtn.addEventListener('click', () => {
            if (this.currentPath) {
                this.loadDirectory(this.currentPath, true);
            } else {
                this.loadDefaultDirectories(true);
            }
        });

        // Scan folder button
        this.scanFolderBtn.addEventListener('click', () => {
            if (this.currentPath) {
                this.scanDirectory(this.currentPath);
            }
        });

        // Navigation events
        document.getElementById('navBrowse').addEventListener('click', () => {
            // Refresh file list when navigating to browse view
            if (this.currentPath) {
                this.loadDirectory(this.currentPath);
            } else {
                this.loadDefaultDirectories();
            }
        });
    }

    loadDefaultDirectories() {
        this.currentPath = '';
        this.pathHistory = [];
        this.fileListEl.innerHTML = '<div class="loading">Loading directories...</div>';
        this.currentPathEl.textContent = 'Root';

        fetch('/api/files/directories')
            .then(response => response.json())
            .then(data => {
                this.renderDirectories(data.directories);
            })
            .catch(error => {
                console.error('Error loading directories:', error);
                this.fileListEl.innerHTML = '<div class="error">Error loading directories. Please try again.</div>';
            });
    }

    renderDirectories(directories) {
        this.fileListEl.innerHTML = '';

        if (directories.length === 0) {
            this.fileListEl.innerHTML = '<div class="empty">No directories found.</div>';
            return;
        }

        directories.forEach(dir => {
            const item = document.createElement('div');
            item.className = 'file-item folder-item';

            item.innerHTML = `
        <i class="fas fa-folder file-icon"></i>
        <span class="file-name">${this.getNameFromPath(dir)}</span>
      `;

            item.addEventListener('click', () => {
                this.pathHistory.push(this.currentPath);
                this.loadDirectory(dir);
            });

            this.fileListEl.appendChild(item);
        });
    }

    loadDirectory(path, forceRefresh = false) {
        this.currentPath = path;
        this.currentPathEl.textContent = path;
        this.fileListEl.innerHTML = '<div class="loading">Loading files...</div>';

        // Check if we have cached data
        if (!forceRefresh && this.fileCache[path]) {
            this.renderFiles(this.fileCache[path]);
            return;
        }

        fetch(`/api/files/browse?path=${encodeURIComponent(path)}`)
            .then(response => response.json())
            .then(data => {
                // Cache the results
                this.fileCache[path] = data;
                this.renderFiles(data);
            })
            .catch(error => {
                console.error('Error loading directory:', error);
                this.fileListEl.innerHTML = '<div class="error">Error loading directory. Please try again.</div>';
            });
    }

    renderFiles(data) {
        this.fileListEl.innerHTML = '';

        if (data.items.length === 0) {
            this.fileListEl.innerHTML = '<div class="empty">Empty directory.</div>';
            return;
        }

        data.items.forEach(item => {
            const fileItem = document.createElement('div');
            fileItem.className = item.isDirectory ? 'file-item folder-item' : 'file-item';

            if (item.isDirectory) {
                fileItem.innerHTML = `
          <i class="fas fa-folder file-icon"></i>
          <span class="file-name">${item.name}</span>
        `;

                fileItem.addEventListener('click', () => {
                    this.pathHistory.push(this.currentPath);
                    this.loadDirectory(item.path);
                });
            } else {
                // Check if it's an MP3 file
                const isMP3 = item.name.toLowerCase().endsWith('.mp3');
                const iconClass = isMP3 ? 'fa-music' : 'fa-file';

                fileItem.innerHTML = `
          <i class="fas ${iconClass} file-icon"></i>
          <span class="file-name">${item.name}</span>
        `;

                if (isMP3) {
                    fileItem.classList.add('mp3-item');
                    fileItem.addEventListener('click', () => {
                        this.playFile(item.path);
                    });
                }
            }

            this.fileListEl.appendChild(fileItem);
        });
    }

    scanDirectory(path) {
        modal.show({
            title: 'Scanning Directory',
            content: 'Scanning for MP3 files. This may take a while...',
            buttons: []
        });

        fetch('/api/files/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        })
            .then(response => response.json())
            .then(data => {
                modal.hide();

                if (data.files && data.files.length > 0) {
                    this.showScanResults(data);
                } else {
                    modal.show({
                        title: 'Scan Complete',
                        content: 'No MP3 files found in this directory.'
                    });
                }
            })
            .catch(error => {
                console.error('Error scanning directory:', error);
                modal.hide();
                modal.show({
                    title: 'Error',
                    content: 'Error scanning directory. Please try again.'
                });
            });
    }

    showScanResults(data) {
        const content = document.createElement('div');

        content.innerHTML = `
      <p>Found ${data.files.length} MP3 files in ${data.directory}</p>
      <div class="scan-results">
        ${data.files.slice(0, 10).map(file => `
          <div class="scan-item">
            <div class="scan-title">${file.title}</div>
            <div class="scan-artist">${file.artist}</div>
          </div>
        `).join('')}
        ${data.files.length > 10 ? '<div class="scan-more">...and more</div>' : ''}
      </div>
    `;

        // Add a create playlist button
        const createPlaylistBtn = document.createElement('button');
        createPlaylistBtn.className = 'btn';
        createPlaylistBtn.innerHTML = '<i class="fas fa-list"></i> Create Playlist';
        createPlaylistBtn.addEventListener('click', () => {
            this.createPlaylistFromScan(data.files);
            modal.hide();
        });

        content.appendChild(createPlaylistBtn);

        // Play all button
        const playAllBtn = document.createElement('button');
        playAllBtn.className = 'btn';
        playAllBtn.style.marginLeft = '10px';
        playAllBtn.innerHTML = '<i class="fas fa-play"></i> Play All';
        playAllBtn.addEventListener('click', () => {
            this.playFiles(data.files);
            modal.hide();
        });

        content.appendChild(playAllBtn);

        modal.show({
            title: 'Scan Results',
            content,
            buttons: [
                {
                    text: 'Close',
                    class: 'btn'
                }
            ]
        });
    }

    createPlaylistFromScan(files) {
        keyboard.prompt('New Playlist Name', 'Enter playlist name', (name) => {
            if (!name) return;

            // Create a new playlist with these files
            fetch('/api/playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    tracks: files
                })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.id) {
                        player.showNotification(`Playlist "${name}" created with ${files.length} tracks`);

                        // Navigate to playlists view
                        player.showView('playlistsView');

                        // Refresh playlists
                        if (window.playlistManager) {
                            playlistManager.loadPlaylists();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error creating playlist:', error);
                    player.showNotification('Error creating playlist');
                });
        });
    }

    playFile(path) {
        // Get file metadata and play
        fetch(`/api/files/metadata?path=${encodeURIComponent(path)}`)
            .then(response => response.json())
            .then(metadata => {
                // Add to queue and play
                window.player.setQueue([metadata], 0);
                player.showView('nowPlayingView');
            })
            .catch(error => {
                console.error('Error getting file metadata:', error);
                player.showNotification('Error playing file');
            });
    }

    playFiles(files) {
        if (!files || files.length === 0) return;

        // Set queue with all files
        window.player.setQueue(files, 0);
        player.showView('nowPlayingView');
    }

    getNameFromPath(path) {
        // Get the last part of the path
        const parts = path.split('/');
        return parts[parts.length - 1] || path;
    }
}

// Initialize the file browser
window.fileBrowser = new FileBrowser();