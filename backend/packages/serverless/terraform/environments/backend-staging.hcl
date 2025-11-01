# Staging Backend Configuration

bucket         = "vlo-terraform-state-staging"
key            = "staging/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "vlo-terraform-locks-staging"
