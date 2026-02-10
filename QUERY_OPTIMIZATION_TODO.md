# Supabase Sorgu Optimizasyonu — Uygulama Planı

## FAZ 1: Postgres RPC Fonksiyonları (Supabase tarafı) ✅
- [x] 1.1 `get_profile_full` RPC oluştur (4 sorgu → 1) ✅
- [x] 1.2 `record_video_view_v2` RPC oluştur (3 sorgu → 1) ✅
- [x] 1.3 `search_content` RPC oluştur (6 sorgu → 1) ✅
- [x] 1.4 Fonksiyonları test et ✅

## FAZ 2: DataSource Güncellemeleri (Frontend tarafı) ✅
- [x] 2.1 `SupabaseProfileDataSource.getProfile()` → `get_profile_full` RPC kullan ✅
- [x] 2.2 `SupabaseVideoDataSource.recordVideoView()` → `record_video_view_v2` RPC kullan ✅
- [x] 2.3 `SupabaseVideoDataSource.getStories()` → `auth.getUser()` kaldır, userId parametre yap ✅
- [x] 2.4 `SupabaseVideoDataSource.searchVideos()` → `search_content` RPC kullan ✅

## FAZ 3: Frontend Optimizasyonları ✅
- [x] 3.1 IStoryRepository → userId parametre ekle ✅
- [x] 3.2 GetStoriesUseCase → userId parametre ekle ✅
- [x] 3.3 StoryRepositoryImpl → userId parametre geçir ✅
- [x] 3.4 useStories hook → currentUser.id'yi queryFn'e geçir ✅
- [x] 3.5 SavedVideos → TanStack Query zaten staleTime ile lazy, ek aksiyon gereksiz ✅

## FAZ 4: Doğrulama ✅
- [x] 4.1 TypeScript hata kontrolü ✅ (sadece önceden var olan 1 ilgisiz hata)
- [ ] 4.2 Uygulama çalışma testi (cihazda test gerekli)
