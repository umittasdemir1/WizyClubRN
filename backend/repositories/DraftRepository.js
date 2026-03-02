const { toDraftRecord } = require('../mappers/draftMapper');

function createDraftRepository(dbClient) {
    return {
        async listByUserId(userId) {
            const { data, error } = await dbClient
                .from('drafts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return Array.isArray(data) ? data.map(toDraftRecord) : [];
        },

        async findById(draftId) {
            const { data, error } = await dbClient
                .from('drafts')
                .select('*')
                .eq('id', draftId)
                .single();

            if (error) throw error;
            return toDraftRecord(data || null);
        },

        async createDraft(payload) {
            const { data, error } = await dbClient
                .from('drafts')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return toDraftRecord(data || null);
        },

        async updateDraft(draftId, payload) {
            const { data, error } = await dbClient
                .from('drafts')
                .update(payload)
                .eq('id', draftId)
                .select()
                .single();

            if (error) throw error;
            return toDraftRecord(data || null);
        },

        async deleteDraft(draftId) {
            const { error } = await dbClient
                .from('drafts')
                .delete()
                .eq('id', draftId);

            if (error) throw error;
        },
    };
}

module.exports = {
    createDraftRepository,
};
