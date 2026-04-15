-- ============================================================
-- SEED: interviews.interviews
-- Curated real-world interview experiences — FAANG + top tech companies
-- Source: publicly known interview patterns (LeetCode discuss, tech-interview-handbook,
--         HN threads, dev.to, interviewing.io blog — all public/CC-licensed knowledge)
-- Author: seed system user (00000000-0000-0000-0000-000000000001)
-- Run AFTER: seed_user.sql, roles_seed.sql, locations_seed.sql, tech_stacks_seed.sql
-- ============================================================

-- ─── helpers ──────────────────────────────────────────────────────────────────
-- We use fixed UUIDs so interview_questions and junction tables can reference them
-- without a second lookup pass.

DO $$
DECLARE
  -- interview IDs
  i_google_swe_1       uuid := '10000000-0000-0000-0000-000000000001';
  i_google_swe_2       uuid := '10000000-0000-0000-0000-000000000002';
  i_meta_swe_1         uuid := '10000000-0000-0000-0000-000000000003';
  i_amazon_swe_1       uuid := '10000000-0000-0000-0000-000000000004';
  i_amazon_beh_1       uuid := '10000000-0000-0000-0000-000000000005';
  i_microsoft_swe_1    uuid := '10000000-0000-0000-0000-000000000006';
  i_apple_ios_1        uuid := '10000000-0000-0000-0000-000000000007';
  i_netflix_sd_1       uuid := '10000000-0000-0000-0000-000000000008';
  i_uber_sd_1          uuid := '10000000-0000-0000-0000-000000000009';
  i_stripe_swe_1       uuid := '10000000-0000-0000-0000-000000000010';
  i_airbnb_swe_1       uuid := '10000000-0000-0000-0000-000000000011';
  i_linkedin_beh_1     uuid := '10000000-0000-0000-0000-000000000012';
  i_dropbox_sd_1       uuid := '10000000-0000-0000-0000-000000000013';
  i_cloudflare_swe_1   uuid := '10000000-0000-0000-0000-000000000014';
  i_openai_swe_1       uuid := '10000000-0000-0000-0000-000000000015';

  seed_author uuid := '00000000-0000-0000-0000-000000000001';

BEGIN

-- ─── 1. Google — SWE L3 — Coding ─────────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_google_swe_1, seed_author,
  'Google L3 SWE — 5-round onsite (2024)',
  'Applied via referral. Recruiter reached out within a week. Phone screen was 45 min with a Google doc — two LeetCode-medium graph problems. Onsite was 5 rounds: 2 coding, 1 Googleyness & Leadership, 1 system design (lite for L3), 1 with a senior engineer on a harder LC-hard. The bar is high but interviewers were friendly. Prep: NeetCode 150, Grokking System Design, 8 weeks total. Got an L3 offer in Seattle after ~5 weeks from application.',
  'Google', 'Software Engineer', 'hard', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_google_swe_1,
 'Given an m×n grid of characters and a list of strings (words), find all words in the board. Each cell may be used only once per word.',
 'Classic Word Search II — use a Trie built from the dictionary plus DFS+backtracking on the grid. Build a Trie from all words. For each cell, DFS while following Trie nodes. Mark cells visited with a sentinel and restore after. Remove matched words from the Trie to avoid duplicates. Time: O(M * 4 * 3^(L-1)) where L = max word length. Key optimisations: prune Trie nodes with no more children after a match, and skip cells whose letter is not a Trie root.',
 0),
(i_google_swe_1,
 'Given a reference to a node in a connected undirected graph, return a deep copy of the graph.',
 'Clone Graph (LC 133). Use a HashMap<Node, Node> as a visited/cloned map. BFS or DFS from the given node. For each neighbour, if not yet cloned, create the clone and recurse. Time O(V+E), Space O(V). Corner case: null input returns null.',
 1),
(i_google_swe_1,
 'Design a URL shortener at Google scale (system design lite round for L3).',
 'Key decisions: (1) ID generation — base62 encode a 64-bit counter from a distributed counter service (Zookeeper-coordinated) or a random 7-char base62 with collision check. (2) Storage — write-heavy redirect table in Bigtable/Spanner keyed by short code; long URL → short code secondary index. (3) Redirect service reads from in-memory cache (Memorystore) first. (4) Analytics — async write to Pub/Sub → BigQuery. Discuss TTL, custom aliases, abuse prevention.',
 2);

