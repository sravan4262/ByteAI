# Custom domain setup for the Static Web App (frontend).
# Only created when var.custom_domain is set.
#
# DNS records to add at your registrar BEFORE running terraform apply:
#   CNAME  @          →  <swa_default_hostname output>
#   CNAME  www        →  <swa_default_hostname output>
#
# Azure automatically provisions and renews a managed TLS certificate
# once the CNAME is propagated (usually within a few minutes).

resource "azurerm_static_web_app_custom_domain" "apex" {
  count             = var.custom_domain != "" ? 1 : 0
  static_web_app_id = azurerm_static_web_app.ui.id
  domain_name       = var.custom_domain
  validation_type   = "cname-delegation"
}

resource "azurerm_static_web_app_custom_domain" "www" {
  count             = var.custom_domain != "" ? 1 : 0
  static_web_app_id = azurerm_static_web_app.ui.id
  domain_name       = "www.${var.custom_domain}"
  validation_type   = "cname-delegation"
}

# Custom domain for the API gateway (api.yourdomain.com).
# DNS record to add at your registrar BEFORE running terraform apply:
#   CNAME  api  →  <gateway_fqdn output>
#
# Uncomment after the DNS CNAME has been verified and the gateway is healthy.
#
# resource "azurerm_container_app_custom_domain" "gateway_api" {
#   count            = var.custom_domain != "" ? 1 : 0
#   name             = "api.${var.custom_domain}"
#   container_app_id = azurerm_container_app.gateway.id
# }
