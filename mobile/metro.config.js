const { getDefaultConfig } = require("expo/metro-config");

module.exports = (() => {
    const config = getDefaultConfig(__dirname);

    const { transformer, resolver } = config;

    config.transformer = {
        ...transformer,
        babelTransformerPath: require.resolve("react-native-svg-transformer"),
    };
    config.resolver = {
        ...resolver,
        resolverMainFields: ["react-native", "browser", "main"],
        assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
        sourceExts: [...resolver.sourceExts, "svg", "mjs", "cjs"],
    };

    // Support for ESM imports with extensions
    config.resolver.unstable_enablePackageExports = true;

    // Custom resolver to handle ESM .js imports in node_modules
    config.resolver.resolveRequest = (context, moduleName, platform) => {
        if (moduleName.endsWith(".js") && !moduleName.startsWith("/") && !moduleName.startsWith(".")) {
            // This is for package imports that might have .js extensions internally
        }

        if (moduleName.endsWith(".js") && context.originModulePath.includes("node_modules")) {
            const nameWithoutJs = moduleName.slice(0, -3);
            try {
                return context.resolveRequest(context, nameWithoutJs, platform);
            } catch (e) { }
        }

        return context.resolveRequest(context, moduleName, platform);
    };

    return config;
})();