-- ─── 2. Google — SWE L5 — System Design ──────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_google_swe_2, seed_author,
  'Google L5 Senior SWE — System Design deep dive',
  'Senior-level loop: 1 phone screen (LC hard DP), onsite had 2 system design rounds instead of 1. Interviewers pushed hard on consistency models, SLA guarantees, and failure modes. "Design Google Drive" and "Design Google Search Autocomplete". Coding rounds were graph + DP. Behavioural round asked for conflict resolution and a time I disagreed with a decision. Total process: 6 weeks.',
  'Google', 'Senior Software Engineer', 'hard', 'system_design', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_google_swe_2,
 'Design Google Drive — focus on file upload, storage, and sync across devices.',
 'Core components: (1) Metadata service — stores file tree (user_id, parent_id, name, version, checksum) in Spanner for strong consistency. (2) Blob storage — chunk files into 4 MB blocks, store content-addressed (SHA-256) in GCS — deduplication is free. (3) Upload flow — client splits file, uploads blocks in parallel to upload service, commits metadata atomically. (4) Sync — long-poll or WebSocket notification service pushes delta manifest to connected clients; client fetches only changed chunks. (5) Conflict resolution — last-write-wins with a "conflicted copy" rename. Discuss: bandwidth throttling, offline mode, mobile battery impact.',
 0),
(i_google_swe_2,
 'Design Google Search Autocomplete / type-ahead.',
 'Requirements: <100 ms P99, top-K suggestions per prefix, ~10B+ queries/day. Architecture: (1) Offline — MapReduce over query logs, compute top-K per prefix, store in a distributed Trie or a sorted prefix table in Bigtable. (2) Online serving — each prefix maps to a row; read top-5, merge with real-time trending (last 1 hr) from a stream processor. (3) Cache aggressively — 80% traffic is top-1000 prefixes, fits in RAM. (4) Personalisation layer — blend global top-K with user history scores. Discuss: multilingual support, explicit filtering, cache invalidation frequency.',
 1);

-- ─── 3. Meta — SWE E4 — Coding ───────────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_meta_swe_1, seed_author,
  'Meta E4 SWE onsite — 2 coding + 1 system design + 1 behavioral (2024)',
  'Recruiter cold-messaged on LinkedIn. Phone screen had 2 data structure problems in 50 min — both medium. Onsite: 2 coding rounds (1 graph, 1 array/DP), 1 system design ("Design Instagram Feed"), 1 behavioral focused on Meta values (move fast, be bold, focus on impact). Meta uses CoderPad. Interviewers run a tight clock — communicate your approach first, then code. Offer: E4 in Menlo Park, decision in 2 weeks.',
  'Meta', 'Software Engineer', 'medium', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_meta_swe_1,
 'You are given a list of accounts where each element is a list of strings. The first element is a name, and the rest are emails. Merge accounts that share at least one email.',
 'Accounts Merge (LC 721). Model as a graph/Union-Find problem. Build a Union-Find where the root for each email is determined by first occurrence. Map email→name for output. Union all emails within the same account. Group by root, sort each group of emails, prepend the name. Time O(N*K*α(N)), Space O(N*K). Alternative: BFS — build email adjacency list, BFS to find connected components.',
 0),
(i_meta_swe_1,
 'Design Instagram Feed — post creation, home feed generation, like/comment counts.',
 'Two approaches: (1) Push (fanout-on-write) — on post, write to every follower''s feed cache. Read is O(1) but write is expensive for celebrities. (2) Pull (fanout-on-read) — on feed request, query N most-recent posts from followed accounts, merge-sort. Hybrid: push for users with <10K followers, pull for celebrities. Storage: posts in Cassandra (post_id, user_id, media_url, timestamp). Feed cache in Redis sorted set keyed by user_id, score = timestamp. CDN for media. Pagination via cursor (post_id). Discuss: eventual consistency acceptable for feed, strong consistency for like counts.',
 1),
(i_meta_swe_1,
 'Tell me about a time you had to move fast and ship something imperfect, then iterate.',
 'Use the STAR method. Situation: describe a tight deadline with real business stakes. Task: what you owned. Action: the conscious trade-offs you made (skipped unit tests for non-critical path, hard-coded config, deferred pagination). Result: shipped on time, quantified impact, then describe the follow-up cleanup sprint. Meta wants to see you default to action, take ownership, and not be paralysed by perfect.',
 2);

-- ─── 4. Amazon — SWE II — Coding ─────────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_amazon_swe_1, seed_author,
  'Amazon SWE II — 4-round virtual loop (coding focus)',
  'Amazon''s loop is 4 rounds each 55 min — every round has a coding problem AND 2-3 LP (Leadership Principle) questions. Coding was array/string (medium), trees (medium), graphs (medium-hard), and one DP (hard). Prepare 12+ LP stories mapped to all 16 LPs using STAR. Bar Raiser round: focus sharply on "Are Right a Lot" and "Think Big". Offer in ~2 weeks. Remote in Seattle timezone.',
  'Amazon', 'Software Engineer', 'medium', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_amazon_swe_1,
 'Given a string s containing just the characters (, ), {, }, [, ], determine if the input string is valid (brackets close in the correct order).',
 'Valid Parentheses (LC 20). Use a stack. For each open bracket push; for each close bracket check stack top matches. Return stack.isEmpty() at the end. Time O(N), Space O(N). Edge: empty string is valid. Single char is never valid.',
 0),
