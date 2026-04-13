-- Seed: lookups.tech_stacks
-- subdomain_id resolved via subquery on lookups.subdomains.name
-- Run after subdomains_seed.sql
INSERT INTO lookups.tech_stacks (subdomain_id, name, label, sort_order) VALUES

-- ── Frontend › UI Frameworks ──────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'), 'react',          'React',          1),
((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'), 'vue',            'Vue.js',         2),
((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'), 'angular',        'Angular',        3),
((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'), 'svelte',         'Svelte',         4),
((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'), 'solidjs',        'Solid.js',       5),
((SELECT id FROM lookups.subdomains WHERE name = 'ui_frameworks'), 'qwik',           'Qwik',           6),

-- ── Frontend › Meta Frameworks ────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'nextjs',       'Next.js',        1),
((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'nuxtjs',       'Nuxt.js',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'sveltekit',    'SvelteKit',      3),
((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'astro',        'Astro',          4),
((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'remix',        'Remix',          5),
((SELECT id FROM lookups.subdomains WHERE name = 'meta_frameworks'), 'tanstack_start','TanStack Start', 6),

-- ── Frontend › Styling ────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'styling'), 'tailwindcss',          'Tailwind CSS',   1),
((SELECT id FROM lookups.subdomains WHERE name = 'styling'), 'css_modules',          'CSS Modules',    2),
((SELECT id FROM lookups.subdomains WHERE name = 'styling'), 'sass',                 'Sass / SCSS',    3),
((SELECT id FROM lookups.subdomains WHERE name = 'styling'), 'styled_components',    'styled-components',4),
((SELECT id FROM lookups.subdomains WHERE name = 'styling'), 'shadcn_ui',            'shadcn/ui',      5),

-- ── Frontend › Build Tools ────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'), 'vite',             'Vite',           1),
((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'), 'webpack',          'Webpack',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'), 'esbuild',          'esbuild',        3),
((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'), 'turbopack',        'Turbopack',      4),
((SELECT id FROM lookups.subdomains WHERE name = 'build_tools'), 'rollup',           'Rollup',         5),

-- ── Frontend › Testing ────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'), 'playwright',        'Playwright',     1),
((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'), 'cypress',           'Cypress',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'), 'vitest',            'Vitest',         3),
((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'), 'jest',              'Jest',           4),
((SELECT id FROM lookups.subdomains WHERE name = 'fe_testing'), 'storybook',         'Storybook',      5),

-- ── Backend › Languages ───────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'nodejs',          'Node.js',        1),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'python',          'Python',         2),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'go',              'Go',             3),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'java',            'Java',           4),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'rust',            'Rust',           5),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'csharp',          'C#',             6),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'ruby',            'Ruby',           7),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'php',             'PHP',            8),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'elixir',          'Elixir',         9),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'kotlin_be',       'Kotlin',        10),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'scala',           'Scala',         11),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'bun',             'Bun',           12),
((SELECT id FROM lookups.subdomains WHERE name = 'be_languages'), 'deno',            'Deno',          13),

-- ── Backend › Frameworks ──────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'express',        'Express',        1),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'fastify',        'Fastify',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'hono',           'Hono',           3),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'fastapi',        'FastAPI',        4),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'django',         'Django',         5),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'flask',          'Flask',          6),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'spring_boot',    'Spring Boot',    7),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'aspnet_core',    'ASP.NET Core',   8),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'gin',            'Gin',            9),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'axum',           'Axum',          10),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'rails',          'Rails',         11),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'phoenix',        'Phoenix',       12),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'nestjs',         'NestJS',        13),
((SELECT id FROM lookups.subdomains WHERE name = 'be_frameworks'), 'fiber',          'Fiber (Go)',    14),

