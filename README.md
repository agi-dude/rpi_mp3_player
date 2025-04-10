# Raspberry Pi MP3 Player

A feature-rich web-based MP3 player designed specifically for Raspberry Pi with a 3.5" touch screen display. This player supports both AUX output and Bluetooth connections, providing a versatile audio solution for your Raspberry Pi.

![MP3 Player Screenshot](https://via.placeholder.com/400x320 "MP3 Player Interface")

## Features

- **Music Playback**
    - Play/pause, skip tracks, volume control
    - Adjustable playback speed
    - Forward/backward 10 seconds buttons
    - Interactive seek bar for precise navigation

- **Playlist Management**
    - Create and manage multiple playlists
    - Add tracks from the file browser
    - Batch add tracks by scanning directories
    - Shuffle and loop modes

- **File Browser**
    - Browse file system to find music
    - Automatic scanning for MP3 files
    - Support for multiple storage locations

- **Bluetooth Support**
    - Scan for devices
    - Pair and connect to Bluetooth speakers/headphones
    - Manage connected devices

- **Touch-Optimized UI**
    - Large buttons for easy touch interaction
    - Simple, intuitive interface designed for small screens
    - Virtual keyboard for text input

- **Audio Visualization**
    - Three visualization modes: bars, wave, and circle
    - Responsive to audio frequency changes
    - Customizable appearance

## Prerequisites

- Raspberry Pi (Any model, Pi 3 or newer recommended)
- 3.5" touch screen display
- Speakers or headphones (via AUX output)
- Bluetooth capabilities (built-in or USB dongle)
- Node.js installed on your Raspberry Pi

## Installation

### 1. Install Node.js (if not already installed)

```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Clone or download the project

```bash
git clone https://github.com/yourusername/pi-mp3-player.git
cd pi-mp3-player
```

Alternatively, download and extract the project files maintaining the folder structure.

### 3. Install dependencies

```bash
npm install
```

### 4. Create necessary directories

```bash
mkdir -p data music
```

### 5. Configure Raspberry Pi for kiosk mode

Edit your autostart configuration:

```bash
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
```

Add these lines:

```
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --kiosk --app=http://localhost:3000 --start-fullscreen
```

### 6. Configure audio output

For AUX output, make sure your Raspberry Pi's audio is set to the headphone jack:

```bash
sudo raspi-config
```

Navigate to System Options → Audio → Force 3.5mm ('headphone') jack

### 7. Configure Bluetooth

Make sure Bluetooth is enabled:

```bash
sudo bluetoothctl
power on
agent on
default-agent
quit
```

### 8. Start the application

```bash
npm start
```

### 9. Make the application start on boot

Add the startup command to crontab:

```bash
crontab -e
```

Add this line (replace with your actual path):

```
@reboot cd /home/pi/pi-mp3-player && npm start
```

## Project Structure

```
pi-mp3-player/
├── package.json
├── server.js
├── routes/
│   ├── files.js
│   ├── playlists.js
│   └── bluetooth.js
├── public/
│   ├── css/
│   │   ├── styles.css
│   │   ├── keyboard.css
│   │   └── visualizer.css
│   ├── js/
│   │   ├── player.js
│   │   ├── fileBrowser.js
│   │   ├── playlist.js
│   │   ├── bluetooth.js
│   │   ├── keyboard.js
│   │   └── visualizer.js
│   ├── img/
│   │   ├── icons/
│   │   └── backgrounds/
│   └── index.html
└── data/
    └── playlists.json
```

## Using the MP3 Player

### Navigation

- Use the bottom navigation bar to switch between views:
    - **Now Playing**: Shows the current track and playback controls
    - **Browse**: File browser to find and play music
    - **Playlists**: Manage and play your playlists

### Playing Music

1. Navigate to the Browse tab
2. Browse to a directory containing MP3 files
3. Tap on an MP3 file to play it
4. Use the controls to adjust volume, speed, and playback position

### Creating Playlists

1. Navigate to the Playlists tab
2. Tap "New Playlist"
3. Enter a name using the on-screen keyboard
4. Add tracks from the file browser or by scanning directories

### Connecting Bluetooth Devices

1. Tap the Bluetooth icon in the header
2. Toggle Bluetooth on
3. Tap "Scan for Devices"
4. Tap "Connect" next to the device you want to connect to

### Changing Settings

1. Tap the settings icon in the header
2. Adjust theme and visualization settings

## Troubleshooting

### Audio Issues

- If you have no sound from the headphone jack:
  ```bash
  amixer controls
  amixer sset 'PCM' 90%
  ```

- To switch between HDMI and headphone jack:
  ```bash
  sudo raspi-config
  ```
  Navigate to System Options → Audio

### Bluetooth Issues

- If Bluetooth scanning doesn't work:
  ```bash
  sudo systemctl restart bluetooth
  ```

- Check if Bluetooth is properly enabled:
  ```bash
  sudo systemctl status bluetooth
  ```

- To manually pair a difficult device:
  ```bash
  sudo bluetoothctl
  scan on
  # Wait for device to appear
  pair [MAC_ADDRESS]
  connect [MAC_ADDRESS]
  ```

### Touch Screen Issues

- If the touch screen isn't calibrated properly:
  ```bash
  sudo apt-get install -y xinput-calibrator
  DISPLAY=:0 xinput_calibrator
  ```

- If the touch screen isn't responding:
  ```bash
  sudo dpkg-reconfigure xserver-xorg-input-evdev
  ```

### Application Doesn't Start on Boot

- Check crontab is properly set:
  ```bash
  crontab -l
  ```

- Check application logs:
  ```bash
  journalctl -u cron
  ```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [music-metadata](https://github.com/borewit/music-metadata)