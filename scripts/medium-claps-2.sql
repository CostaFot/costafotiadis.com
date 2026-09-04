-- Seed the claps table with the unique clappers the six Medium stories migrated on 2026-09-04 had
-- (src/data/medium-claps.json, snapshot 2026-09-04). The second one-off after scripts/medium-claps.sql.
-- These URLs had no row before, so DO NOTHING (not the additive upsert of the first script): the psql
-- retry loop cannot double a commit that landed but timed out on the way back. Not run yet.
-- All six carry `popular: false`, so the counts show on the post but never rank on /tag/popular/.
BEGIN;
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/kotlin-over-flow-review', 5) ON CONFLICT (url) DO NOTHING; -- f528141704db
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/retrofit-re-review-the-clappening', 11) ON CONFLICT (url) DO NOTHING; -- 7f64631ce7bc
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/glide-review', 6) ON CONFLICT (url) DO NOTHING; -- 72e42555b801
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/retrofit-review', 76) ON CONFLICT (url) DO NOTHING; -- 9a27f719a87f
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/using-android-recyclerview-in-2019', 6) ON CONFLICT (url) DO NOTHING; -- fc3dc494f372
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/android-rxjava-in-5-minutes', 14) ON CONFLICT (url) DO NOTHING; -- 3d407021c202
COMMIT;
