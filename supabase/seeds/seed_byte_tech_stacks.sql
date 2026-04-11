-- ByteAI Seed Byte Tech Stacks
-- Links seed bytes to their tech stacks via the normalized junction table
-- Tech stack IDs looked up by name from lookups.tech_stacks
INSERT INTO bytes.byte_tech_stacks (byte_id, tech_stack_id)
SELECT b.id, ts.id FROM (VALUES
  -- React bytes
  ('10000000-0000-0000-0000-000000000001', 'react'),
  ('10000000-0000-0000-0000-000000000002', 'react'),
  -- TypeScript bytes
  ('10000000-0000-0000-0000-000000000003', 'typescript'),
  ('10000000-0000-0000-0000-000000000004', 'typescript'),
  -- Next.js bytes
  ('10000000-0000-0000-0000-000000000005', 'next_js'),
  ('10000000-0000-0000-0000-000000000006', 'next_js'),
  -- Kubernetes bytes
  ('10000000-0000-0000-0000-000000000007', 'kubernetes'),
  ('10000000-0000-0000-0000-000000000008', 'kubernetes'),
  -- AWS bytes
  ('10000000-0000-0000-0000-000000000009', 'aws'),
  ('10000000-0000-0000-0000-000000000010', 'aws'),
  -- Docker bytes
  ('10000000-0000-0000-0000-000000000011', 'docker'),
  ('10000000-0000-0000-0000-000000000012', 'docker')
) AS m(byte_id, stack_name)
JOIN bytes.bytes b       ON b.id = m.byte_id::uuid
JOIN lookups.tech_stacks ts ON ts.name = m.stack_name
ON CONFLICT DO NOTHING;