-- ── Backend › API & Protocols ─────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'), 'rest',           'REST',           1),
((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'), 'graphql',        'GraphQL',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'), 'grpc',           'gRPC',           3),
((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'), 'trpc',           'tRPC',           4),
((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'), 'websockets',     'WebSockets',     5),
((SELECT id FROM lookups.subdomains WHERE name = 'api_protocols'), 'openapi',        'OpenAPI',        6),

-- ── Backend › Queues & Cache ──────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'), 'redis',           'Redis',          1),
((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'), 'kafka',           'Apache Kafka',   2),
((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'), 'rabbitmq',        'RabbitMQ',       3),
((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'), 'bullmq',          'BullMQ',         4),
((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'), 'celery',          'Celery',         5),
((SELECT id FROM lookups.subdomains WHERE name = 'queues_cache'), 'nats',            'NATS',           6),

-- ── DevOps › Cloud Providers ──────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'aws',          'AWS',            1),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'azure',        'Azure',          2),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'gcp',          'GCP',            3),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'cloudflare',   'Cloudflare',     4),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'vercel',       'Vercel',         5),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'railway',      'Railway',        6),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_providers'), 'fly_io',       'Fly.io',         7),

-- ── DevOps › Containers & K8s ────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'containers'), 'docker',            'Docker',         1),
((SELECT id FROM lookups.subdomains WHERE name = 'containers'), 'kubernetes',        'Kubernetes',     2),
((SELECT id FROM lookups.subdomains WHERE name = 'containers'), 'helm',              'Helm',           3),
((SELECT id FROM lookups.subdomains WHERE name = 'containers'), 'podman',            'Podman',         4),
((SELECT id FROM lookups.subdomains WHERE name = 'containers'), 'containerd',        'containerd',     5),

-- ── DevOps › CI / CD ─────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'cicd'), 'github_actions',          'GitHub Actions', 1),
((SELECT id FROM lookups.subdomains WHERE name = 'cicd'), 'gitlab_ci',               'GitLab CI',      2),
((SELECT id FROM lookups.subdomains WHERE name = 'cicd'), 'argocd',                  'ArgoCD',         3),
((SELECT id FROM lookups.subdomains WHERE name = 'cicd'), 'jenkins',                 'Jenkins',        4),
((SELECT id FROM lookups.subdomains WHERE name = 'cicd'), 'circleci',                'CircleCI',       5),

-- ── DevOps › IaC ─────────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'iac'), 'terraform',                'Terraform',      1),
((SELECT id FROM lookups.subdomains WHERE name = 'iac'), 'bicep',                    'Bicep',          2),
((SELECT id FROM lookups.subdomains WHERE name = 'iac'), 'pulumi',                   'Pulumi',         3),
((SELECT id FROM lookups.subdomains WHERE name = 'iac'), 'ansible',                  'Ansible',        4),
((SELECT id FROM lookups.subdomains WHERE name = 'iac'), 'cdk',                      'AWS CDK',        5),

-- ── DevOps › Observability ────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'observability'), 'prometheus',     'Prometheus',     1),
((SELECT id FROM lookups.subdomains WHERE name = 'observability'), 'grafana',        'Grafana',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'observability'), 'datadog',        'Datadog',        3),
((SELECT id FROM lookups.subdomains WHERE name = 'observability'), 'sentry',         'Sentry',         4),
((SELECT id FROM lookups.subdomains WHERE name = 'observability'), 'opentelemetry',  'OpenTelemetry',  5),
((SELECT id FROM lookups.subdomains WHERE name = 'observability'), 'new_relic',      'New Relic',      6),

-- ── Mobile › iOS ─────────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'ios'), 'swift',                    'Swift',          1),
((SELECT id FROM lookups.subdomains WHERE name = 'ios'), 'swiftui',                  'SwiftUI',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'ios'), 'uikit',                    'UIKit',          3),
((SELECT id FROM lookups.subdomains WHERE name = 'ios'), 'xcode',                    'Xcode',          4),

-- ── Mobile › Android ──────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'android'), 'kotlin',               'Kotlin',         1),
((SELECT id FROM lookups.subdomains WHERE name = 'android'), 'jetpack_compose',      'Jetpack Compose',2),
((SELECT id FROM lookups.subdomains WHERE name = 'android'), 'android_sdk',          'Android SDK',    3),

