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

# ── App config ───────────────────────────────────────────────────────────────

variable "custom_domain" {
  type        = string
  default     = ""
  description = "Your apex domain, e.g. yourdomain.com. Leave empty to skip custom domain setup."
}
