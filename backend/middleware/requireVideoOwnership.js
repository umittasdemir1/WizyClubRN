const { createHttpError } = require('../utils/httpError');

function createRequireVideoOwnership(supabase, options = {}) {
    const {
        select = 'id, user_id',
        notFoundMessage = 'Video not found',
        forbiddenMessage = 'Forbidden',
    } = options;

    return async function requireVideoOwnership(req, res, next) {
        try {
            const videoId = req.params.id;
            const client = req.dbClient || supabase;
            const resolvedSelect = typeof select === 'function' ? select(req) : select;
            const selectClause = typeof resolvedSelect === 'string' && resolvedSelect.trim()
                ? resolvedSelect
                : 'id, user_id';
            const { data: video, error } = await client
                .from('videos')
                .select(selectClause)
                .eq('id', videoId)
                .single();

            if (error || !video) {
                throw createHttpError(404, notFoundMessage);
            }

            if (video.user_id !== req.user?.id) {
                throw createHttpError(403, forbiddenMessage);
            }

            req.video = video;
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    createRequireVideoOwnership,
};
