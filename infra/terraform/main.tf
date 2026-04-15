terraform {
  required_version = ">= 1.6"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }

  # Remote state stored in Azure Blob Storage.
  # Create this storage account once manually before running `terraform init`:
  #   az group create -n byteai-tfstate-rg -l eastus
  #   az storage account create -n byteaitfstate -g byteai-tfstate-rg -l eastus --sku Standard_LRS
  #   az storage container create -n tfstate --account-name byteaitfstate
  backend "azurerm" {
    resource_group_name  = "byteai-tfstate-rg"
    storage_account_name = "byteaitfstate"
    container_name       = "tfstate"
    key                  = "byteai.terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "byteai" {
  name     = "${var.prefix}-rg"
  location = var.location
  tags     = var.tags
}
