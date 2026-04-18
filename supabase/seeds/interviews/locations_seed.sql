-- Seed: interviews.locations
-- Major US tech-hub cities
INSERT INTO interviews.locations (name, country) VALUES
  ('San Francisco',   'United States'),
  ('San Jose',        'United States'),
  ('Seattle',         'United States'),
  ('New York',        'United States'),
  ('Austin',          'United States'),
  ('Boston',          'United States'),
  ('Chicago',         'United States'),
  ('Los Angeles',     'United States'),
  ('Denver',          'United States'),
  ('Atlanta',         'United States'),
  ('Washington DC',   'United States'),
  ('Dallas',          'United States'),
  ('Pittsburgh',      'United States'),
  ('Philadelphia',    'United States'),
  ('Raleigh',         'United States'),
  ('Miami',           'United States'),
  ('Portland',        'United States'),
  ('Salt Lake City',  'United States'),
  ('Minneapolis',     'United States'),
  ('Phoenix',         'United States'),
  ('Remote',          'United States')

ON CONFLICT (name) DO NOTHING;
