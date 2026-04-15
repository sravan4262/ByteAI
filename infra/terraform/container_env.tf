resource "azurerm_log_analytics_workspace" "byteai" {
  name                = "${var.prefix}-logs"
  location            = azurerm_resource_group.byteai.location
  resource_group_name = azurerm_resource_group.byteai.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_container_app_environment" "byteai" {
  name                       = "${var.prefix}-env"
  location                   = azurerm_resource_group.byteai.location
  resource_group_name        = azurerm_resource_group.byteai.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.byteai.id
  tags                       = var.tags
}
