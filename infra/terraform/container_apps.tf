# ── byteai-api (internal — only reachable by the gateway) ───────────────────
resource "azurerm_container_app" "api" {
  name                         = "${var.prefix}-api"
  container_app_environment_id = azurerm_container_app_environment.byteai.id
  resource_group_name          = azurerm_resource_group.byteai.name
  revision_mode                = "Multiple" # Required for blue-green labeled revisions
  tags                         = var.tags

  # CD pipeline owns the image, env vars, secrets, and revision suffix — Terraform must not overwrite them
  lifecycle {
    ignore_changes = [template, secret]
  }

  ingress {
    external_enabled = false # internal only — gateway is the public-facing entry point
    target_port      = 8080
    transport        = "http"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "byteai-api"
      image  = var.api_image
      cpu    = 0.5
      memory = "1Gi"

      liveness_probe {
        path                    = "/health/live"
        port                    = 8080
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }

      readiness_probe {
        path                    = "/health/ready"
        port                    = 8080
        transport               = "HTTP"
        interval_seconds        = 15
        failure_count_threshold = 3
        success_count_threshold = 1
      }
    }
  }
}

# ── byteai-gateway (external — YARP reverse proxy + API-key validation) ──────
resource "azurerm_container_app" "gateway" {
  name                         = "${var.prefix}-gateway"
  container_app_environment_id = azurerm_container_app_environment.byteai.id
  resource_group_name          = azurerm_resource_group.byteai.name
  revision_mode                = "Multiple"
  tags                         = var.tags

  # CD pipeline owns the image, env vars, secrets, and revision suffix — Terraform must not overwrite them
  lifecycle {
    ignore_changes = [template, secret]
  }

  ingress {
    external_enabled = true
    target_port      = 8090
    transport        = "http"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "byteai-gateway"
      image  = var.gateway_image
      cpu    = 0.25
      memory = "0.5Gi"

      liveness_probe {
        path                    = "/health/live"
        port                    = 8090
        transport               = "HTTP"
        interval_seconds        = 30
        failure_count_threshold = 3
      }

      readiness_probe {
        path                    = "/health/ready"
        port                    = 8090
        transport               = "HTTP"
        interval_seconds        = 15
        failure_count_threshold = 3
        success_count_threshold = 1
      }
    }
  }
}
