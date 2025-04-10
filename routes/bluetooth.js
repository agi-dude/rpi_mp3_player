const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Get all paired devices
router.get('/paired', async (req, res) => {
  try {
    const { stdout } = await execAsync('bluetoothctl paired-devices');
    const devices = parseBluetoothDevices(stdout);
    res.json({ devices });
  } catch (error) {
    console.error('Error getting paired devices:', error);
    res.status(500).json({ error: 'Error getting paired devices' });
  }
});

// Get all connected devices
router.get('/connected', async (req, res) => {
  try {
    const { stdout } = await execAsync('bluetoothctl devices');
    const allDevices = parseBluetoothDevices(stdout);
    
    // Check which devices are connected
    const connectedDevices = [];
    
    for (const device of allDevices) {
      try {
        const { stdout: info } = await execAsync(`bluetoothctl info ${device.mac}`);
        if (info.includes('Connected: yes')) {
          connectedDevices.push(device);
        }
      } catch (err) {
        console.error(`Error checking device ${device.mac}:`, err);
      }
    }
    
    res.json({ devices: connectedDevices });
  } catch (error) {
    console.error('Error getting connected devices:', error);
    res.status(500).json({ error: 'Error getting connected devices' });
  }
});

// Scan for devices
router.post('/scan', async (req, res) => {
  try {
    // Start scanning in the background
    exec('bluetoothctl --timeout 10 scan on', (error, stdout, stderr) => {
      if (error) {
        console.error('Error during Bluetooth scan:', error);
      }
    });
    
    // Return immediately with success status
    res.json({ 
      success: true, 
      message: 'Bluetooth scan started' 
    });
  } catch (error) {
    console.error('Error starting Bluetooth scan:', error);
    res.status(500).json({ error: 'Error starting Bluetooth scan' });
  }
});

// Get available devices (discovered by scan)
router.get('/available', async (req, res) => {
  try {
    const { stdout } = await execAsync('bluetoothctl devices');
    const devices = parseBluetoothDevices(stdout);
    res.json({ devices });
  } catch (error) {
    console.error('Error getting available devices:', error);
    res.status(500).json({ error: 'Error getting available devices' });
  }
});

// Get Bluetooth state
router.get('/state', async (req, res) => {
  try {
    const { stdout } = await execAsync('bluetoothctl show');
    const powered = stdout.includes('Powered: yes');
    
    res.json({ 
      enabled: powered,
      state: powered ? 'poweredOn' : 'poweredOff',
      isScanning: false // We don't track scanning state on the server
    });
  } catch (error) {
    console.error('Error checking Bluetooth state:', error);
    res.status(500).json({ error: 'Error checking Bluetooth state' });
  }
});

// Connect to a device
router.post('/connect', async (req, res) => {
  try {
    const { mac } = req.body;
    
    if (!mac) {
      return res.status(400).json({ error: 'MAC address is required' });
    }
    
    // Execute connect command
    const { stdout, stderr } = await execAsync(`bluetoothctl connect ${mac}`);
    
    if (stderr && !stderr.includes('successful')) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ 
      success: true, 
      message: 'Device connected successfully',
      mac 
    });
  } catch (error) {
    console.error('Error connecting to device:', error);
    res.status(500).json({ error: 'Error connecting to device' });
  }
});

// Disconnect from a device
router.post('/disconnect', async (req, res) => {
  try {
    const { mac } = req.body;
    
    if (!mac) {
      return res.status(400).json({ error: 'MAC address is required' });
    }
    
    // Execute disconnect command
    const { stdout, stderr } = await execAsync(`bluetoothctl disconnect ${mac}`);
    
    if (stderr && !stderr.includes('successful')) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ 
      success: true, 
      message: 'Device disconnected successfully',
      mac 
    });
  } catch (error) {
    console.error('Error disconnecting from device:', error);
    res.status(500).json({ error: 'Error disconnecting from device' });
  }
});

// Pair with a device
router.post('/pair', async (req, res) => {
  try {
    const { mac } = req.body;
    
    if (!mac) {
      return res.status(400).json({ error: 'MAC address is required' });
    }
    
    // Execute pair command
    const { stdout, stderr } = await execAsync(`bluetoothctl pair ${mac}`);
    
    res.json({ 
      success: true, 
      message: 'Pairing process initiated',
      mac 
    });
  } catch (error) {
    console.error('Error pairing with device:', error);
    res.status(500).json({ error: 'Error pairing with device' });
  }
});

// Remove a paired device - FIXED ROUTE
router.delete('/paired/:deviceId', async (req, res) => {
  try {
    const mac = req.params.deviceId;
    
    if (!mac) {
      return res.status(400).json({ error: 'MAC address is required' });
    }
    
    // Execute remove command
    const { stdout, stderr } = await execAsync(`bluetoothctl remove ${mac}`);
    
    res.json({ 
      success: true, 
      message: 'Device removed successfully',
      mac 
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
    
    // Execute the appropriate command based on the requested state
    if (enabled) {
      await execAsync('bluetoothctl power on');
    } else {
      await execAsync('bluetoothctl power off');
    }
    
    res.json({ 
      success: true, 
      enabled 
    });
  } catch (error) {
    console.error('Error toggling Bluetooth:', error);
    res.status(500).json({ error: 'Error toggling Bluetooth' });
  }
});

// Helper function to parse bluetooth device list
function parseBluetoothDevices(output) {
  const devices = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (line.trim()) {
      // Format example: "Device 00:11:22:33:44:55 Device Name"
      const match = line.match(/Device\s+([0-9A-F:]+)\s+(.*)/i);
      
      if (match && match.length === 3) {
        devices.push({
          mac: match[1],
          name: match[2] || 'Unknown Device'
        });
      }
    }
  }
  
  return devices;
}

module.exports = router;