(i_amazon_swe_1,
 'Given the root of a binary tree and an integer targetSum, return all root-to-leaf paths where the path sum equals targetSum.',
 'Path Sum II (LC 113). DFS with a running total and a current path list. When you reach a leaf and running total equals targetSum, snapshot current path into result. Backtrack by removing last element on return. Time O(N²) worst case (copying path at each leaf). Space O(H) call stack + O(N) for result.',
 1),
(i_amazon_swe_1,
 'Find the number of islands in an m×n grid of 1s (land) and 0s (water).',
 'Number of Islands (LC 200). BFS/DFS from each unvisited land cell, marking connected cells as visited (flip to 0 or use a visited set). Increment island count each time you start a new BFS. Time O(M*N), Space O(min(M,N)) for BFS queue. Union-Find alternative: O(M*N*α) time, same space.',
 2);

-- ─── 5. Amazon — SWE II — Behavioral ─────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_amazon_beh_1, seed_author,
  'Amazon LP deep dive — Bar Raiser round tips',
  'The Bar Raiser round is the hardest part of Amazon interviews. The Bar Raiser is a senior employee (SDE III or PM) whose sole job is to maintain hiring standards. They will follow up on every answer, probe for specifics, and challenge your conclusions. Do NOT give vague answers. Every answer must have: concrete numbers, your specific contribution (not "we"), the outcome, and what you learned. Prep: write 12 stories, map each to 3-4 LPs, rehearse out loud.',
  'Amazon', 'Software Engineer', 'medium', 'behavioral', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_amazon_beh_1,
 'Tell me about a time you delivered a project under a tight deadline. (Deliver Results)',
 'STAR format is mandatory. Be specific: "Q3 2023, 6-week deadline cut to 3 weeks due to partner dependency." Describe what YOU personally did — not the team. Quantify: "reduced API latency by 40%, shipped 2 weeks early, zero P0 bugs at launch." Amazon wants to see you set stretch goals, remove blockers proactively, and hold yourself to a high standard even under pressure.',
 0),
(i_amazon_beh_1,
 'Tell me about a time you disagreed with your manager. (Have Backbone; Disagree and Commit)',
 'Show that you raised the disagreement respectfully with data, argued your position clearly, and then — whether or not you prevailed — fully committed to the final decision and executed well. Amazon does NOT want to hear that you stayed quiet or secretly did it your way. The "commit" half is as important as the "disagree" half.',
 1),
(i_amazon_beh_1,
 'Describe a time you used data to make a decision that was unpopular. (Are Right a Lot)',
 'Show that you sought out disconfirming evidence, consulted domain experts, and used diverse data sources — not just the first metric that supported your gut. Amazon wants people who update their beliefs when new information arrives, not people who cherry-pick data to justify a predetermined answer.',
 2);

-- ─── 6. Microsoft — SWE II — Coding ──────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_microsoft_swe_1, seed_author,
  'Microsoft SWE II — Virtual 4-round loop (Azure team)',
  'Process: online assessment (2 LC mediums, 90 min), then 4 virtual rounds over 2 days. Rounds: coding x2, design (component-level, not full distributed), hiring manager behavioral. Microsoft is notably collaborative — interviewers will give hints. Code in any language; they care about correctness and communication more than syntax. Azure team round included a vague "design a rate limiter" with a lot of "what would you do if X failed".',
  'Microsoft', 'Software Engineer', 'medium', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_microsoft_swe_1,
 'LRU Cache — implement get and put in O(1).',
 'LRU Cache (LC 146). Combine a HashMap for O(1) lookup and a doubly-linked list for O(1) insertion/deletion. On get: move node to head (most-recently used). On put: insert at head; if over capacity, evict tail. Use sentinel head/tail nodes to simplify edge cases. In Python: use OrderedDict. In Java: LinkedHashMap with accessOrder=true.',
 0),
(i_microsoft_swe_1,
 'Design a rate limiter for an API gateway.',
 'Common algorithms: (1) Token bucket — supports bursts, Redis INCR + TTL; (2) Sliding window log — precise, memory-expensive; (3) Sliding window counter — hybrid, good balance. For distributed: use Redis atomic INCR with a 1-second key. Return 429 with Retry-After header when limit exceeded. Discuss: per-user vs per-IP vs per-endpoint limits, throttle vs reject policy, header-based communication (X-RateLimit-Remaining).',
 1);

