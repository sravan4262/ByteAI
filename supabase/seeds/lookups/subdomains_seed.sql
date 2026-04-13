-- Seed: lookups.subdomains
-- Organized by domain. domain_id resolved via subquery on lookups.domains.name.
INSERT INTO lookups.subdomains (domain_id, name, label, sort_order) VALUES

-- ── Frontend ──────────────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'frontend'), 'ui_frameworks',    'UI Frameworks',    1),
((SELECT id FROM lookups.domains WHERE name = 'frontend'), 'meta_frameworks',  'Meta Frameworks',  2),
((SELECT id FROM lookups.domains WHERE name = 'frontend'), 'styling',          'Styling',          3),
((SELECT id FROM lookups.domains WHERE name = 'frontend'), 'build_tools',      'Build Tools',      4),
((SELECT id FROM lookups.domains WHERE name = 'frontend'), 'fe_testing',       'Testing',          5),

-- ── Backend ───────────────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'backend'), 'be_languages',     'Languages',        1),
((SELECT id FROM lookups.domains WHERE name = 'backend'), 'be_frameworks',    'Frameworks',       2),
((SELECT id FROM lookups.domains WHERE name = 'backend'), 'api_protocols',    'API & Protocols',  3),
((SELECT id FROM lookups.domains WHERE name = 'backend'), 'queues_cache',     'Queues & Cache',   4),

-- ── DevOps / Cloud ────────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'devops'), 'cloud_providers',   'Cloud Providers',  1),
((SELECT id FROM lookups.domains WHERE name = 'devops'), 'containers',        'Containers & K8s', 2),
((SELECT id FROM lookups.domains WHERE name = 'devops'), 'cicd',              'CI / CD',          3),
((SELECT id FROM lookups.domains WHERE name = 'devops'), 'iac',               'IaC',              4),
((SELECT id FROM lookups.domains WHERE name = 'devops'), 'observability',     'Observability',    5),

-- ── Mobile ────────────────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'mobile'), 'ios',               'iOS',              1),
((SELECT id FROM lookups.domains WHERE name = 'mobile'), 'android',           'Android',          2),
((SELECT id FROM lookups.domains WHERE name = 'mobile'), 'cross_platform',    'Cross-Platform',   3),

-- ── AI / ML ───────────────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'ai_ml'), 'ml_frameworks',      'ML Frameworks',    1),
((SELECT id FROM lookups.domains WHERE name = 'ai_ml'), 'nlp_llms',           'NLP & LLMs',       2),
((SELECT id FROM lookups.domains WHERE name = 'ai_ml'), 'mlops',              'MLOps',            3),
((SELECT id FROM lookups.domains WHERE name = 'ai_ml'), 'data_science',       'Data Science',     4),

-- ── Data Engineering ──────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'data'), 'data_databases',      'Databases',        1),
((SELECT id FROM lookups.domains WHERE name = 'data'), 'data_warehouses',     'Data Warehouses',  2),
((SELECT id FROM lookups.domains WHERE name = 'data'), 'data_processing',     'Processing',       3),
((SELECT id FROM lookups.domains WHERE name = 'data'), 'data_viz',            'Visualization',    4),

-- ── Security ──────────────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'security'), 'appsec',          'AppSec',           1),
((SELECT id FROM lookups.domains WHERE name = 'security'), 'cloud_security',  'Cloud Security',   2),
((SELECT id FROM lookups.domains WHERE name = 'security'), 'cryptography',    'Cryptography',     3),
((SELECT id FROM lookups.domains WHERE name = 'security'), 'pentesting',      'Pentesting',       4),

-- ── Systems / Embedded ────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'systems'), 'sys_languages',    'Languages',        1),
((SELECT id FROM lookups.domains WHERE name = 'systems'), 'embedded',         'Embedded',         2),
((SELECT id FROM lookups.domains WHERE name = 'systems'), 'os_kernel',        'OS & Kernel',      3),
((SELECT id FROM lookups.domains WHERE name = 'systems'), 'networking',       'Networking',       4),

-- ── Blockchain / Web3 ─────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'blockchain'), 'evm',           'EVM Chains',       1),
((SELECT id FROM lookups.domains WHERE name = 'blockchain'), 'non_evm',       'Non-EVM Chains',   2),
((SELECT id FROM lookups.domains WHERE name = 'blockchain'), 'web3_tools',    'Web3 Tools',       3),
((SELECT id FROM lookups.domains WHERE name = 'blockchain'), 'smart_contracts','Smart Contracts',  4),

-- ── Game Development ──────────────────────────────────────────────────────────
((SELECT id FROM lookups.domains WHERE name = 'gaming'), 'game_engines',      'Game Engines',     1),
((SELECT id FROM lookups.domains WHERE name = 'gaming'), 'graphics',          'Graphics APIs',    2),
((SELECT id FROM lookups.domains WHERE name = 'gaming'), 'game_languages',    'Languages',        3)

ON CONFLICT (name) DO NOTHING;
