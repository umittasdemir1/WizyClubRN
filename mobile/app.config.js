export default ({ config }) => {
    const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

    return {
        ...config,
        name: IS_PREVIEW ? 'WizyClub (Prev)' : 'WizyClub',
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
            ...config.extra,
            eas: {
                projectId: 'cc070815-db84-4ade-b391-ffb8cb06743d',
            },
        },
    };
};
