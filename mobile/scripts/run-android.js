const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const expoGoAppId = 'host.exp.exponent';
const DEFAULT_API_PORT = 8080;
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;

function resolveAndroidSdkRoot() {
  const sdkRoot = process.env.ANDROID_HOME
    || process.env.ANDROID_SDK_ROOT
    || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null);

  if (!sdkRoot || !fs.existsSync(sdkRoot)) {
    throw new Error(
      'Android SDK was not found. Set ANDROID_HOME or install the SDK in %LOCALAPPDATA%\\Android\\Sdk.',
    );
  }

  return sdkRoot;
}

function buildAndroidEnv() {
  const sdkRoot = resolveAndroidSdkRoot();
  const env = { ...process.env };
  const androidUserHome = env.ANDROID_USER_HOME || path.join(projectRoot, '.android');
  const pathEntries = [
    path.join(sdkRoot, 'platform-tools'),
    path.join(sdkRoot, 'emulator'),
    env.Path || env.PATH || '',
  ].filter(Boolean);

  env.ANDROID_HOME = sdkRoot;
  env.ANDROID_SDK_ROOT = sdkRoot;
  env.ANDROID_USER_HOME = androidUserHome;
  env.HOME = projectRoot;
  env.Path = pathEntries.join(path.delimiter);
  env.PATH = env.Path;

  if (!fs.existsSync(env.ANDROID_USER_HOME)) {
    fs.mkdirSync(env.ANDROID_USER_HOME, { recursive: true });
  }

  return env;
}

function resolveSdkVersion() {
  const expoPackage = require(path.join(projectRoot, 'node_modules', 'expo', 'package.json'));
  const [major] = String(expoPackage.version).split('.');
  return `${major}.0.0`;
}

function applyAndroidEnv(env) {
  process.env.ANDROID_HOME = env.ANDROID_HOME;
  process.env.ANDROID_SDK_ROOT = env.ANDROID_SDK_ROOT;
  process.env.ANDROID_USER_HOME = env.ANDROID_USER_HOME;
  process.env.HOME = env.HOME;
  process.env.Path = env.Path;
  process.env.PATH = env.PATH;
}

function loadExpoCliModule(...parts) {
  return require(path.join(
    projectRoot,
    'node_modules',
    'expo',
    'node_modules',
    '@expo',
    'cli',
    'build',
    'src',
    ...parts,
  ));
}

async function resolvePreferredDevice() {
  const { getAttachedDevicesAsync } = loadExpoCliModule('start', 'platforms', 'android', 'adb.js');
  const { AndroidDeviceManager } = loadExpoCliModule('start', 'platforms', 'android', 'AndroidDeviceManager.js');
  const devices = await getAttachedDevicesAsync();

  if (!devices.length) {
    throw new Error('No Android devices or emulators are connected.');
  }

  const preferredDevice =
    devices.find((device) => device.type === 'emulator' && device.isAuthorized) ?? devices[0];

  return AndroidDeviceManager.resolveAsync({ device: preferredDevice, shouldPrompt: false });
}

async function ensureExpoGoForAndroid(deviceManager) {
  const { ExpoGoInstaller } = loadExpoCliModule('start', 'platforms', 'ExpoGoInstaller.js');
  const { downloadExpoGoAsync } = loadExpoCliModule('utils', 'downloadExpoGoAsync.js');
  const sdkVersion = resolveSdkVersion();
  const installer = new ExpoGoInstaller('android', expoGoAppId, sdkVersion);
  const expectedVersion = await installer.getExpectedExpoGoClientVersionAsync();
  const installedVersion = await deviceManager.getAppVersionAsync(expoGoAppId);

  if (!installer.isInstalledClientVersionMismatched(installedVersion, expectedVersion)) {
    return;
  }

  console.log(`Updating Expo Go on ${deviceManager.name} to ${expectedVersion ?? sdkVersion}...`);

  if (installedVersion) {
    await deviceManager.uninstallAppAsync(expoGoAppId);
  }

  const binaryPath = await downloadExpoGoAsync('android', { sdkVersion });
  await deviceManager.installAppAsync(binaryPath);
}

async function openProjectOnDevice(deviceManager, port) {
  const { startAdbReverseAsync } = loadExpoCliModule('start', 'platforms', 'android', 'adbReverse.js');
  const localApiPort = resolveLocalApiPort();
  const portsToReverse = [...new Set([port, localApiPort].filter(Boolean))];

  await startAdbReverseAsync(portsToReverse);
  await deviceManager.openUrlAsync(`exp://127.0.0.1:${port}`);
}

function resolveLocalApiPort() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!apiUrl) {
    return DEFAULT_API_PORT;
  }

  try {
    const { hostname, port, protocol } = new URL(apiUrl);
    if (!/^https?:$/i.test(protocol) || !LOCAL_HOST_PATTERN.test(hostname)) {
      return null;
    }

    if (port) {
      return Number(port);
    }

    return protocol === 'https:' ? 443 : 80;
  } catch {
    return DEFAULT_API_PORT;
  }
}

async function main() {
  const env = buildAndroidEnv();
  applyAndroidEnv(env);

  const deviceManager = await resolvePreferredDevice();
  await ensureExpoGoForAndroid(deviceManager);

  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(command, ['expo', 'start', '--localhost'], {
    cwd: projectRoot,
    env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  let opened = false;
  const handleOutput = async (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    if (opened) {
      return;
    }

    const match = text.match(/Waiting on http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
    if (!match) {
      return;
    }

    opened = true;
    const port = Number(match[1]);

    try {
      await openProjectOnDevice(deviceManager, port);
      console.log(`Opened Expo Go on ${deviceManager.name}.`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      child.kill();
      process.exit(1);
    }
  };

  child.stdout.on('data', (chunk) => {
    void handleOutput(chunk);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
