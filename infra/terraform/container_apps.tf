# ── byteai-api (internal — only reachable by the gateway) ───────────────────
resource "azurerm_container_app" "api" {
  name                         = "${var.prefix}-api"
  container_app_environment_id = azurerm_container_app_environment.byteai.id
  resource_group_name          = azurerm_resource_group.byteai.name
  revision_mode                = "Multiple" # Required for blue-green labeled revisions
  tags                         = var.tags

  # Secrets — referenced by env var bindings below
  secret {
    name  = "database-url"
    value = var.database_url
  }
  secret {
    name  = "clerk-authority"
    value = var.clerk_authority
  }
  secret {
    name  = "groq-api-key"
    value = var.groq_api_key
  }

  dynamic "secret" {
    for_each = var.redis_url != "" ? [1] : []
    content {
      name  = "redis-url"
      value = var.redis_url
    }
  }

  ingress {
    external_enabled = false # internal only — gateway is the public-facing entry point
    target_port      = 8080
    transport        = "http"

    traffic_weight {
      label           = "blue"
      percentage      = 100
      latest_revision = false
    }
  }

  template {
    revision_suffix = "blue" # initial revision; CD swaps between blue/green

    min_replicas = 1
    max_replicas = 3

    container {
      name   = "byteai-api"
      image  = var.api_image
      cpu    = 0.5
      memory = "1Gi"

      env {
        name        = "ConnectionStrings__Postgres"
        secret_name = "database-url"
      }
      env {
        name        = "Clerk__Authority"
        secret_name = "clerk-authority"
      }
      env {
        name        = "Groq__ApiKey"
        secret_name = "groq-api-key"
      }
      env {
        name  = "Cors__AllowedOrigin"
        value = var.cors_allowed_origin
      }

      dynamic "env" {
        for_each = var.redis_url != "" ? [1] : []
        content {
          name        = "ConnectionStrings__Redis"
          secret_name = "redis-url"
        }
      }

      liveness_probe {
        path             = "/health/live"
        port             = 8080
        transport        = "HTTP"
        initial_delay    = 15
        interval_seconds = 30
        failure_count_threshold = 3
      }

      readiness_probe {
        path             = "/health/ready"
        port             = 8080
        transport        = "HTTP"
        initial_delay    = 20
        interval_seconds = 15
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

  secret {
    name  = "api-keys"
    value = var.api_keys
  }

  ingress {
    external_enabled = true
    target_port      = 8090
    transport        = "http"

    traffic_weight {
      label           = "blue"
      percentage      = 100
      latest_revision = false
    }
  }

  template {
    revision_suffix = "blue"

    min_replicas = 1
    max_replicas = 3

    container {
      name   = "byteai-gateway"
      image  = var.gateway_image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        # Internal hostname: Container Apps DNS resolves app-name within the same environment
        name  = "ApiUpstreamUrl"
        value = "http://${azurerm_container_app.api.name}"
      }
      env {
        # Comma-separated API keys for the ApiKeyMiddleware
        name        = "ApiKeys"
        secret_name = "api-keys"
      }

      liveness_probe {
        path             = "/health/live"
        port             = 8090
        transport        = "HTTP"
        initial_delay    = 10
        interval_seconds = 30
        failure_count_threshold = 3
      }

      readiness_probe {
        path             = "/health/ready"
        port             = 8090
        transport        = "HTTP"
        initial_delay    = 15
        interval_seconds = 15
        failure_count_threshold = 3
        success_count_threshold = 1
      }
    }
  }
}
