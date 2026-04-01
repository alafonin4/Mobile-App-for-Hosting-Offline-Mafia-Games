import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'http://localhost:8080';
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;
const ENV_PLACEHOLDER_PATTERN = /^\$\{.+\}$/;

export function resolveApiBaseUrl() {
  const configuredBaseUrl =
    readConfiguredBaseUrl(process.env.EXPO_PUBLIC_API_URL) ??
    readConfiguredBaseUrl(Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    DEFAULT_API_BASE_URL;

  return replaceLocalhostHost(configuredBaseUrl).replace(/\/+$/, '');
}

export function buildApiUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function readConfiguredBaseUrl(value: string | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue || ENV_PLACEHOLDER_PATTERN.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function replaceLocalhostHost(baseUrl: string) {
  const expoHost = extractExpoHost();
  if (!expoHost) {
    return baseUrl;
  }

  return baseUrl.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(?=[:/]|$)/i, `$1${expoHost}`);
}

function extractExpoHost() {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? null;
  if (!hostUri) {
    return null;
  }

  const normalizedHost = hostUri.replace(/^[a-z]+:\/\//i, '').split('/')[0]?.split(':')[0] ?? null;
  if (!normalizedHost || LOCAL_HOST_PATTERN.test(normalizedHost)) {
    return null;
  }

  return normalizedHost;
}
