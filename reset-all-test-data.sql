-- reset-all-test-data.sql
-- Supabase SQL Editor'a tek seferde kopyala-yapistir icin.
-- GONDERILERI SILMEZ. Sadece test verilerini temizler.

begin;

truncate table
  public.likes,
  public.saves,
  public.video_views,
  public.story_views
restart identity cascade;

-- Share/shop icin tablo olmadigi icin ilgili counter kolonlarini da sifirla.
update public.videos
set
  likes_count = 0,
  saves_count = 0,
  views_count = 0,
  shares_count = 0,
  shops_count = 0
where deleted_at is null;

update public.stories
set
  likes_count = 0,
  views_count = 0;

commit;

select
  (select count(*) from public.likes) as likes_rows,
  (select count(*) from public.saves) as saves_rows,
  (select count(*) from public.video_views) as video_views_rows,
  (select count(*) from public.story_views) as story_views_rows,
  (select count(*) from public.videos where deleted_at is null) as videos_rows,
  (select count(*) from public.stories) as stories_rows,
  (select coalesce(sum(likes_count), 0) from public.videos where deleted_at is null) as videos_likes_total,
  (select coalesce(sum(saves_count), 0) from public.videos where deleted_at is null) as videos_saves_total,
  (select coalesce(sum(views_count), 0) from public.videos where deleted_at is null) as videos_views_total,
  (select coalesce(sum(shares_count), 0) from public.videos where deleted_at is null) as videos_shares_total,
  (select coalesce(sum(shops_count), 0) from public.videos where deleted_at is null) as videos_shops_total;


-- DANGER (MANUAL): Gonderileri de silmek istersen asagiyi elle ac.
-- begin;
-- truncate table
--   public.likes,
--   public.saves,
--   public.video_views,
--   public.story_views,
--   public.videos,
--   public.stories
-- restart identity cascade;
-- update public.profiles set posts_count = 0;
-- commit;
