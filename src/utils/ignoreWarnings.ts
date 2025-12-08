import { LogBox } from 'react-native';

if (__DEV__) {
    const ignoreWarns = [
        'SafeAreaView has been deprecated',
        'Reduced motion setting is enabled',
        'deprecated',
        'topSvgLayout',
    ];

    const originalWarn = console.warn;
    console.warn = (...args) => {
        const log = args.join(' ');
        if (ignoreWarns.some((ignored) => log.includes(ignored))) {
            return;
        }
        originalWarn(...args);
    };

    const ignoreErrors = ['topSvgLayout'];
    const originalError = console.error;
    console.error = (...args) => {
        const log = args.join(' ');
        if (ignoreErrors.some((ignored) => log.includes(ignored))) {
            return;
        }
        originalError(...args);
    };

    LogBox.ignoreLogs(ignoreWarns);
}
