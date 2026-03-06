const { toStoryRecord } = require('../mappers/storyMapper');

function createStoryRepository(dbClient) {
    return {
        async createStory(payload) {
            const { data, error } = await dbClient
                .from('stories')
                .insert(payload)
                .select();

            if (error) throw error;
            return Array.isArray(data) ? toStoryRecord(data[0]) : null;
        },

        async listStoriesForMigration() {
            const { data, error } = await dbClient.from('stories').select('*');
            if (error) throw error;
            return Array.isArray(data) ? data.map(toStoryRecord) : [];
        },

        async findStoryById(storyId, options = {}) {
            const { select = 'id, user_id, video_url, thumbnail_url, media_urls' } = options;
            const query = dbClient
                .from('stories')
                .select(select)
                .eq('id', storyId);

            if (options.onlyDeleted) {
                query.not('deleted_at', 'is', null);
            }

            const { data, error } = await query.single();
            if (error) throw error;
            return toStoryRecord(data || null);
        },

        async hardDeleteStory(storyId, userId) {
            let query = dbClient
                .from('stories')
                .delete()
                .eq('id', storyId);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query.select('id');
            if (error) throw error;
            return Array.isArray(data) ? data : [];
        },

        async softDeleteStory(storyId, userId, deletedAt) {
            let query = dbClient
                .from('stories')
                .update({ deleted_at: deletedAt })
                .eq('id', storyId);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query.select('id');
            if (error) throw error;
            return Array.isArray(data) ? data : [];
        },

        async restoreStory(storyId, userId) {
            let query = dbClient
                .from('stories')
                .update({ deleted_at: null })
                .eq('id', storyId);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { error } = await query;
            if (error) throw error;
        },

        async listRecentlyDeletedStories(userId, cutoff) {
            const { data, error } = await dbClient
                .from('stories')
                .select('id, user_id, video_url, thumbnail_url, media_urls, post_type, deleted_at, created_at, expires_at')
                .eq('user_id', userId)
                .not('deleted_at', 'is', null)
                .gt('deleted_at', cutoff)
                .order('deleted_at', { ascending: false });

            if (error) throw error;
            return Array.isArray(data) ? data.map(toStoryRecord) : [];
        },

        async updateMigratedAssetUrls(storyId, payload) {
            const { error } = await dbClient
                .from('stories')
                .update(payload)
                .eq('id', storyId);

            if (error) throw error;
        },

        async addStoryTags(storyId, taggedPeople) {
            if (!storyId || !Array.isArray(taggedPeople) || taggedPeople.length === 0) {
                return;
            }

            const tagInserts = taggedPeople.map((taggedUserId) => ({
                story_id: storyId,
                tagged_user_id: taggedUserId,
            }));
            const { error } = await dbClient.from('post_tags').insert(tagInserts);
            if (error) throw error;
        },
    };
}

module.exports = {
    createStoryRepository,
};
