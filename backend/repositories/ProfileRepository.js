function createProfileRepository(dbClient) {
    return {
        async updateAvatarUrl(userId, avatarUrl) {
            const { error } = await dbClient
                .from('profiles')
                .update({ avatar_url: avatarUrl })
                .eq('id', userId);

            if (error) throw error;
        },
    };
}

module.exports = {
    createProfileRepository,
};