-- ─── 7. Apple — iOS Engineer — Coding ────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_apple_ios_1, seed_author,
  'Apple iOS Engineer — 5-round onsite (Maps team)',
  'Apple''s process is slow: 3 weeks between each stage. Phone screen: Swift fundamentals + one coding problem. Onsite: 2 coding (Swift, no autocomplete in Xcode — plain text), 1 iOS-specific (memory management, UIKit internals, concurrency), 1 system design (design the Maps app offline cache), 1 hiring manager. Apple values attention to detail and polish — they will ask about edge cases, accessibility, and memory. No LC hard in coding rounds but they expect very clean, production-quality code.',
  'Apple', 'iOS Engineer', 'hard', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_apple_ios_1,
 'Explain ARC (Automatic Reference Counting) and how to avoid retain cycles in Swift closures.',
 'ARC tracks strong references to class instances and deallocates when count reaches 0. Retain cycles occur when two objects hold strong references to each other (or a closure captures self strongly while self also owns the closure). Fix: use [weak self] or [unowned self] capture lists. Prefer weak when the reference can become nil; use unowned only when you are certain it won''t outlive the captured object. In Swift concurrency (async/await), Sendable and actor isolation replace many retain cycle concerns.',
 0),
(i_apple_ios_1,
 'Design the offline tile cache for Apple Maps — tiles must be available without network, evictable when storage is low, and fresh when back online.',
 'Core decisions: (1) Tile addressing — (zoom, x, y) tuple → file path in a flat directory or SQLite (MBTiles format). (2) Download manager — background URLSession with discretionary flag, resumes on crash. (3) Eviction policy — LRU + priority boost for tiles the user has recently viewed; use NSFileManager attributes for last-access time. (4) Freshness — tile has a server-set max-age; background refresh via silent push when connected. (5) Storage budget — NSFileProtectionComplete for sensitive region data; honour NSFileManager''s available-capacity API before downloading.',
 1),
(i_apple_ios_1,
 'What is the difference between @MainActor, Task, and async/await in Swift concurrency?',
 'async/await is the syntax for writing asynchronous code sequentially — a function marked async can be suspended without blocking a thread. Task creates a new unit of concurrent work; it can be structured (child of current task, inherits priority/cancellation) or unstructured. @MainActor is a global actor that serialises access to the main thread; mark a class or function @MainActor to guarantee it always runs on the main queue. UIKit/SwiftUI views must be updated on @MainActor. Actors in general protect mutable state from data races by serialising access.',
 2);

-- ─── 8. Netflix — Senior SWE — System Design ──────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_netflix_sd_1, seed_author,
  'Netflix Senior SWE — System Design: Video Streaming Platform',
  'Netflix interviews are famously hard and fast — they value high talent density and will pass on qualified candidates who aren''t exceptional. The system design round is 60 min and they expect you to drive. They push on operational excellence: what happens when your service crashes at 2 AM on Christmas? Prepare to talk about chaos engineering, graceful degradation, and blast radius reduction. Got an offer after 3 weeks.',
  'Netflix', 'Senior Software Engineer', 'hard', 'system_design', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_netflix_sd_1,
 'Design Netflix video streaming — focus on upload pipeline, encoding, and global delivery.',
 'Pipeline: (1) Upload — chunked upload to S3 via presigned URLs, workers detect completion via S3 event. (2) Encoding — transcoding fleet converts raw video to H.264/HEVC/AV1 in multiple resolutions (240p–4K) and bitrates; output stored in S3. Netflix uses per-title encoding (VMAF-optimised). (3) Manifest — create HLS/DASH manifests listing all renditions. (4) CDN — Open Connect Appliances (Netflix''s own CDN) cache video chunks at ISP PoPs. Client uses ABR (Adaptive Bitrate) to select quality. (5) Auth — signed URLs with short TTL prevent hotlinking. Discuss: DRM (Widevine/FairPlay), download for offline, ISP peering.',
 0),
(i_netflix_sd_1,
 'How would you design Netflix''s recommendation engine at a high level?',
 'Offline layer: collaborative filtering (ALS on user-item matrix in Spark) + content-based embeddings trained on video metadata, generate candidate lists per user daily, store in Cassandra. Online layer: at request time, retrieve candidates, run a lightweight ranking model (XGBoost/DNN) that incorporates real-time signals (time of day, device, last-watched). A/B test ranking models continuously. Two-tower neural model for candidate retrieval is Netflix''s known approach. Discuss: cold start (new user → trending + genre preferences), freshness vs stability trade-off.',
 1);