-- ── Mobile › Cross-Platform ───────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'), 'react_native',  'React Native',   1),
((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'), 'flutter',       'Flutter',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'), 'expo',          'Expo',           3),
((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'), 'ionic',         'Ionic',          4),
((SELECT id FROM lookups.subdomains WHERE name = 'cross_platform'), 'capacitor',     'Capacitor',      5),

-- ── AI/ML › ML Frameworks ─────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'), 'pytorch',        'PyTorch',        1),
((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'), 'tensorflow',     'TensorFlow',     2),
((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'), 'jax',            'JAX',            3),
((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'), 'keras',          'Keras',          4),
((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'), 'scikit_learn',   'scikit-learn',   5),
((SELECT id FROM lookups.subdomains WHERE name = 'ml_frameworks'), 'xgboost',        'XGBoost',        6),

-- ── AI/ML › NLP & LLMs ───────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'), 'huggingface',         'Hugging Face',   1),
((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'), 'langchain',           'LangChain',      2),
((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'), 'llamaindex',          'LlamaIndex',     3),
((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'), 'openai_api',          'OpenAI API',     4),
((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'), 'anthropic_api',       'Anthropic API',  5),
((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'), 'groq',                'Groq',           6),
((SELECT id FROM lookups.subdomains WHERE name = 'nlp_llms'), 'ollama',              'Ollama',         7),

-- ── AI/ML › MLOps ────────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'mlops'), 'mlflow',                 'MLflow',         1),
((SELECT id FROM lookups.subdomains WHERE name = 'mlops'), 'wandb',                  'Weights & Biases',2),
((SELECT id FROM lookups.subdomains WHERE name = 'mlops'), 'dvc',                    'DVC',            3),
((SELECT id FROM lookups.subdomains WHERE name = 'mlops'), 'onnx',                   'ONNX',           4),
((SELECT id FROM lookups.subdomains WHERE name = 'mlops'), 'tensorrt',               'TensorRT',       5),
((SELECT id FROM lookups.subdomains WHERE name = 'mlops'), 'ray',                    'Ray',            6),

-- ── AI/ML › Data Science ──────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'data_science'), 'pandas',          'Pandas',         1),
((SELECT id FROM lookups.subdomains WHERE name = 'data_science'), 'numpy',           'NumPy',          2),
((SELECT id FROM lookups.subdomains WHERE name = 'data_science'), 'polars',          'Polars',         3),
((SELECT id FROM lookups.subdomains WHERE name = 'data_science'), 'jupyter',         'Jupyter',        4),
((SELECT id FROM lookups.subdomains WHERE name = 'data_science'), 'matplotlib',      'Matplotlib',     5),
((SELECT id FROM lookups.subdomains WHERE name = 'data_science'), 'seaborn',         'Seaborn',        6),

-- ── Data › Databases ──────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'), 'postgresql_de', 'PostgreSQL',     1),
((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'), 'cassandra',     'Cassandra',      2),
((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'), 'dynamodb',      'DynamoDB',       3),
((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'), 'elasticsearch', 'Elasticsearch',  4),
((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'), 'clickhouse',    'ClickHouse',     5),
((SELECT id FROM lookups.subdomains WHERE name = 'data_databases'), 'timescaledb',   'TimescaleDB',    6),

-- ── Data › Data Warehouses ────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'snowflake',    'Snowflake',      1),
((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'bigquery',     'BigQuery',       2),
((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'redshift',     'Redshift',       3),
((SELECT id FROM lookups.subdomains WHERE name = 'data_warehouses'), 'databricks',   'Databricks',     4),

-- ── Data › Processing ─────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'spark',        'Apache Spark',   1),
((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'flink',        'Apache Flink',   2),
((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'dbt',          'dbt',            3),
((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'airflow',      'Apache Airflow', 4),
((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'prefect',      'Prefect',        5),
((SELECT id FROM lookups.subdomains WHERE name = 'data_processing'), 'dagster',      'Dagster',        6),

-- ── Data › Visualization ──────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'), 'tableau',             'Tableau',        1),
((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'), 'looker',              'Looker',         2),
((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'), 'metabase',            'Metabase',       3),
((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'), 'superset',            'Apache Superset',4),
((SELECT id FROM lookups.subdomains WHERE name = 'data_viz'), 'grafana_de',          'Grafana',        5),

-- ── Security › AppSec ─────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'appsec'), 'owasp',                 'OWASP',          1),
((SELECT id FROM lookups.subdomains WHERE name = 'appsec'), 'burp_suite',            'Burp Suite',     2),
((SELECT id FROM lookups.subdomains WHERE name = 'appsec'), 'snyk',                  'Snyk',           3),
((SELECT id FROM lookups.subdomains WHERE name = 'appsec'), 'sonarqube',             'SonarQube',      4),
((SELECT id FROM lookups.subdomains WHERE name = 'appsec'), 'semgrep',               'Semgrep',        5),

-- ── Security › Cloud Security ─────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'), 'iam',           'IAM',            1),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'), 'zero_trust',    'Zero Trust',     2),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'), 'vault',         'HashiCorp Vault',3),
((SELECT id FROM lookups.subdomains WHERE name = 'cloud_security'), 'waf',           'WAF',            4),

-- ── Security › Cryptography ───────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'), 'tls_ssl',         'TLS / SSL',      1),
((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'), 'jwt',             'JWT',            2),
((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'), 'oauth2',          'OAuth 2.0',      3),
((SELECT id FROM lookups.subdomains WHERE name = 'cryptography'), 'oidc',            'OpenID Connect', 4),

-- ── Security › Pentesting ─────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'), 'metasploit',        'Metasploit',     1),
((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'), 'nmap',              'Nmap',           2),
((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'), 'wireshark',         'Wireshark',      3),
((SELECT id FROM lookups.subdomains WHERE name = 'pentesting'), 'kali_linux',        'Kali Linux',     4),

-- ── Systems › Languages ───────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'), 'c',              'C',              1),
((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'), 'cpp',            'C++',            2),
((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'), 'rust_sys',       'Rust',           3),
((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'), 'assembly',       'Assembly',       4),
((SELECT id FROM lookups.subdomains WHERE name = 'sys_languages'), 'zig',            'Zig',            5),

-- ── Systems › Embedded ────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'embedded'), 'arduino',             'Arduino',        1),
((SELECT id FROM lookups.subdomains WHERE name = 'embedded'), 'freertos',            'FreeRTOS',       2),
((SELECT id FROM lookups.subdomains WHERE name = 'embedded'), 'zephyr',              'Zephyr RTOS',    3),
((SELECT id FROM lookups.subdomains WHERE name = 'embedded'), 'raspberry_pi',        'Raspberry Pi',   4),
((SELECT id FROM lookups.subdomains WHERE name = 'embedded'), 'esp32',               'ESP32',          5),

-- ── Systems › OS & Kernel ─────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'), 'linux_kernel',       'Linux Kernel',   1),
((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'), 'ebpf',               'eBPF',           2),
((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'), 'freebsd',            'FreeBSD',        3),
((SELECT id FROM lookups.subdomains WHERE name = 'os_kernel'), 'wasm',               'WebAssembly',    4),

-- ── Systems › Networking ──────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'networking'), 'tcp_ip',            'TCP / IP',       1),
((SELECT id FROM lookups.subdomains WHERE name = 'networking'), 'quic',              'QUIC',           2),
((SELECT id FROM lookups.subdomains WHERE name = 'networking'), 'dpdk',              'DPDK',           3),

-- ── Blockchain › EVM Chains ───────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'evm'), 'ethereum',                 'Ethereum',       1),
((SELECT id FROM lookups.subdomains WHERE name = 'evm'), 'polygon',                  'Polygon',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'evm'), 'arbitrum',                 'Arbitrum',       3),
((SELECT id FROM lookups.subdomains WHERE name = 'evm'), 'optimism',                 'Optimism',       4),
((SELECT id FROM lookups.subdomains WHERE name = 'evm'), 'base',                     'Base',           5),

-- ── Blockchain › Non-EVM Chains ───────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'), 'solana',               'Solana',         1),
((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'), 'bitcoin',              'Bitcoin',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'), 'polkadot',             'Polkadot',       3),
((SELECT id FROM lookups.subdomains WHERE name = 'non_evm'), 'cosmos',               'Cosmos',         4),

-- ── Blockchain › Web3 Tools ───────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'), 'ipfs',              'IPFS',           1),
((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'), 'the_graph',         'The Graph',      2),
((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'), 'wagmi',             'wagmi',          3),
((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'), 'ethers_js',         'ethers.js',      4),
((SELECT id FROM lookups.subdomains WHERE name = 'web3_tools'), 'viem',              'viem',           5),

-- ── Blockchain › Smart Contracts ──────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'solidity',     'Solidity',       1),
((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'hardhat',      'Hardhat',        2),
((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'foundry',      'Foundry',        3),
((SELECT id FROM lookups.subdomains WHERE name = 'smart_contracts'), 'vyper',        'Vyper',          4),

-- ── Gaming › Game Engines ─────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'), 'unity',           'Unity',          1),
((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'), 'unreal',          'Unreal Engine',  2),
((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'), 'godot',           'Godot',          3),
((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'), 'bevy',            'Bevy',           4),
((SELECT id FROM lookups.subdomains WHERE name = 'game_engines'), 'pygame',          'pygame',         5),

-- ── Gaming › Graphics APIs ────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'graphics'), 'opengl',              'OpenGL',         1),
((SELECT id FROM lookups.subdomains WHERE name = 'graphics'), 'vulkan',              'Vulkan',         2),
((SELECT id FROM lookups.subdomains WHERE name = 'graphics'), 'webgl',               'WebGL',          3),
((SELECT id FROM lookups.subdomains WHERE name = 'graphics'), 'metal',               'Metal',          4),
((SELECT id FROM lookups.subdomains WHERE name = 'graphics'), 'directx',             'DirectX',        5),
((SELECT id FROM lookups.subdomains WHERE name = 'graphics'), 'webgpu',              'WebGPU',         6),

-- ── Gaming › Languages ────────────────────────────────────────────────────────
((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'), 'csharp_game',   'C#',             1),
((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'), 'cpp_game',      'C++',            2),
((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'), 'gdscript',      'GDScript',       3),
((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'), 'lua',           'Lua',            4),
((SELECT id FROM lookups.subdomains WHERE name = 'game_languages'), 'blueprint',     'Blueprint',      5)

ON CONFLICT (name) DO NOTHING;
