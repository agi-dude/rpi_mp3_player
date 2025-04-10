// Bluetooth.js - Bluetooth device management

class BluetoothManager {
    constructor() {
        // Elements
        this.bluetoothToggle = document.getElementById('bluetoothToggle');
        this.connectedDevicesEl = document.getElementById('connectedDevices');
        this.availableDevicesEl = document.getElementById('availableDevices');
        this.scanDevicesBtn = document.getElementById('scanDevicesBtn');

        // State
        this.isEnabled = false;
        this.isScanning = false;
        this.connectedDevices = [];
        this.availableDevices = [];

        // Initialize
        this.init();
    }

    init() {
        // Check Bluetooth status
        this.checkBluetoothStatus();

        // Event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Bluetooth toggle
        this.bluetoothToggle.addEventListener('change', () => {
            this.toggleBluetooth(this.bluetoothToggle.checked);
        });

        // Scan for devices button
        this.scanDevicesBtn.addEventListener('click', () => {
            this.scanForDevices();
        });

        // Socket events
        socket.on('bluetooth:scanning', () => {
            this.isScanning = true;
            this.updateUI();
        });

        socket.on('bluetooth:scan_complete', () => {
            this.isScanning = false;
            this.loadAvailableDevices();
        });

        // Navigation events
        document.getElementById('bluetoothBtn').addEventListener('click', () => {
            // Refresh device lists when opening the Bluetooth view
            this.refreshDeviceLists();
        });
    }

    checkBluetoothStatus() {
        fetch('/api/bluetooth/connected')
            .then(response => response.json())
            .then(data => {
                // If we have connected devices, Bluetooth must be on
                this.isEnabled = data.devices.length > 0;
                this.bluetoothToggle.checked = this.isEnabled;

                // Load devices
                this.refreshDeviceLists();
            })
            .catch(error => {
                console.error('Error checking Bluetooth status:', error);
                this.isEnabled = false;
                this.bluetoothToggle.checked = false;
            });
    }

    refreshDeviceLists() {
        this.loadConnectedDevices();
        this.loadAvailableDevices();
    }

    loadConnectedDevices() {
        this.connectedDevicesEl.innerHTML = '<div class="loading">Loading connected devices...</div>';

        fetch('/api/bluetooth/connected')
            .then(response => response.json())
            .then(data => {
                this.connectedDevices = data.devices || [];
                this.renderConnectedDevices();
            })
            .catch(error => {
                console.error('Error loading connected devices:', error);
                this.connectedDevicesEl.innerHTML = '<div class="error">Error loading connected devices.</div>';
            });
    }

    loadAvailableDevices() {
        this.availableDevicesEl.innerHTML = '<div class="loading">Loading available devices...</div>';

        fetch('/api/bluetooth/available')
            .then(response => response.json())
            .then(data => {
                this.availableDevices = data.devices || [];
                this.renderAvailableDevices();
            })
            .catch(error => {
                console.error('Error loading available devices:', error);
                this.availableDevicesEl.innerHTML = '<div class="error">Error loading available devices.</div>';
            });
    }

    renderConnectedDevices() {
        this.connectedDevicesEl.innerHTML = '';

        if (this.connectedDevices.length === 0) {
            this.connectedDevicesEl.innerHTML = '<div class="empty">No connected devices.</div>';
            return;
        }

        this.connectedDevices.forEach(device => {
            const item = document.createElement('div');
            item.className = 'device-item';

            item.innerHTML = `
        <div class="device-info">
          <div class="device-name">${device.name}</div>
          <div class="device-mac">${device.mac}</div>
        </div>
        <div class="device-actions">
          <button class="icon-btn disconnect-btn" title="Disconnect">
            <i class="fas fa-unlink"></i>
          </button>
        </div>
      `;

            // Disconnect button
            const disconnectBtn = item.querySelector('.disconnect-btn');
            disconnectBtn.addEventListener('click', () => {
                this.disconnectDevice(device);
            });

            this.connectedDevicesEl.appendChild(item);
        });
    }

    renderAvailableDevices() {
        this.availableDevicesEl.innerHTML = '';

        if (this.isScanning) {
            this.availableDevicesEl.innerHTML = '<div class="loading">Scanning for devices...</div>';
            return;
        }

        if (this.availableDevices.length === 0) {
            this.availableDevicesEl.innerHTML = '<div class="empty">No devices found. Try scanning again.</div>';
            return;
        }

        // Filter out already connected devices
        const connectedMacs = this.connectedDevices.map(d => d.mac);
        const availableOnly = this.availableDevices.filter(d => !connectedMacs.includes(d.mac));

        if (availableOnly.length === 0) {
            this.availableDevicesEl.innerHTML = '<div class="empty">No additional devices found. Try scanning again.</div>';
            return;
        }

        availableOnly.forEach(device => {
            const item = document.createElement('div');
            item.className = 'device-item';

            item.innerHTML = `
        <div class="device-info">
          <div class="device-name">${device.name}</div>
          <div class="device-mac">${device.mac}</div>
        </div>
        <div class="device-actions">
          <button class="icon-btn connect-btn" title="Connect">
            <i class="fas fa-link"></i>
          </button>
        </div>
      `;

            // Connect button
            const connectBtn = item.querySelector('.connect-btn');
            connectBtn.addEventListener('click', () => {
                this.connectDevice(device);
            });

            this.availableDevicesEl.appendChild(item);
        });
    }

