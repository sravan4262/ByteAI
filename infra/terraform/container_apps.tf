# ── byteai-api (internal — only reachable by the gateway) ───────────────────
resource "azurerm_container_app" "api" {
  name                         = "${var.prefix}-api"
  container_app_environment_id = azurerm_container_app_environment.byteai.id
  resource_group_name          = azurerm_resource_group.byteai.name
  revision_mode                = "Multiple" # Required for blue-green labeled revisions
  tags                         = var.tags

  # CD pipeline owns: image, env vars, secrets, revision suffix, and traffic weights.
  # Terraform owns:   min/max replicas, CPU, memory, health probes, ingress structure.
  #
  # image + env are ignored so a plain `terraform apply` never resets the live image
  # to the placeholder default or clears CD-managed env vars.
  # ingress is ignored so Terraform never resets label-based traffic splits.
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      template[0].container[0].env,
      secret,
      ingress,
    ]
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
    min_replicas = 1
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

  # CD pipeline owns: image, env vars, secrets, revision suffix, and traffic weights.
  # Terraform owns:   min/max replicas, CPU, memory, health probes, ingress structure.
  lifecycle {
    ignore_changes = [
      template[0].container[0].image,
      template[0].container[0].env,
      secret,
      ingress,
    ]
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
    min_replicas = 1
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
