import { supabase } from '../../core/supabase';
import { Draft } from '../../domain/entities/Draft';
import { LogCode, logData, logError } from '@/core/services/Logger';

interface SupabaseDraft {
  id: string;
  user_id: string;
  media_uri: string;
  media_type: 'video' | 'image';
  thumbnail_uri?: string;
  description?: string;
  commercial_type?: string;
  brand_name?: string;
  brand_url?: string;
  tags?: string[];
  use_ai_label?: boolean;
  upload_mode: 'video' | 'story';
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export class SupabaseDraftDataSource {
  async getDrafts(userId: string, page = 1, limit = 50): Promise<Draft[]> {
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logError(LogCode.DB_QUERY_ERROR, 'Error fetching drafts', { userId, error });
      return [];
    }

    return (data as SupabaseDraft[]).map(this.mapToDraft);
  }

  async getDraftById(draftId: string): Promise<Draft | null> {
    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error || !data) {
      logError(LogCode.DB_QUERY_ERROR, 'Error fetching draft', { draftId, error });
      return null;
    }

    return this.mapToDraft(data as SupabaseDraft);
  }

  async createDraft(
    draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>
  ): Promise<Draft> {
    const { data, error } = await supabase
      .from('drafts')
      .insert({
        user_id: draft.userId,
        media_uri: draft.mediaUri,
        media_type: draft.mediaType,
        thumbnail_uri: draft.thumbnailUri,
        description: draft.description,
        commercial_type: draft.commercialType,
        brand_name: draft.brandName,
        brand_url: draft.brandUrl,
        tags: draft.tags || [],
        use_ai_label: draft.useAILabel || false,
        upload_mode: draft.uploadMode,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create draft: ${error?.message}`);
    }

    return this.mapToDraft(data as SupabaseDraft);
  }

  async updateDraft(draftId: string, updates: Partial<Draft>): Promise<Draft> {
    const dbUpdates: any = {};

    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.commercialType !== undefined)
      dbUpdates.commercial_type = updates.commercialType;
    if (updates.brandName !== undefined) dbUpdates.brand_name = updates.brandName;
    if (updates.brandUrl !== undefined) dbUpdates.brand_url = updates.brandUrl;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.useAILabel !== undefined) dbUpdates.use_ai_label = updates.useAILabel;

    const { data, error } = await supabase
      .from('drafts')
      .update(dbUpdates)
      .eq('id', draftId)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update draft: ${error?.message}`);
    }

    return this.mapToDraft(data as SupabaseDraft);
  }

  async deleteDraft(draftId: string): Promise<boolean> {
    const { error } = await supabase.from('drafts').delete().eq('id', draftId);

    if (error) {
      logError(LogCode.DRAFT_DELETE, 'Error deleting draft', { draftId, error });
      return false;
    }

    return true;
  }

  async deleteDrafts(draftIds: string[]): Promise<boolean> {
    const { error } = await supabase.from('drafts').delete().in('id', draftIds);

    if (error) {
      logError(LogCode.DRAFT_DELETE, 'Error batch deleting drafts', { draftIds, error });
      return false;
    }

    return true;
  }

  async cleanupExpiredDrafts(): Promise<number> {
    const { data, error } = await supabase
      .from('drafts')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      logError(LogCode.DRAFT_CLEANUP, 'Error cleaning up expired drafts', error);
      return 0;
    }

    return data?.length || 0;
  }

  private mapToDraft(dto: SupabaseDraft): Draft {
    const now = new Date();
    const expiresAt = new Date(dto.expires_at);
    const daysUntil = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      id: dto.id,
      userId: dto.user_id,
      mediaUri: dto.media_uri,
      mediaType: dto.media_type,
      thumbnailUri: dto.thumbnail_uri,
      description: dto.description,
      commercialType: dto.commercial_type,
      brandName: dto.brand_name,
      brandUrl: dto.brand_url,
      tags: dto.tags || [],
      useAILabel: dto.use_ai_label || false,
      uploadMode: dto.upload_mode,
      createdAt: dto.created_at,
      updatedAt: dto.updated_at,
      expiresAt: dto.expires_at,
      isExpired: expiresAt < now,
      daysUntilExpiration: daysUntil > 0 ? daysUntil : 0,
    };
  }
}
