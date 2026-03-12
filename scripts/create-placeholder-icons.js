#!/usr/bin/env node
// Generates a minimal placeholder icon for the app
// Replace assets/icon.png with your real 512x512 icon
// Replace assets/tray-icon.png with a 16x16 or 32x32 version

const fs = require('fs');
const path = require('path');

// Minimal 1x1 blue PNG (placeholder only)
// Real icons should be created with a design tool
const placeholder = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABiSURBVDiNY/z//z8DJYCJgUIwasCoAaMGjBow8g1gIKaigoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCggDwD2tNsBzEUgAAAABJRU5ErkJggg==',
  'base64'
);

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);

fs.writeFileSync(path.join(assetsDir, 'icon.png'), placeholder);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), placeholder);

console.log('Placeholder icons created. Replace with real icons before building.');
