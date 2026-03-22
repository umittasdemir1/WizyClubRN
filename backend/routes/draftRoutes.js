const express = require('express');
const CreateDraftDTO = require('../dto/CreateDraftDTO');
const ListDraftsQueryDTO = require('../dto/ListDraftsQueryDTO');
const UpdateDraftDTO = require('../dto/UpdateDraftDTO');
const { toDraftInsertPayload, toDraftUpdatePayload } = require('../mappers/draftMapper');

function createDraftRoutes({
    supabase,
    createDraftRepository,
    logLine,
    safeParseJsonArray,
    cleanupExpiredDraftsUseCase,
}) {
    const router = express.Router();
    const draftRepository = createDraftRepository(supabase);

    router.get('/drafts', async (req, res) => {
        try {
            const dto = new ListDraftsQueryDTO(req.query);
            const { userId } = dto.toQuery();
            const data = await draftRepository.listByUserId(userId);
            return res.json({ success: true, data });
        } catch (error) {
            logLine('ERR', 'DRAFTS', 'Failed to fetch drafts', { error: error?.message || error });
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to fetch drafts' });
        }
    });

    router.get('/drafts/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const data = await draftRepository.findById(id);
            return res.json({ success: true, data });
        } catch (error) {
            logLine('ERR', 'DRAFTS', 'Failed to fetch draft', { draftId: id, error: error?.message || error });
            return res.status(500).json({ error: 'Failed to fetch draft' });
        }
    });

    router.post('/drafts', async (req, res) => {
        try {
            const dto = new CreateDraftDTO(req.body);
            const body = dto.toBody();
            const parsedTags = safeParseJsonArray(body.tags, []);
            const data = await draftRepository.createDraft(toDraftInsertPayload({
                ...body,
                tags: parsedTags,
            }));
            logLine('OK', 'DRAFTS', 'Draft created', { draftId: data.id, userId: body.userId });
            return res.json({ success: true, data });
        } catch (error) {
            logLine('ERR', 'DRAFTS', 'Failed to create draft', { error: error?.message || error });
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to create draft' });
        }
    });

    router.patch('/drafts/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const dto = new UpdateDraftDTO(req.body);
            const updates = dto.toBody();
            if (updates.tags !== undefined) {
                updates.tags = safeParseJsonArray(updates.tags, []);
            }
            const data = await draftRepository.updateDraft(id, toDraftUpdatePayload(updates));
            logLine('OK', 'DRAFTS', 'Draft updated', { draftId: id });
            return res.json({ success: true, data });
        } catch (error) {
            logLine('ERR', 'DRAFTS', 'Failed to update draft', { draftId: id, error: error?.message || error });
            return res.status(error?.statusCode || 500).json({ error: error?.message || 'Failed to update draft' });
        }
    });

    router.delete('/drafts/:id', async (req, res) => {
        const { id } = req.params;

        try {
            await draftRepository.deleteDraft(id);
            logLine('OK', 'DRAFTS', 'Draft deleted', { draftId: id });
            return res.json({ success: true });
        } catch (error) {
            logLine('ERR', 'DRAFTS', 'Failed to delete draft', { draftId: id, error: error?.message || error });
            return res.status(500).json({ error: 'Failed to delete draft' });
        }
    });

    router.post('/drafts/cleanup', async (req, res) => {
        try {
            const count = await cleanupExpiredDraftsUseCase.execute();
            return res.json({ success: true, deletedCount: count });
        } catch (error) {
            logLine('ERR', 'DRAFTS', 'Manual cleanup failed', { error: error?.message || error });
            return res.status(500).json({ error: 'Failed to cleanup drafts' });
        }
    });

    return router;
}

module.exports = {
    createDraftRoutes,
};
