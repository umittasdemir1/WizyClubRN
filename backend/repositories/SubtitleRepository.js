const { createHttpError } = require('../utils/httpError');
const { parseStoredSubtitlePayload } = require('../utils/subtitleParser');

function createSubtitleRepository(supabase) {
    async function findLatestSubtitleStatus(videoId, language = 'auto') {
        const { data, error } = await supabase
            .from('subtitles')
            .select('status, updated_at')
            .eq('video_id', videoId)
            .eq('language', language)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    }

    async function applySubtitleMutationForVideo(videoId, mutation) {
        if (!mutation?.operation) {
            return { success: true, operation: null };
        }

        if (mutation.operation === 'delete') {
            let existingRowsQuery = supabase
                .from('subtitles')
                .select('id')
                .eq('video_id', videoId);

            if (mutation.subtitleId) {
                existingRowsQuery = existingRowsQuery.eq('id', mutation.subtitleId);
            } else if (mutation.language) {
                existingRowsQuery = existingRowsQuery.eq('language', mutation.language);
            }

            const { data: existingRows, error: existingRowsError } = await existingRowsQuery;
            if (existingRowsError) throw existingRowsError;

            const subtitleIds = (existingRows || [])
                .map((row) => row?.id)
                .filter((id) => typeof id === 'string' && id.trim().length > 0);

            if (subtitleIds.length === 0) {
                return { success: true, operation: 'delete', deletedCount: 0 };
            }

            const { error: deleteError } = await supabase
                .from('subtitles')
                .delete()
                .in('id', subtitleIds);

            if (deleteError) throw deleteError;

            return { success: true, operation: 'delete', deletedCount: subtitleIds.length };
        }

        let rowQuery = supabase
            .from('subtitles')
            .select('id, video_id, segments')
            .limit(1)
            .maybeSingle();

        if (mutation.subtitleId) {
            rowQuery = rowQuery.eq('id', mutation.subtitleId).eq('video_id', videoId);
        } else {
            rowQuery = rowQuery.eq('video_id', videoId).eq('language', mutation.language);
        }

        const { data: existingRow, error: existingRowError } = await rowQuery;
        if (existingRowError) throw existingRowError;

        if (!existingRow) {
            throw createHttpError(404, 'Subtitle row not found to update');
        }

        const existingPayload = parseStoredSubtitlePayload(existingRow.segments);
        const nextPresentation = mutation.presentation || existingPayload.presentation;
        const nextStyle = mutation.style || existingPayload.style;
        const shouldUseEnvelope = existingPayload.isEnvelope || !!nextPresentation || !!nextStyle;
        const segmentsToStore = shouldUseEnvelope
            ? {
                segments: mutation.segments,
                presentation: nextPresentation,
                style: nextStyle,
                source: existingPayload.source || 'manual_edit',
            }
            : mutation.segments;

        let updateQuery = supabase
            .from('subtitles')
            .update({
                segments: segmentsToStore,
                status: 'completed',
                error_message: null,
                updated_at: new Date().toISOString(),
            });

        if (mutation.subtitleId) {
            updateQuery = updateQuery.eq('id', mutation.subtitleId).eq('video_id', videoId);
        } else {
            updateQuery = updateQuery.eq('video_id', videoId).eq('language', mutation.language);
        }

        const { data, error } = await updateQuery.select().limit(1).maybeSingle();
        if (error) throw error;

        if (!data) {
            throw createHttpError(404, 'Subtitle row not found to update');
        }

        return { success: true, operation: 'update', data };
    }

    return {
        findLatestSubtitleStatus,
        applySubtitleMutationForVideo,
    };
}

module.exports = {
    createSubtitleRepository,
};
