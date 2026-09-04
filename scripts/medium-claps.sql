-- Seed the claps table with the unique clappers each post had on Medium (src/data/medium-claps.json, snapshot 2026-09-04).
-- Adds to the existing count. Ran once on 2026-09-04; running it again doubles the Medium share.
BEGIN;
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/mogged-into-building-a-chrome-extension', 4) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 5fc05e3f5c1d
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/viewmodel-is-deprecated', 30) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 77a4caa9b359
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/at-the-mountains-of-madness-with-jetpack-compose', 65) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 09d3625597ad
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/injecting-composables-with-dagger-without-losing-it', 28) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- bcf5a6988229
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/going-edge-to-edge-with-compose-without-losing-it', 72) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- be6cd093aef7
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/exercises-in-futility-one-time-events-in-android', 57) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- ddbdd7b5bd1c
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/exercises-in-futility-jetpack-compose-recomposition', 82) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 6ea3cf9bc1b4
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/working-with-compose-navigation-dagger2-viewmodels-oh-my', 32) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- df13bfe22010
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/gotchas-in-per-app-language-preferences-and-android-locale', 11) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 525ff648bb00
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/android-shorts-testing-toasts-with-espresso', 4) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 50584d5c8937
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/android-shorts-custom-lint-rules', 3) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- c71fd38038fc
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/android-shorts-workmanager-observing-a-workrequest-level-paranoid', 5) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- dbdfc42ad25f
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/android-shorts-workmanager-hilt', 9) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 399b4d0efef2
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/stateflow-sharedflow-and-the-secret-bus', 17) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- ba9978ad8453
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/viewmodel-saved-state-review', 77) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- a532b780a9a2
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/exercises-in-futility-unit-testing-livedata-viewmodels-and-coroutines', 57) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 100a3a79c1ab
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/on-testing-kotlin-coroutines', 36) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- d19b69d138f1
INSERT INTO claps (url, count) VALUES ('https://www.costafotiadis.com/kotlin-coroutines-review', 62) ON CONFLICT (url) DO UPDATE SET count = claps.count + EXCLUDED.count; -- 53e951c4a0fa
COMMIT;
