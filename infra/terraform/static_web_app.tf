# Standard SKU is required for:
#   - Custom domains with managed TLS certificates
#   - Staging / preview environments (used for blue-green)
#   - SLA guarantees
resource "azurerm_static_web_app" "ui" {
  name                = "${var.prefix}-ui"
  resource_group_name = azurerm_resource_group.byteai.name
  location            = var.location
  sku_tier            = "Standard"
  sku_size            = "Standard"
  tags                = var.tags

  # Runtime app settings are managed by cd-frontend.yml via:
  # az staticwebapp appsettings set --name byteai-ui ...
  # This keeps secrets out of Terraform state.
}