-- ─── 9. Uber — Senior SWE — System Design ────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_uber_sd_1, seed_author,
  'Uber Senior SWE — Design Uber''s Ride Matching & Surge Pricing',
  'Uber''s system design round is very product-centric — they want you to understand the business constraints, not just the tech. "What happens if your matching service is down for 30 seconds? What''s the user impact, and how do you recover?" Two rounds of coding (medium-hard) + one system design. Behavioral was standard but they probed heavily on "working cross-functionally with data science teams".',
  'Uber', 'Senior Software Engineer', 'hard', 'system_design', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_uber_sd_1,
 'Design Uber''s real-time ride matching — rider requests a ride, nearest available driver is dispatched within 1 second.',
 'Key insight: geospatial index. (1) Driver location service — drivers send GPS updates every 4 sec via WebSocket; store in Redis Geohash index (GEORADIUSBYMEMBER) for O(log N) radius queries. (2) Matching service — on ride request, query Redis for drivers within 1-km radius, rank by ETA (Google Maps Distance Matrix API or internal OSRM), send offer to top driver. (3) Offer timeout — driver has 10 sec to accept; on timeout, try next. (4) Consistency — use distributed lock (Redis Redlock) to prevent double-booking a driver. (5) Scale — partition geohash index by city region. Discuss: surge detection (supply/demand ratio per geohash cell), driver supply forecasting.',
 0),
(i_uber_sd_1,
 'How does Uber implement surge pricing, and how would you design it?',
 'Surge is a multiplier applied when demand > supply in a geohash cell. Design: (1) Compute supply/demand ratio per H3 hexagon cell every 1 min in a streaming pipeline (Kafka + Flink). (2) Multiplier function: typically a step function or ML model calibrated to maximise driver acceptance rate. (3) Surge map — write multipliers to a distributed cache read by the pricing service; client polls every 30 sec. (4) Transparency — show estimated fare range before booking, lock price at dispatch. Discuss: price gouging regulations (NYC, California), phantom demand (bots), driver routing from low-surge to high-surge zones.',
 1);

-- ─── 10. Stripe — SWE — Coding ───────────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_stripe_swe_1, seed_author,
  'Stripe SWE — Take-home + 3-round technical interview',
  'Stripe''s process: (1) 4-hr take-home — implement a mini payments API in your language of choice with tests. (2) Code review round — interviewer reads your take-home code and asks pointed questions about your choices. (3) Bug bash — you debug a pre-written program they share screen on. (4) System design. Stripe values idiomatic, clean, tested code above all else. My take-home was Ruby; they care more about your reasoning than the language. Total: 4 weeks.',
  'Stripe', 'Software Engineer', 'hard', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_stripe_swe_1,
 'You are given a payments ledger as a list of transactions. Detect if any account balance goes negative at any point.',
 'Running balance approach: iterate transactions in chronological order, maintain a map of account_id → running_balance. On each debit, subtract and immediately check < 0. Return true if any balance goes negative. Time O(N), Space O(A) where A = number of unique accounts. Production considerations: use BigDecimal (not float) for currency arithmetic. Handle multi-currency with explicit FX conversion. Idempotency keys to prevent duplicate processing.',
 0),
(i_stripe_swe_1,
 'Walk me through how you would design Stripe''s idempotency key system for payment API calls.',
 'Problem: network retries must not double-charge customers. Solution: (1) Client sends a unique Idempotency-Key header per logical request. (2) On receipt, compute hash(key + stripe_account_id), store the in-flight request and eventual response in a fast KV store (Redis) with TTL=24 hrs. (3) If a duplicate key arrives while request is in-flight, return 409 Conflict or block until first completes. (4) After completion, cache the response and replay it for all future retries. Discuss: what payload should be included in the idempotency scope (request body + key), how to handle partial failures in multi-step workflows (Saga pattern).',
 1);

-- ─── 11. Airbnb — SWE — Coding ───────────────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_airbnb_swe_1, seed_author,
  'Airbnb SWE — 5 rounds focused on problem-solving style',
  'Airbnb cares a lot about HOW you think, not just whether you get the right answer. Expect them to cut you off while coding and ask "why did you choose this approach?". Rounds: 2 coding (graph, interval), 1 object-oriented design (design a hotel booking system in code), 1 cross-functional collaboration, 1 customer obsession behavioral. They use CoderPad and want runnable code with test cases at the end.',
  'Airbnb', 'Software Engineer', 'hard', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_airbnb_swe_1,
 'Given a list of airline tickets represented as [from, to] pairs, reconstruct the itinerary in order. Begin from JFK; use all tickets exactly once.',
 'Reconstruct Itinerary (LC 332). Model as a directed multigraph. Use Hierholzer''s algorithm for Eulerian path: sort adjacency lists lexicographically (so we visit smaller destinations first), DFS, post-order prepend to result (so result is in correct order without reversing issues). Time O(E log E) for sorting. Key insight: greedy lexicographic DFS alone fails; you must use post-order to handle dead ends.',
 0),
