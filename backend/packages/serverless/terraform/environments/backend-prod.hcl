# Production Backend Configuration

bucket         = "vlo-terraform-state-prod"
key            = "prod/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "vlo-terraform-locks-prod"
