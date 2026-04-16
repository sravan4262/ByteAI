variable "location" {
  type        = string
  default     = "eastus2"
  description = "Azure region for all resources."
}

variable "prefix" {
  type        = string
  default     = "byteai"
  description = "Short prefix applied to every resource name."
}

variable "tags" {
  type = map(string)
  default = {
    project    = "ByteAI"
    managed_by = "terraform"
  }
}

# ── Container images (set at deploy time by GitHub Actions) ──────────────────

variable "api_image" {
  type        = string
  description = "Full API image ref, e.g. ghcr.io/owner/byteai-api:sha"
  default     = "mcr.microsoft.com/dotnet/samples:aspnetapp"
}

variable "gateway_image" {
  type        = string
  description = "Full Gateway image ref."
  default     = "mcr.microsoft.com/dotnet/samples:aspnetapp"
}

# ── Secrets (sensitive — pass via -var or CI environment) ────────────────────

variable "database_url" {
  type        = string
  sensitive   = true
  description = "Supabase PostgreSQL connection string (pooler URL)."
}

variable "clerk_authority" {
  type        = string
  sensitive   = true
  description = "Clerk JWT issuer URL, e.g. https://clerk.your-domain.com"
}

variable "clerk_secret_key" {
  type        = string
  sensitive   = true
  description = "Clerk secret key (sk_live_... or sk_test_...)"
}

variable "clerk_publishable_key" {
  type        = string
  sensitive   = true
  description = "Clerk publishable key (pk_live_... or pk_test_...)"
}

variable "groq_api_key" {
  type      = string
  sensitive = true
}

variable "api_keys" {
  type        = string
  sensitive   = true
  description = "Comma-separated API keys validated by the YARP gateway."
}

# ── App config ───────────────────────────────────────────────────────────────

variable "cors_allowed_origin" {
  type    = string
  default = "https://yourdomain.com"
}

variable "custom_domain" {
  type        = string
  default     = ""
  description = "Your apex domain, e.g. yourdomain.com. Leave empty to skip custom domain setup."
}

variable "frontend_url" {
  type        = string
  description = "SWA frontend URL — used as the CORS allowed origin on the gateway."
}