(i_airbnb_swe_1,
 'Design a booking system class for a hotel — rooms can be reserved for date ranges, with no overlapping reservations.',
 'Core design: Room has a sorted list of reservations (start, end, booking_id). On reserve(room_id, start, end), binary-search for any overlapping interval — two intervals [a,b] and [c,d] overlap iff a < d && c < b. If no overlap, insert in sorted order. Use a TreeMap<Integer, Integer> (start→end) and floorKey/ceilingKey for O(log N) overlap check and O(log N) insert. Expose: book(room, start, end) → bookingId or error; cancel(bookingId); available(room, start, end) → bool.',
 1);

-- ─── 12. Palantir — Senior SWE — Behavioral ─────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_linkedin_beh_1, seed_author,
  'Palantir Senior SWE — Deployed Engineer behavioral round',
  'Palantir''s process is unique: 1 phone screen (algorithms), 1 Palantir-specific "Decomposition" round (break down a vague real-world problem), 1 full-stack coding challenge, and 1 behavioral "culture fit" round. They emphasize mission-driven work, extreme ownership, and the "Deployed Engineer" model where engineers embed directly with customers (government, hospitals, banks). Behavioral questions probe whether you are comfortable working in high-ambiguity, high-stakes environments. Total process: 5 weeks.',
  'Palantir', 'Senior Software Engineer', 'hard', 'behavioral', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_linkedin_beh_1,
 'Tell me about a time you worked directly with a non-technical stakeholder to define the right technical solution.',
 'Palantir''s Deployed Engineer model means you are the bridge between engineering and the end user — often an analyst at a government agency or hospital. Show: (1) You took time to understand the stakeholder''s actual workflow before proposing anything. (2) You translated technical constraints into business language. (3) You iterated with them, not just at them. (4) The outcome improved their actual operations, not just your metrics. Palantir will probe hard: "What did they ask for vs what did they actually need?" This distinction is central to their culture.',
 0),
(i_linkedin_beh_1,
 'Describe a situation where you had to operate in extreme ambiguity with no clear requirements.',
 'Palantir explicitly tests for comfort with vagueness — they build products for problems that have never been solved before. Strong answer structure: (1) The ambiguous brief ("build something to help analysts detect fraud faster"). (2) How you created a hypothesis and gathered signal rapidly — talked to users, looked at existing workflows, identified the highest-leverage starting point. (3) How you time-boxed exploration and moved to execution. (4) How you communicated uncertainty upward with explicit risk flags. Bad answer: "I asked my manager to clarify requirements." Good answer: "I defined the requirements myself, validated with users, and documented my assumptions."',
 1);

-- ─── 13. Databricks — Senior SWE — System Design ────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_dropbox_sd_1, seed_author,
  'Databricks Senior SWE — System Design: Delta Lake & Distributed Query Engine',
  'Databricks'' technical bar is extremely high — they build the open-source Spark and Delta Lake infrastructure used by thousands of companies. Onsite: 2 coding rounds (one JVM GC deep dive, one distributed systems problem), 2 system design rounds ("Design a distributed shuffle service" and "Design Delta Lake''s ACID transaction layer"), 1 behavioral. Interviewers expect deep knowledge of JVM internals, data layouts (Parquet, ORC), and distributed compute at scale. Process: 4 weeks.',
  'Databricks', 'Senior Software Engineer', 'hard', 'system_design', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_dropbox_sd_1,
 'Design Delta Lake''s ACID transaction layer on top of a cloud object store (S3/GCS).',
 'Core challenge: object stores are not atomically writable — you cannot do read-modify-write. Delta Lake''s solution: (1) Transaction log — a series of JSON commit files in a _delta_log/ directory. Each commit is an atomic put of a new numbered file (00000000000000000001.json). The log records which Parquet data files were added or removed. (2) Optimistic concurrency control — writer reads the current log version, writes new data files to a temp path, then atomically commits the log entry. If another writer commits first, detect the conflict and retry. (3) Checkpointing — every 10 commits, write a Parquet checkpoint of the full log state to avoid replaying thousands of JSON files. (4) Time travel — any past version is accessible by reading up to a historical log entry. (5) Schema enforcement — schema stored in the log; writes are validated before commit.',
 0),
