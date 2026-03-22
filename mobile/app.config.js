import fs from 'node:fs';
import path from 'node:path';

const loadRootEnv = () => {
  const rootEnvPath = path.resolve(__dirname, '../.env');

  if (!fs.existsSync(rootEnvPath)) {
    return;
  }

  const content = fs.readFileSync(rootEnvPath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      return;
    }

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const quoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));
    process.env[key] = quoted ? rawValue.slice(1, -1) : rawValue;
  });
};

loadRootEnv();

export default ({ config }) => {
  const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
  const androidGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const iosGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const explicitOrigin =
    process.env.EXPO_ROUTER_ORIGIN || process.env.EXPO_PUBLIC_WEB_ORIGIN;
  const derivedWorkstationOrigin = process.env.WEB_HOST
    ? `https://8081-${process.env.WEB_HOST}`
    : null;
  const existingOrigin =
    typeof config.extra?.router?.origin === 'string'
      ? config.extra.router.origin
      : null;
  const resolvedOrigin = explicitOrigin || existingOrigin || derivedWorkstationOrigin;
  const router = {
    ...(config.extra?.router ?? {}),
  };

  // Expo CLI CORS allows non-local origins only when listed in extra.router origin fields.
  if (resolvedOrigin && router.origin !== false) {
    router.origin = resolvedOrigin;
    if (!router.headOrigin) {
      router.headOrigin = resolvedOrigin;
    }
  }

  const iosConfig = {
    ...(config.ios?.config ?? {}),
    ...(iosGoogleMapsApiKey
      ? { googleMapsApiKey: iosGoogleMapsApiKey }
      : null),
  };
  const androidConfig = {
    ...(config.android?.config ?? {}),
    ...(androidGoogleMapsApiKey
      ? {
          googleMaps: {
            ...(config.android?.config?.googleMaps ?? {}),
            apiKey: androidGoogleMapsApiKey,
          },
        }
      : null),
  };

  return {
    ...config,
    name: IS_PREVIEW ? 'WizyClub Preview' : 'WizyClub',
    slug: 'wizyclup',
    ios: {
      ...config.ios,
      bundleIdentifier: IS_PREVIEW
        ? 'com.anonymous.wizyclup.preview'
        : 'com.anonymous.wizyclup',
      ...(Object.keys(iosConfig).length > 0 ? { config: iosConfig } : null),
    },
    android: {
      ...config.android,
      package: IS_PREVIEW
        ? 'com.anonymous.wizyclup.preview'
        : 'com.anonymous.wizyclup',
      ...(Object.keys(androidConfig).length > 0 ? { config: androidConfig } : null),
    },
    extra: {
      ...(config.extra ?? {}),
      router,
      eas: {
        projectId: 'cc070815-db84-4ade-b391-ffb8cb06743d',
      },
    },
  };
};
