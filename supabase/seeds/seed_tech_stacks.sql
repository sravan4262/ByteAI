-- Seed: tech_stacks (domain_id looked up by name)
-- Frontend
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('react',       'React',        1),
  ('next_js',     'Next.js',      2),
  ('vue',         'Vue.js',       3),
  ('angular',     'Angular',      4),
  ('svelte',      'Svelte',       5),
  ('typescript',  'TypeScript',   6),
  ('javascript',  'JavaScript',   7),
  ('css',         'CSS / Tailwind',8),
  ('graphql',     'GraphQL',      9),
  ('redux',       'Redux',        10)
) AS t(name, label, sort_order)
WHERE d.name = 'frontend'
ON CONFLICT (name) DO NOTHING;

-- Backend
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('dotnet',      '.NET / C#',    1),
  ('golang',      'Go',           2),
  ('rust',        'Rust',         3),
  ('java',        'Java',         4),
  ('kotlin',      'Kotlin',       5),
  ('python',      'Python',       6),
  ('node_js',     'Node.js',      7),
  ('ruby',        'Ruby / Rails', 8),
  ('elixir',      'Elixir',       9),
  ('scala',       'Scala',        10),
  ('postgres',    'PostgreSQL',   11),
  ('redis',       'Redis',        12),
  ('kafka',       'Kafka',        13),
  ('grpc',        'gRPC',         14),
  ('rabbitmq',    'RabbitMQ',     15)
) AS t(name, label, sort_order)
WHERE d.name = 'backend'
ON CONFLICT (name) DO NOTHING;

-- DevOps / Cloud
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('aws',         'AWS',              1),
  ('azure',       'Azure',            2),
  ('gcp',         'Google Cloud',     3),
  ('kubernetes',  'Kubernetes',       4),
  ('docker',      'Docker',           5),
  ('terraform',   'Terraform',        6),
  ('helm',        'Helm',             7),
  ('github_actions','GitHub Actions', 8),
  ('ansible',     'Ansible',          9),
  ('prometheus',  'Prometheus',       10),
  ('grafana',     'Grafana',          11),
  ('nginx',       'Nginx',            12),
  ('linux',       'Linux',            13)
) AS t(name, label, sort_order)
WHERE d.name = 'devops'
ON CONFLICT (name) DO NOTHING;

-- Mobile
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('react_native','React Native', 1),
  ('flutter',     'Flutter',      2),
  ('swift',       'Swift / iOS',  3),
  ('android',     'Android / Kotlin', 4),
  ('expo',        'Expo',         5)
) AS t(name, label, sort_order)
WHERE d.name = 'mobile'
ON CONFLICT (name) DO NOTHING;

-- AI / ML
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('pytorch',     'PyTorch',      1),
  ('tensorflow',  'TensorFlow',   2),
  ('langchain',   'LangChain',    3),
  ('openai',      'OpenAI API',   4),
  ('huggingface', 'HuggingFace',  5),
  ('scikit',      'scikit-learn', 6),
  ('pandas',      'Pandas',       7),
  ('numpy',       'NumPy',        8),
  ('pgvector',    'pgvector',     9),
  ('onnx',        'ONNX Runtime', 10)
) AS t(name, label, sort_order)
WHERE d.name = 'ai_ml'
ON CONFLICT (name) DO NOTHING;

-- Data Engineering
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('spark',       'Apache Spark', 1),
  ('airflow',     'Apache Airflow',2),
  ('dbt',         'dbt',          3),
  ('snowflake',   'Snowflake',    4),
  ('bigquery',    'BigQuery',     5),
  ('databricks',  'Databricks',   6),
  ('flink',       'Apache Flink', 7),
  ('duckdb',      'DuckDB',       8)
) AS t(name, label, sort_order)
WHERE d.name = 'data'
ON CONFLICT (name) DO NOTHING;

-- Security
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('owasp',       'OWASP',            1),
  ('pen_testing', 'Pen Testing',      2),
  ('sast',        'SAST / DAST',      3),
  ('zero_trust',  'Zero Trust',       4),
  ('iam',         'IAM / Auth',       5),
  ('vault',       'HashiCorp Vault',  6)
) AS t(name, label, sort_order)
WHERE d.name = 'security'
ON CONFLICT (name) DO NOTHING;

-- Systems
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('c_cpp',       'C / C++',      1),
  ('assembly',    'Assembly',     2),
  ('rtos',        'RTOS',         3),
  ('wasm',        'WebAssembly',  4),
  ('ebpf',        'eBPF',         5)
) AS t(name, label, sort_order)
WHERE d.name = 'systems'
ON CONFLICT (name) DO NOTHING;

-- Blockchain
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('solidity',    'Solidity',     1),
  ('ethers_js',   'ethers.js',    2),
  ('hardhat',     'Hardhat',      3),
  ('web3',        'Web3.js',      4)
) AS t(name, label, sort_order)
WHERE d.name = 'blockchain'
ON CONFLICT (name) DO NOTHING;

-- Game Dev
INSERT INTO lookups.tech_stacks (domain_id, name, label, sort_order)
SELECT d.id, t.name, t.label, t.sort_order FROM lookups.domains d,
(VALUES
  ('unity',       'Unity',        1),
  ('unreal',      'Unreal Engine',2),
  ('godot',       'Godot',        3)
) AS t(name, label, sort_order)
WHERE d.name = 'gaming'
ON CONFLICT (name) DO NOTHING;
