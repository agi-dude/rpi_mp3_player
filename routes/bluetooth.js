const express = require('express');
const router = express.Router();
const noble = require('noble');
const bleno = require('bleno');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs-extra');
const path = require('path');

// Store for discovered and connected devices
let discoveredDevices = new Map();
let connectedDevices = new Map();

// Store the noble state
let nobleState = 'unknown';
let isScanning = false;

// Path to store paired devices information
const PAIRED_DEVICES_FILE = path.join(__dirname, '../data/paired_devices.json');

// Initialize paired devices file if it doesn't exist
if (!fs.existsSync(PAIRED_DEVICES_FILE)) {
  fs.writeJsonSync(PAIRED_DEVICES_FILE, { devices: [] });
}

// Load paired devices
const loadPairedDevices = () => {
  try {
    return fs.readJsonSync(PAIRED_DEVICES_FILE).devices || [];
  } catch (error) {
    console.error('Error loading paired devices:', error);
    return [];
  }
};

// Save paired devices
const savePairedDevices = (devices) => {
  try {
    fs.writeJsonSync(PAIRED_DEVICES_FILE, { devices }, { spaces: 2 });
  } catch (error) {
    console.error('Error saving paired devices:', error);
  }
};

// Initialize Noble
noble.on('stateChange', (state) => {
  console.log(`Bluetooth adapter state: ${state}`);
  nobleState = state;
  
  if (state === 'poweredOn' && isScanning) {
    startScan();
  } else if (state !== 'poweredOn') {
    noble.stopScanning();
    isScanning = false;
  }
});

noble.on('discover', (peripheral) => {
  const device = {
    id: peripheral.id,
    mac: peripheral.address ? peripheral.address.replace(/-/g, ':').toLowerCase() : 'Unknown',
    name: peripheral.advertisement && peripheral.advertisement.localName || 'Unknown Device',
    rssi: peripheral.rssi,
    connectable: true,
    lastSeen: Date.now()
  };
  
  discoveredDevices.set(peripheral.id, {
    ...device,
    peripheral
  });
  
  // Emit device found event through socket.io
  if (global.io) {
    global.io.emit('bluetooth:device_found', device);
  }
});

noble.on('scanStop', () => {
  isScanning = false;
  if (global.io) {
    global.io.emit('bluetooth:scan_complete');
  }
});

// Start scanning for devices
const startScan = () => {
  if (nobleState === 'poweredOn') {
    noble.startScanning([], true); // scan for all devices
    isScanning = true;
    
    // Auto-stop scan after 20 seconds
    setTimeout(() => {
      if (isScanning) {
        noble.stopScanning();
      }
    }, 20000);
    
    return true;
  }
  return false;
};

// Connect to a device with Noble
const connectToDevice = async (deviceId) => {
  try {
    const deviceEntry = discoveredDevices.get(deviceId);
    if (!deviceEntry) {
      throw new Error('Device not found');
    }
    
    const peripheral = deviceEntry.peripheral;
    
    // Stop scanning during connection
    if (isScanning) {
      noble.stopScanning();
    }
    
    // Connect to the device
    await new Promise((resolve, reject) => {
      peripheral.once('connect', resolve);
      peripheral.once('disconnect', () => {
        if (connectedDevices.has(deviceId)) {
          connectedDevices.delete(deviceId);
          
          // Notify clients
          if (global.io) {
            global.io.emit('bluetooth:device_disconnected', { id: deviceId });
          }
        }
      });
      peripheral.once('error', reject);
      
      peripheral.connect((error) => {
        if (error) {
          reject(error);
        }
      });
    });
    
    // Add to connected devices
    connectedDevices.set(deviceId, deviceEntry);
    
    // Add to paired devices
    const pairedDevices = loadPairedDevices();
    const existingIndex = pairedDevices.findIndex(d => d.id === deviceId);
    
    if (existingIndex === -1) {
      pairedDevices.push({
        id: deviceEntry.id,
        mac: deviceEntry.mac,
        name: deviceEntry.name,
        pairedAt: new Date().toISOString()
      });
      savePairedDevices(pairedDevices);
    }
    
    return deviceEntry;
  } catch (error) {
    console.error(`Error connecting to device ${deviceId}:`, error);
    throw error;
  }
};

// Disconnect from a device
const disconnectDevice = async (deviceId) => {
  const deviceEntry = connectedDevices.get(deviceId);
  if (!deviceEntry) {
    throw new Error('Device not connected');
  }
  
  const peripheral = deviceEntry.peripheral;
  
  await new Promise((resolve) => {
    peripheral.once('disconnect', resolve);
    peripheral.disconnect();
  });
  
  connectedDevices.delete(deviceId);
  
  return deviceEntry;
};

// Get all paired devices
router.get('/paired', async (req, res) => {
  try {
    const pairedDevices = loadPairedDevices();
    res.json({ devices: pairedDevices });
  } catch (error) {
    console.error('Error getting paired devices:', error);
    res.status(500).json({ error: 'Error getting paired devices' });
  }
});

// Get all connected devices
router.get('/connected', async (req, res) => {
  try {
    const devices = Array.from(connectedDevices.values()).map(entry => ({
      id: entry.id,
      mac: entry.mac,
      name: entry.name
    }));
    
    res.json({ devices });
  } catch (error) {
    console.error('Error getting connected devices:', error);
    res.status(500).json({ error: 'Error getting connected devices' });
  }
});

