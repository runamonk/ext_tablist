# Tab List

A small Manifest V3 extension for Chrome and Edge. Clicking its toolbar button lists only the tabs in the window containing that button.

## Features

- Compact favicon-and-title list
- Speaker indicator for tabs playing audio and crossed-speaker indicator for muted tabs; click it to mute or unmute
- Click a row to switch to that tab
- Middle-click a row to close that tab
- Automatically closes when the popup loses focus
- Scrollable popup capped at 80% of the viewport
- Automatic light and dark appearance based on the browser/system color preference

## Install locally

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Pin the extension from the Extensions menu if desired.

### Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.

## Theme note

Chrome and Edge do not expose installed theme colors to extension popups. The popup declares support for light and dark color schemes and follows the browser/system preference, while using native system typography and controls where appropriate.

The browser tabs API reports when a tab is currently audible or muted, but it does not expose a reliable paused-media state. Silent, paused, stopped, and finished media therefore cannot be distinguished without requesting broad access to every webpage.
