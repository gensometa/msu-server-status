#!/usr/bin/env node
/**
 * MSU Game Server Probe Script
 *
 * This script probes MapleStory Universe game servers and outputs
 * the status to server-status.json for GitHub Pages hosting.
 *
 * Usage:
 *   node probe-servers.mjs
 *
 * Setup on VPS:
 *   1. Clone this repo
 *   2. Set up SSH key for GitHub push
 *   3. Add to crontab: * * * * * /path/to/run-probe.sh
 */

import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROBE_TIMEOUT = 5000; // 5 seconds

// Server configurations from packet captures
const SERVERS = {
  ain: {
    name: 'Ain',
    icon: '🌟',
    loginServer: { ip: '54.64.142.213', port: 8484 },
    channels: {
      1: { ip: '18.176.79.10', port: 8585 },
      2: { ip: '3.112.119.155', port: 8585 },
      3: { ip: '52.197.194.155', port: 8585 },
      4: { ip: '35.79.26.6', port: 8585 },
      5: { ip: '54.64.47.212', port: 8585 },
      6: { ip: '54.64.47.212', port: 8586 },
      7: { ip: '35.75.33.109', port: 8585 },
      8: { ip: '35.75.33.109', port: 8586 },
      9: { ip: '57.181.203.81', port: 8585 },
      10: { ip: '57.181.203.81', port: 8586 },
      11: { ip: '54.65.159.42', port: 8585 },
      12: { ip: '54.65.159.42', port: 8586 },
      13: { ip: '18.177.179.145', port: 8585 },
      14: { ip: '18.177.179.145', port: 8586 },
      15: { ip: '13.115.72.186', port: 8585 },
      16: { ip: '13.115.72.186', port: 8586 },
      17: { ip: '13.114.24.162', port: 8585 },
      18: { ip: '13.114.24.162', port: 8586 },
      19: { ip: '57.182.28.187', port: 8585 },
      20: { ip: '57.182.28.187', port: 8586 },
    },
  },
  errai: {
    name: 'Errai',
    icon: '🔥',
    loginServer: { ip: '54.64.142.213', port: 8484 },
    channels: {
      1: { ip: '54.64.231.217', port: 8585 },
      2: { ip: '52.197.35.160', port: 8585 },
      3: { ip: '13.115.216.155', port: 8585 },
      4: { ip: '52.199.94.94', port: 8585 },
      5: { ip: '13.113.142.231', port: 8585 },
      6: { ip: '13.113.142.231', port: 8586 },
      7: { ip: '54.238.86.190', port: 8585 },
      8: { ip: '54.238.86.190', port: 8586 },
      9: { ip: '3.112.158.137', port: 8585 },
      10: { ip: '3.112.158.137', port: 8586 },
      11: { ip: '13.113.22.58', port: 8585 },
      12: { ip: '13.113.22.58', port: 8586 },
      13: { ip: '52.192.76.205', port: 8585 },
      14: { ip: '52.192.76.205', port: 8586 },
      15: { ip: '3.115.75.51', port: 8585 },
      16: { ip: '3.115.75.51', port: 8586 },
      17: { ip: '18.182.137.148', port: 8585 },
      18: { ip: '18.182.137.148', port: 8586 },
      19: { ip: '35.77.174.123', port: 8585 },
      20: { ip: '35.77.174.123', port: 8586 },
    },
  },
  fang: {
    name: 'Fang',
    icon: '🐺',
    loginServer: { ip: '54.64.142.213', port: 8484 },
    channels: {
      1: { ip: '13.113.29.226', port: 8585 },
      2: { ip: '13.113.29.226', port: 8586 },
      3: { ip: '57.181.12.202', port: 8585 },
      4: { ip: '57.181.12.202', port: 8586 },
      5: { ip: '43.206.58.153', port: 8585 },
      6: { ip: '43.206.58.153', port: 8586 },
      7: { ip: '35.76.34.21', port: 8585 },
      8: { ip: '35.76.34.21', port: 8586 },
      9: { ip: '18.181.97.151', port: 8585 },
      10: { ip: '18.181.97.151', port: 8586 },
      11: { ip: '13.113.29.226', port: 8585 },
      12: { ip: '54.95.68.209', port: 8585 },
      13: { ip: '52.198.162.249', port: 8585 },
      14: { ip: '3.113.107.111', port: 8585 },
      15: { ip: '13.113.69.56', port: 8585 },
      16: { ip: '13.115.242.3', port: 8585 },
      17: { ip: '13.115.242.3', port: 8586 },
      18: { ip: '18.180.58.239', port: 8585 },
      19: { ip: '18.180.58.239', port: 8586 },
      20: { ip: '18.181.50.170', port: 8585 },
    },
  },
};