(i_dropbox_sd_1,
 'Design Apache Spark''s shuffle mechanism — how does data move between map and reduce stages?',
 'Shuffle is the most expensive operation in Spark — it requires writing all map output to disk and transferring it across the network. (1) Map side: each mapper writes its output partitioned by reduce-key hash into local shuffle files (one file per reducer, or consolidated with an index file — sort-based shuffle). (2) Reduce side: each reducer fetches its partitions from all mappers using a shuffle service (external shuffle service in YARN/K8s avoids re-fetching if the executor dies). (3) Sort-based shuffle: map output is sorted by partition+key, enabling efficient merge-sort on the reduce side. (4) Tungsten: off-heap binary format avoids Java GC overhead during sort. (5) Adaptive Query Execution: Spark 3.x automatically coalesces shuffle partitions after seeing the actual data distribution, eliminating the "number of partitions" tuning problem.',
 1);

-- ─── 14. Cloudflare — SWE — Coding & Systems ─────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_cloudflare_swe_1, seed_author,
  'Cloudflare SWE — 4-round technical loop (Workers & Edge platform)',
  'Cloudflare has a unique process: they care deeply about networking fundamentals, distributed systems, and Rust/Go performance. Rounds: 1 algorithms (graph BFS, medium), 1 systems (design a CDN cache invalidation system), 1 networking deep-dive (TLS handshake, HTTP/2 multiplexing, QUIC basics), 1 behavioral. They gave me a take-home to build a mini KV store in Go. Very technically rigorous hiring bar.',
  'Cloudflare', 'Software Engineer', 'hard', 'coding', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_cloudflare_swe_1,
 'Explain the TLS 1.3 handshake. What makes it faster than TLS 1.2?',
 'TLS 1.3 reduces the handshake to 1-RTT (vs 2-RTT for 1.2). Steps: (1) ClientHello — includes supported cipher suites AND a key share (Diffie-Hellman ephemeral key) immediately. (2) ServerHello — picks cipher, sends its DH key share + certificate + Finished in one flight. (3) Client verifies certificate, sends Finished. Both sides derive the same session keys from the DH exchange. 0-RTT (early data): client can send application data alongside ClientHello using a pre-shared key from a previous session — resumption without extra roundtrip. Security improvements: removed RSA key exchange (forward secrecy always), removed weak ciphers (RC4, SHA-1, 3DES), encrypted certificates.',
 0),
(i_cloudflare_swe_1,
 'Design a CDN cache invalidation system — you need to purge a URL from all 300 edge PoPs within 5 seconds.',
 'Approach: (1) Invalidation API — client sends DELETE /cache?url=X to origin API. (2) Message fan-out — publish invalidation event to a high-throughput pub/sub system (Kafka / Cloudflare''s own Quicksilver). Each PoP subscribes to its regional topic. (3) Edge agent — listens on topic, immediately marks cached objects for the URL as stale (sets TTL=0 or removes from local cache). (4) Consistency — use a purge_token (monotonically increasing) so late-arriving messages from a replay don''t re-invalidate a freshly cached object. (5) Observability — each PoP ACKs the invalidation; dashboard shows propagation completeness in real time. Discuss: wildcard/prefix purges (more expensive, batching needed), tag-based purging (Cloudflare Cache Tags).',
 1);

-- ─── 15. OpenAI — SWE — ML Infrastructure ────────────────────────────────────
INSERT INTO interviews.interviews
  (id, author_id, title, body, company, role, difficulty, type, is_anonymous, is_active)
