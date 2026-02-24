export default ({ config }) => {
  const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
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

  return {
    ...config,
    name: IS_PREVIEW ? 'WizyClub Preview' : 'WizyClub',
    slug: 'wizyclup',
    ios: {
      ...config.ios,
      bundleIdentifier: IS_PREVIEW
        ? 'com.anonymous.wizyclup.preview'
        : 'com.anonymous.wizyclup',
    },
    android: {
      ...config.android,
      package: IS_PREVIEW
        ? 'com.anonymous.wizyclup.preview'
        : 'com.anonymous.wizyclup',
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