    toggleBluetooth(enabled) {
        fetch('/api/bluetooth/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled })
        })
            .then(response => response.json())
            .then(data => {
                this.isEnabled = data.enabled;
                this.bluetoothToggle.checked = this.isEnabled;

                if (this.isEnabled) {
                    player.showNotification('Bluetooth enabled');
                    this.refreshDeviceLists();
                } else {
                    player.showNotification('Bluetooth disabled');
                    this.connectedDevices = [];
                    this.availableDevices = [];
                    this.renderConnectedDevices();
                    this.renderAvailableDevices();
                }
            })
            .catch(error => {
                console.error('Error toggling Bluetooth:', error);
                player.showNotification('Error toggling Bluetooth');
                // Revert the toggle to its previous state
                this.bluetoothToggle.checked = this.isEnabled;
            });
    }

    scanForDevices() {
        if (!this.isEnabled) {
            player.showNotification('Please enable Bluetooth first');
            return;
        }

        if (this.isScanning) {
            player.showNotification('Already scanning...');
            return;
        }

        // Update UI to show scanning state
        this.isScanning = true;
        this.scanDevicesBtn.disabled = true;
        this.scanDevicesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        this.renderAvailableDevices();

        // Send scan request
        fetch('/api/bluetooth/scan', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                // The scan will continue in the background
                // We'll update the UI when we get the scan_complete event

                // Set a timeout to refresh the device list after 10 seconds
                // in case we don't get the scan_complete event
                setTimeout(() => {
                    if (this.isScanning) {
                        this.isScanning = false;
                        this.updateUI();
                        this.loadAvailableDevices();
                    }
                }, 10000);
            })
            .catch(error => {
                console.error('Error scanning for devices:', error);
                player.showNotification('Error scanning for devices');
                this.isScanning = false;
                this.updateUI();
            });
    }

    connectDevice(device) {
        if (!device || !device.mac) return;

        // Show connecting status
        const deviceItems = this.availableDevicesEl.querySelectorAll('.device-item');
        deviceItems.forEach(item => {
            const mac = item.querySelector('.device-mac');
            if (mac && mac.textContent === device.mac) {
                const connectBtn = item.querySelector('.connect-btn');
                if (connectBtn) {
                    connectBtn.disabled = true;
                    connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                }
            }
        });

        fetch('/api/bluetooth/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mac: device.mac })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    player.showNotification(`Connected to ${device.name}`);
                    // Refresh device lists
                    this.refreshDeviceLists();
                } else {
                    player.showNotification(`Failed to connect to ${device.name}`);
                    this.updateUI();
                }
            })
            .catch(error => {
                console.error('Error connecting to device:', error);
                player.showNotification(`Error connecting to ${device.name}`);
                this.updateUI();
            });
    }

    disconnectDevice(device) {
        if (!device || !device.mac) return;

        // Show disconnecting status
        const deviceItems = this.connectedDevicesEl.querySelectorAll('.device-item');
        deviceItems.forEach(item => {
            const mac = item.querySelector('.device-mac');
            if (mac && mac.textContent === device.mac) {
                const disconnectBtn = item.querySelector('.disconnect-btn');
                if (disconnectBtn) {
                    disconnectBtn.disabled = true;
                    disconnectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                }
            }
        });

        fetch('/api/bluetooth/disconnect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mac: device.mac })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    player.showNotification(`Disconnected from ${device.name}`);
                    // Refresh device lists
                    this.refreshDeviceLists();
                } else {
                    player.showNotification(`Failed to disconnect from ${device.name}`);
                    this.updateUI();
                }
            })
            .catch(error => {
                console.error('Error disconnecting from device:', error);
                player.showNotification(`Error disconnecting from ${device.name}`);
                this.updateUI();
            });
    }

    updateUI() {
        // Update scan button
        this.scanDevicesBtn.disabled = this.isScanning || !this.isEnabled;
        if (this.isScanning) {
            this.scanDevicesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        } else {
            this.scanDevicesBtn.innerHTML = '<i class="fas fa-search"></i> Scan for Devices';
        }
    }
}

// Initialize the Bluetooth manager
window.bluetoothManager = new BluetoothManager();