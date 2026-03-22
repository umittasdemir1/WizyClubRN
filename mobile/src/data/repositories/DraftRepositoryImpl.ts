import { IDraftRepository } from '../../domain/repositories/IDraftRepository';
import { Draft } from '../../domain/entities/Draft';
import { SupabaseDraftDataSource } from '../datasources/SupabaseDraftDataSource';

export class DraftRepositoryImpl implements IDraftRepository {
  private dataSource: SupabaseDraftDataSource;

  constructor() {
    this.dataSource = new SupabaseDraftDataSource();
  }

  async getDrafts(userId: string, page = 1, limit = 50): Promise<Draft[]> {
    return this.dataSource.getDrafts(userId, page, limit);
  }

  async getDraftById(draftId: string): Promise<Draft | null> {
    return this.dataSource.getDraftById(draftId);
  }

  async createDraft(
    draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>
  ): Promise<Draft> {
    return this.dataSource.createDraft(draft);
  }

  async updateDraft(draftId: string, updates: Partial<Draft>): Promise<Draft> {
    return this.dataSource.updateDraft(draftId, updates);
  }

  async deleteDraft(draftId: string): Promise<boolean> {
    return this.dataSource.deleteDraft(draftId);
  }

  async deleteDrafts(draftIds: string[]): Promise<boolean> {
    return this.dataSource.deleteDrafts(draftIds);
  }

  async cleanupExpiredDrafts(): Promise<number> {
    return this.dataSource.cleanupExpiredDrafts();
  }
}