// Get Bluetooth adapter state
router.get('/state', async (req, res) => {
  try {
    res.json({ 
      state: nobleState,
      isScanning,
      enabled: nobleState === 'poweredOn'
    });
  } catch (error) {
    console.error('Error getting Bluetooth state:', error);
    res.status(500).json({ error: 'Error getting Bluetooth state' });
  }
});

// Scan for devices
router.post('/scan', async (req, res) => {
  try {
    if (isScanning) {
      return res.json({ 
        success: true, 
        message: 'Already scanning for devices',
        isScanning: true
      });
    }
    
    const success = startScan();
    
    res.json({ 
      success, 
      message: success ? 'Bluetooth scan started' : 'Cannot start scan, Bluetooth not ready',
      isScanning: isScanning
    });
  } catch (error) {
    console.error('Error starting Bluetooth scan:', error);
    res.status(500).json({ error: 'Error starting Bluetooth scan' });
  }
});

// Stop scanning
router.post('/scan/stop', async (req, res) => {
  try {
    if (isScanning) {
      noble.stopScanning();
    }
    
    res.json({ 
      success: true, 
      message: 'Scanning stopped'
    });
  } catch (error) {
    console.error('Error stopping Bluetooth scan:', error);
    res.status(500).json({ error: 'Error stopping Bluetooth scan' });
  }
});

// Get available devices (discovered by scan)
router.get('/available', async (req, res) => {
  try {
    // Filter out old devices (older than 30 seconds)
    const now = Date.now();
    const devices = Array.from(discoveredDevices.values())
      .filter(device => (now - device.lastSeen) < 30000)
      .map(entry => ({
        id: entry.id,
        mac: entry.mac,
        name: entry.name,
        rssi: entry.rssi
      }));
    
    res.json({ devices });
  } catch (error) {
    console.error('Error getting available devices:', error);
    res.status(500).json({ error: 'Error getting available devices' });
  }
});

// Connect to a device
router.post('/connect', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    
    // Check if already connected
    if (connectedDevices.has(id)) {
      return res.json({ 
        success: true, 
        message: 'Device already connected',
        device: {
          id,
          name: connectedDevices.get(id).name,
          mac: connectedDevices.get(id).mac
        }
      });
    }
    
    const device = await connectToDevice(id);
    
    res.json({ 
      success: true, 
      message: 'Device connected successfully',
      device: {
        id: device.id,
        name: device.name,
        mac: device.mac
      }
    });
  } catch (error) {
    console.error('Error connecting to device:', error);
    res.status(500).json({ error: `Error connecting to device: ${error.message}` });
  }
});

// Disconnect from a device
router.post('/disconnect', async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    
    const device = await disconnectDevice(id);
    
    res.json({ 
      success: true, 
      message: 'Device disconnected successfully',
      device: {
        id: device.id,
        name: device.name,
        mac: device.mac
      }
    });
  } catch (error) {
    console.error('Error disconnecting from device:', error);
    res.status(500).json({ error: `Error disconnecting from device: ${error.message}` });
  }
});

// Remove a paired device
router.delete('/paired/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!id) {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    
    // Disconnect if connected
    if (connectedDevices.has(id)) {
      await disconnectDevice(id);
    }
    
    // Remove from paired devices
    const pairedDevices = loadPairedDevices();
    const updatedDevices = pairedDevices.filter(device => device.id !== id);
    savePairedDevices(updatedDevices);
    
    res.json({ 
      success: true, 
      message: 'Device removed successfully'
    });
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({ error: 'Error removing device' });
  }
});

// Toggle Bluetooth
router.post('/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (enabled === undefined) {
      return res.status(400).json({ error: 'Enabled status is required' });
    }
    
    if (enabled) {
      // Use system command to enable Bluetooth
      await execAsync('sudo rfkill unblock bluetooth');
      await execAsync('sudo service bluetooth restart');
      
      // Wait for Noble to update state
      setTimeout(() => {
        res.json({ 
          success: true, 
          enabled: true,
          state: nobleState
        });
      }, 2000);
    } else {
      // Stop scanning first
      if (isScanning) {
        noble.stopScanning();
      }
      
      // Disconnect all devices
      for (const [id, device] of connectedDevices.entries()) {
        try {
          device.peripheral.disconnect();
        } catch (e) {
          console.error(`Error disconnecting device ${id}:`, e);
        }
      }
      
      // Use system command to disable Bluetooth
      await execAsync('sudo rfkill block bluetooth');
      
      res.json({ 
        success: true, 
        enabled: false,
        state: 'poweredOff'
      });
    }
  } catch (error) {
    console.error('Error toggling Bluetooth:', error);
    res.status(500).json({ error: 'Error toggling Bluetooth' });
  }
});

// Socket.io integration
if (global.io) {
  global.io.on('connection', (socket) => {
    socket.on('bluetooth:scan', () => {
      if (!isScanning && nobleState === 'poweredOn') {
        startScan();
        socket.emit('bluetooth:scanning');
      } else {
        socket.emit('bluetooth:error', { message: 'Cannot start scan, already scanning or Bluetooth not ready' });
      }
    });
    
    socket.on('bluetooth:scan_stop', () => {
      if (isScanning) {
        noble.stopScanning();
      }
    });
  });
}

module.exports = router;
