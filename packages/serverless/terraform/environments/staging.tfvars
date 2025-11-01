# Staging Environment Configuration

environment = "staging"
aws_region  = "us-east-1"

# Rate limiting
rate_limit_per_minute = 60
rate_limit_per_hour   = 2000
rate_limit_burst      = 100

# Lambda configuration
lambda_memory_size       = 512
lambda_memory_size_large = 1024
log_level                = "INFO"
log_retention_days       = 14

# DynamoDB configuration
dynamodb_billing_mode = "PAY_PER_REQUEST"
enable_autoscaling    = false

# Backup configuration
enable_backup                  = true
enable_point_in_time_recovery  = true
backup_retention_days          = 14

# CDN configuration
cdn_price_class = "PriceClass_100"
cdn_default_ttl = 3600  # 1 hour
cdn_max_ttl     = 86400 # 24 hours

# Monitoring
api_5xx_error_threshold      = 15
api_latency_threshold_ms     = 12000
lambda_error_threshold       = 8
lambda_duration_threshold_ms = 12000
fraud_attempts_threshold     = 30

# Provisioned concurrency (minimal for staging)
enable_provisioned_concurrency = false

# Cache
enable_cache = true

# Audio retention
audio_retention_days = 30

# Tags
project_tags = {
  Project     = "VoiceLiveness-Onboarder"
  Environment = "staging"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
}
