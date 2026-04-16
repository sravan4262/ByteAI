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

  app_settings = {
    CLERK_SECRET_KEY                  = var.clerk_secret_key
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = var.clerk_publishable_key
    NEXT_PUBLIC_API_URL               = var.cors_allowed_origin
  }
}
