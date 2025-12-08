module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            [
                "module-resolver",
                {
                    root: ["."],
                    alias: {
                        "@": "./src",
                        "@core": "./src/core",
                        "@domain": "./src/domain",
                        "@data": "./src/data",
                        "@presentation": "./src/presentation",
                        "@assets": "./assets",
                    },
                },
            ],
            "react-native-reanimated/plugin",
        ],
    };
};