// Disabled worlds (not currently running)
const DISABLED_WORLDS = ['polaris', 'nunki', 'okab'];

/**
 * Probe a single server using TCP connection
 */
function probeServer(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, PROBE_TIMEOUT);

    socket.connect(port, ip, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * Probe all servers for a world
 */
async function probeWorld(worldId, config) {
  console.log(`Probing ${config.name}...`);

  // Probe login server
  const loginStatus = await probeServer(
    config.loginServer.ip,
    config.loginServer.port
  );
  console.log(`  Login server: ${loginStatus ? 'online' : 'offline'}`);

  // Probe all channels in parallel
  const channelPromises = Object.entries(config.channels).map(
    async ([channelId, server]) => {
      const status = await probeServer(server.ip, server.port);
      return {
        id: parseInt(channelId),
        status: status ? 'online' : 'offline',
      };
    }
  );

  const channels = await Promise.all(channelPromises);
  const onlineCount = channels.filter((c) => c.status === 'online').length;
  console.log(`  Channels: ${onlineCount}/${channels.length} online`);

  return {
    id: worldId,
    name: config.name,
    icon: config.icon,
    isDisabled: false,
    loginServer: {
      ip: config.loginServer.ip,
      port: config.loginServer.port,
      status: loginStatus ? 'online' : 'offline',
    },
    channels: channels.sort((a, b) => a.id - b.id),
  };
}

/**
 * Create disabled world entry
 */
function createDisabledWorld(worldId) {
  const icons = {
    polaris: '⭐',
    nunki: '🌙',
    okab: '🦅',
  };
  const names = {
    polaris: 'Polaris',
    nunki: 'Nunki',
    okab: 'Okab',
  };

  return {
    id: worldId,
    name: names[worldId],
    icon: icons[worldId],
    isDisabled: true,
    loginServer: {
      ip: '0.0.0.0',
      port: 8484,
      status: 'offline',
    },
    channels: Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      status: 'offline',
    })),
  };
}

/**
 * Main function
 */
async function main() {
  console.log('Starting server probe...');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  // Probe active worlds in parallel
  const worldPromises = Object.entries(SERVERS).map(([worldId, config]) =>
    probeWorld(worldId, config)
  );

  const activeWorlds = await Promise.all(worldPromises);

  // Add disabled worlds
  const disabledWorlds = DISABLED_WORLDS.map(createDisabledWorld);

  // Combine all worlds
  const allWorlds = [...activeWorlds, ...disabledWorlds];

  // Create result object
  const result = {
    worlds: allWorlds,
    lastChecked: new Date().toISOString(),
    probeInterval: 60, // 1 minute in seconds
  };

  // Write to current directory
  const outputPath = path.join(__dirname, 'server-status.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  console.log('');
  console.log(`Results written to ${outputPath}`);

  // Summary
  const totalOnline = activeWorlds.reduce(
    (acc, w) => acc + w.channels.filter((c) => c.status === 'online').length,
    0
  );
  const totalChannels = activeWorlds.reduce(
    (acc, w) => acc + w.channels.length,
    0
  );
  const loginOnline = activeWorlds.filter(
    (w) => w.loginServer.status === 'online'
  ).length;

  console.log('');
  console.log('=== Summary ===');
  console.log(`Login Servers: ${loginOnline}/${activeWorlds.length} online`);
  console.log(`Channels: ${totalOnline}/${totalChannels} online`);
}

main().catch(console.error);
