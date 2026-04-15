output "swa_default_hostname" {
  value       = azurerm_static_web_app.ui.default_host_name
  description = "Set your CNAME @ record to this value at your DNS registrar."
}

output "swa_api_key" {
  value       = azurerm_static_web_app.ui.api_key
  sensitive   = true
  description = "Store as SWA_DEPLOY_TOKEN in GitHub Secrets."
}

output "gateway_fqdn" {
  value       = azurerm_container_app.gateway.latest_revision_fqdn
  description = "Set your CNAME api record to this value at your DNS registrar."
}

output "api_internal_fqdn" {
  value       = azurerm_container_app.api.latest_revision_fqdn
  description = "Internal FQDN of the API — only reachable within the Container Apps environment."
}

output "resource_group_name" {
  value = azurerm_resource_group.byteai.name
}

output "container_app_environment_id" {
  value = azurerm_container_app_environment.byteai.id
}
