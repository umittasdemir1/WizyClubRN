const { createInfrastructure } = require('./createInfrastructure');
const { createRoutes } = require('./createRoutes');
const { createUseCases } = require('./createUseCases');

function createServerContext({ envConfig, ffmpeg, logLine, logBanner, tempOutputDir }) {
    const infrastructure = createInfrastructure({
        envConfig,
        ffmpeg,
        logLine,
    });

    const useCases = createUseCases({
        envConfig,
        infrastructure,
        logLine,
        logBanner,
        tempOutputDir,
    });

    return {
        routes: createRoutes({
            infrastructure,
            useCases,
            logLine,
        }),
        schedulers: infrastructure.schedulers,
    };
}

module.exports = {
    createServerContext,
};
