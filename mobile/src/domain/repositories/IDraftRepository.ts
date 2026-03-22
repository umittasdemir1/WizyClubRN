import { Draft } from '../entities/Draft';

export interface IDraftRepository {
  getDrafts(userId: string, page?: number, limit?: number): Promise<Draft[]>;
  getDraftById(draftId: string): Promise<Draft | null>;
  createDraft(
    draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>
  ): Promise<Draft>;
  updateDraft(draftId: string, updates: Partial<Draft>): Promise<Draft>;
  deleteDraft(draftId: string): Promise<boolean>;
  deleteDrafts(draftIds: string[]): Promise<boolean>;
  cleanupExpiredDrafts(): Promise<number>;
}
