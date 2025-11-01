# Development Environment Configuration

environment = "dev"
aws_region  = "us-east-1"

# Rate limiting (more permissive for dev)
rate_limit_per_minute = 100
rate_limit_per_hour   = 5000
rate_limit_burst      = 200

# Lambda configuration
lambda_memory_size       = 512
lambda_memory_size_large = 1024
log_level                = "DEBUG"
log_retention_days       = 7

# DynamoDB configuration
dynamodb_billing_mode = "PAY_PER_REQUEST"
enable_autoscaling    = false

# Backup configuration (disabled for dev)
enable_backup                  = false
enable_point_in_time_recovery  = false

# CDN configuration
cdn_price_class = "PriceClass_100"
cdn_default_ttl = 300  # 5 minutes
cdn_max_ttl     = 3600 # 1 hour

# Monitoring
api_5xx_error_threshold      = 20
api_latency_threshold_ms     = 15000
lambda_error_threshold       = 10
lambda_duration_threshold_ms = 15000
fraud_attempts_threshold     = 50

# Provisioned concurrency (disabled for dev)
enable_provisioned_concurrency = false

# Cache (disabled for dev)
enable_cache = false

# Audio retention
audio_retention_days = 7

# Tags
project_tags = {
  Project     = "VoiceLiveness-Onboarder"
  Environment = "dev"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
}
