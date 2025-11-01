# Terraform Backend Configuration
# This file configures remote state storage in S3 with DynamoDB locking

terraform {
  backend "s3" {
    # Backend configuration is provided via backend config files
    # Use: terraform init -backend-config=environments/backend-dev.hcl
  }
}
