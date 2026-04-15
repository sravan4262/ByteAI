-- Seed: interviews.roles
-- Major tech roles across all domains
INSERT INTO interviews.roles (name) VALUES
  -- Software Engineering (Engineer is standard in industry)
  ('Software Engineer'),
  ('Software Developer'),
  ('Senior Software Engineer'),
  ('Senior Software Developer'),
  ('Staff Engineer'),
  ('Principal Engineer'),
  ('Engineering Manager'),
  ('VP of Engineering'),
  ('CTO'),

  -- Frontend (both titles widely used)
  ('Frontend Engineer'),
  ('Frontend Developer'),
  ('Senior Frontend Engineer'),
  ('Senior Frontend Developer'),
  ('UI Engineer'),
  ('UI Developer'),

  -- Backend (both titles widely used)
  ('Backend Engineer'),
  ('Backend Developer'),
  ('Senior Backend Engineer'),
  ('Senior Backend Developer'),

  -- Full Stack (both titles widely used)
  ('Full Stack Engineer'),
  ('Full Stack Developer'),
  ('Senior Full Stack Engineer'),
  ('Senior Full Stack Developer'),

  -- Mobile (Engineer is more common; Developer used at some companies)
  ('iOS Engineer'),
  ('iOS Developer'),
  ('Android Engineer'),
  ('Android Developer'),
  ('Mobile Engineer'),
  ('Mobile Developer'),
  ('Senior Mobile Engineer'),
  ('Senior Mobile Developer'),

  -- Data (Engineer / Scientist / Analyst distinctions are meaningful)
  ('Data Engineer'),
  ('Senior Data Engineer'),
  ('Data Analyst'),
  ('Analytics Engineer'),
  ('Data Scientist'),
  ('Senior Data Scientist'),
  ('ML Engineer'),
  ('Senior ML Engineer'),
  ('AI Engineer'),
  ('Research Scientist'),

  -- Platform / Infra / DevOps (Engineer is dominant here)
  ('DevOps Engineer'),
  ('Site Reliability Engineer'),
  ('Platform Engineer'),
  ('Infrastructure Engineer'),
  ('Cloud Engineer'),
  ('Solutions Architect'),

  -- Security (Engineer is dominant; Analyst is a distinct role)
  ('Security Engineer'),
  ('Application Security Engineer'),
  ('Security Analyst'),

  -- Product & Design
  ('Product Manager'),
  ('Senior Product Manager'),
  ('Principal Product Manager'),
  ('Product Designer'),
  ('UX Designer'),
  ('UX Researcher'),

  -- QA (Engineer and Developer both used; SDET is its own title)
  ('QA Engineer'),
  ('QA Developer'),
  ('SDET'),
  ('Automation Engineer'),

  -- Leadership
  ('Engineering Lead'),
  ('Technical Lead'),
  ('Tech Lead Manager')

ON CONFLICT (name) DO NOTHING;
