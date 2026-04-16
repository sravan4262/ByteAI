-- Seed: lookups.companies (top 50 tech companies)
INSERT INTO lookups.companies (name) VALUES
  -- FAANG / Big Tech
  ('Google'),
  ('Meta'),
  ('Apple'),
  ('Amazon'),
  ('Microsoft'),
  ('Netflix'),
  -- Cloud & Infrastructure
  ('Cloudflare'),
  ('Snowflake'),
  ('Databricks'),
  ('HashiCorp'),
  ('Datadog'),
  ('Vercel'),
  ('Supabase'),
  -- AI
  ('OpenAI'),
  ('Anthropic'),
  ('Hugging Face'),
  ('Mistral AI'),
  ('Cohere'),
  -- Chip / Hardware
  ('Nvidia'),
  ('Intel'),
  ('AMD'),
  ('Qualcomm'),
  -- Enterprise SaaS
  ('Salesforce'),
  ('Oracle'),
  ('IBM'),
  ('ServiceNow'),
  ('Workday'),
  ('Palantir'),
  ('CrowdStrike'),
  ('Splunk'),
  -- Developer Tools
  ('GitHub'),
  ('GitLab'),
  ('Atlassian'),
  ('JetBrains'),
  ('Linear'),
  ('Notion'),
  ('Figma'),
  -- Fintech
  ('Stripe'),
  ('Coinbase'),
  ('Block'),
  ('PayPal'),
  ('Robinhood'),
  ('Plaid'),
  -- Consumer / Marketplace
  ('Uber'),
  ('Airbnb'),
  ('DoorDash'),
  ('Shopify'),
  ('Instacart'),
  -- Gaming
  ('Epic Games'),
  ('Roblox')
ON CONFLICT (name) DO NOTHING;