VALUES (
  i_openai_swe_1, seed_author,
  'OpenAI SWE (ML Infra) — 5-round loop focused on distributed training',
  'OpenAI''s bar is extremely high. Expect deep ML systems questions even for infra roles: gradient checkpointing, mixed-precision training, NCCL collective ops. Coding rounds were LC hard (one DP, one graph). System design was "Design a distributed model training platform". Behavioral emphasized ownership and research mindset. Process: 7 weeks total including a long debrief period. Offer at L5 equivalent.',
  'OpenAI', 'Software Engineer', 'hard', 'system_design', false, true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO interviews.interview_questions (interview_id, question, answer, order_index) VALUES
(i_openai_swe_1,
 'Explain data parallelism vs model parallelism in distributed deep learning training.',
 'Data parallelism (DDP): each GPU holds a full copy of the model, processes a different mini-batch, computes gradients, then all-reduce gradient updates across GPUs (NCCL AllReduce). Scales well to many GPUs; limited by single-GPU memory for model size. Model parallelism: split model layers across GPUs (pipeline parallelism) or split individual weight matrices (tensor parallelism). Pipeline parallelism introduces micro-batching to keep GPUs busy despite forward/backward pass dependencies. Tensor parallelism (Megatron-LM style) splits linear layers column-wise or row-wise across GPUs with AllReduce at boundaries. For LLMs: 3D parallelism = data + pipeline + tensor in combination.',
 0),
(i_openai_swe_1,
 'Design a distributed model training platform — job scheduling, fault tolerance, checkpointing.',
 'Components: (1) Job scheduler — receives training job spec (model config, dataset path, GPU count, hyperparams); uses Kubernetes + volcano/kueue for gang scheduling (all GPUs must start together). (2) Trainer pods — each runs a worker process (PyTorch DDP or Megatron); communicate via NCCL over InfiniBand. (3) Checkpointing — async checkpoints every N steps to distributed storage (S3/GCS); use elastic training (PyTorch Elastic) to resume from last checkpoint after node failure without restarting the job. (4) Observability — TensorBoard metrics pushed to a time-series DB; custom dashboard shows GPU utilisation, MFU (Model FLOP utilisation). (5) Experiment tracking — MLflow or W&B for hyperparameter and run metadata. Discuss: spot instance preemption handling, CheckFreq optimisation (checkpoint interval vs restart cost), ZeRO optimizer sharding (DeepSpeed).',
 1),
(i_openai_swe_1,
 'What is gradient checkpointing and when would you use it?',
 'Gradient checkpointing (activation recomputation) trades compute for memory. Normally, during forward pass all intermediate activations are saved for the backward pass — memory cost is O(L) for L layers. With checkpointing, you discard activations during forward and recompute them on-demand during backward. Memory drops to O(sqrt(L)) at the cost of ~30% more compute. Use when training very large models (70B+ params) where activation memory is the bottleneck, not compute. PyTorch API: torch.utils.checkpoint.checkpoint(). Selective checkpointing: only checkpoint expensive layers (attention) to balance the trade-off.',
 2);

-- ─── Interview → Location mappings ───────────────────────────────────────────
INSERT INTO interviews.interview_locations (interview_id, location_id)
SELECT i.id, l.id
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'Seattle'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'Seattle'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'San Francisco'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'Seattle'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'Seattle'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'Seattle'),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'San Jose'),
  ('10000000-0000-0000-0000-000000000008'::uuid, 'San Jose'),
  ('10000000-0000-0000-0000-000000000009'::uuid, 'San Francisco'),
  ('10000000-0000-0000-0000-000000000010'::uuid, 'San Francisco'),
  ('10000000-0000-0000-0000-000000000011'::uuid, 'San Francisco'),
  ('10000000-0000-0000-0000-000000000012'::uuid, 'New York'),
  ('10000000-0000-0000-0000-000000000013'::uuid, 'San Francisco'),
  ('10000000-0000-0000-0000-000000000014'::uuid, 'San Francisco'),
  ('10000000-0000-0000-0000-000000000015'::uuid, 'San Francisco')
) AS v(interview_id, location_name)
JOIN interviews.interviews i ON i.id = v.interview_id
JOIN interviews.locations  l ON lower(l.name) = lower(v.location_name)
ON CONFLICT DO NOTHING;

-- ─── Interview → Tech Stack mappings ─────────────────────────────────────────
INSERT INTO interviews.interview_tech_stacks (interview_id, tech_stack_id)
SELECT v.interview_id, ts.id
FROM (VALUES
  -- Google coding
  ('10000000-0000-0000-0000-000000000001'::uuid, 'python'),
  ('10000000-0000-0000-0000-000000000001'::uuid, 'java'),
  -- Google system design
  ('10000000-0000-0000-0000-000000000002'::uuid, 'python'),
  -- Meta coding
  ('10000000-0000-0000-0000-000000000003'::uuid, 'python'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'react'),
  -- Amazon coding
  ('10000000-0000-0000-0000-000000000004'::uuid, 'java'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'python'),
  -- Microsoft SWE
  ('10000000-0000-0000-0000-000000000006'::uuid, 'aspnet_core'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'csharp'),
  -- Apple iOS
  ('10000000-0000-0000-0000-000000000007'::uuid, 'swift'),
  -- Netflix
  ('10000000-0000-0000-0000-000000000008'::uuid, 'java'),
  ('10000000-0000-0000-0000-000000000008'::uuid, 'python'),
  -- Stripe
  ('10000000-0000-0000-0000-000000000010'::uuid, 'ruby'),
  ('10000000-0000-0000-0000-000000000010'::uuid, 'go'),
  -- Cloudflare
  ('10000000-0000-0000-0000-000000000014'::uuid, 'go'),
  ('10000000-0000-0000-0000-000000000014'::uuid, 'rust'),
  -- OpenAI
  ('10000000-0000-0000-0000-000000000015'::uuid, 'python'),
  ('10000000-0000-0000-0000-000000000015'::uuid, 'pytorch')
) AS v(interview_id, ts_name)
JOIN lookups.tech_stacks ts ON ts.name = v.ts_name
ON CONFLICT DO NOTHING;

END $$;
