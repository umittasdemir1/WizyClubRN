const { toVideoRecord } = require('../mappers/videoMapper');

function createVideoRepository(dbClient) {
    return {
        async createVideo(payload) {
            const { data, error } = await dbClient
                .from('videos')
                .insert(payload)
                .select();

            if (error) throw error;
            return Array.isArray(data) ? toVideoRecord(data[0]) : null;
        },

        async listVideosForMigration() {
            const { data, error } = await dbClient
                .from('videos')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return Array.isArray(data) ? data.map(toVideoRecord) : [];
        },

        async updateMigratedAssetUrls(videoId, payload) {
            const { error } = await dbClient
                .from('videos')
                .update(payload)
                .eq('id', videoId);

            if (error) throw error;
        },

        async editVideoAtomic(rpcArgs) {
            const { data, error } = await dbClient.rpc('edit_video_atomic', rpcArgs);
            if (error) throw error;
            return data;
        },

        async upsertSubtitleFromUpload(payload) {
            const { error } = await dbClient
                .from('subtitles')
                .upsert(payload, { onConflict: 'video_id,language' });

            if (error) throw error;
        },

        async upsertHashtagsForVideo(videoId, tags) {
            if (!videoId || !Array.isArray(tags) || tags.length === 0) {
                return { linkedCount: 0 };
            }

            const { error: hashtagUpsertError } = await dbClient
                .from('hashtags')
                .upsert(
                    tags.map((name) => ({ name })),
                    { onConflict: 'name', ignoreDuplicates: true }
                );

            if (hashtagUpsertError) throw hashtagUpsertError;

            const { data: allHashtags, error: hashtagFetchError } = await dbClient
                .from('hashtags')
                .select('id, name')
                .in('name', tags);

            if (hashtagFetchError) throw hashtagFetchError;

            if (!allHashtags || allHashtags.length === 0) {
                return { linkedCount: 0 };
            }

            const videoHashtagInserts = allHashtags.map((hashtag) => ({
                video_id: videoId,
                hashtag_id: hashtag.id,
            }));
            const { error: linkError } = await dbClient
                .from('video_hashtags')
                .upsert(videoHashtagInserts, { onConflict: 'video_id,hashtag_id', ignoreDuplicates: true });

            if (linkError) throw linkError;

            return { linkedCount: videoHashtagInserts.length };
        },

        async addVideoTags(videoId, taggedPeople) {
            if (!videoId || !Array.isArray(taggedPeople) || taggedPeople.length === 0) {
                return;
            }

            const tagInserts = taggedPeople.map((taggedUserId) => ({
                video_id: videoId,
                tagged_user_id: taggedUserId,
            }));
            const { error } = await dbClient.from('post_tags').insert(tagInserts);
            if (error) throw error;
        },

        async deleteVideoById(videoId) {
            const { data, error } = await dbClient
                .from('videos')
                .delete()
                .eq('id', videoId)
                .select('id');

            if (error) throw error;
            return Array.isArray(data) ? data : [];
        },

        async softDeleteVideo(videoId) {
            const { error } = await dbClient.rpc('soft_delete_video', { video_id: videoId });
            if (error) throw error;
        },

        async restoreVideo(videoId) {
            const { error } = await dbClient.rpc('restore_video', { video_id: videoId });
            if (error) throw error;
        },
    };
}

module.exports = {
    createVideoRepository,
};
