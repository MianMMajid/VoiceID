# Development Backend Configuration

bucket         = "vlo-terraform-state-dev"
key            = "dev/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "vlo-terraform-locks-dev"
