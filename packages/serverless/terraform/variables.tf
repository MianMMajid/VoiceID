# Environment variables
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Rate limiting configuration
variable "rate_limit_per_minute" {
  description = "Rate limit per minute per client"
  type        = number
  default     = 60
}

variable "rate_limit_per_hour" {
  description = "Rate limit per hour per client"
  type        = number
  default     = 1000
}

variable "rate_limit_burst" {
  description = "Burst rate limit"
  type        = number
  default     = 100
}

# CORS configuration
variable "cors_allowed_origins" {
  description = "Allowed CORS origins"
  type        = list(string)
  default     = ["*"]
}

# Tags
variable "project_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "VoiceLiveness-Onboarder"
    ManagedBy   = "Terraform"
  }
}

# CDN configuration
variable "cdn_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100" # US, Canada, Europe
}

variable "cdn_default_ttl" {
  description = "Default TTL for CDN cache (seconds)"
  type        = number
  default     = 3600 # 1 hour
}

variable "cdn_max_ttl" {
  description = "Maximum TTL for CDN cache (seconds)"
  type        = number
  default     = 86400 # 24 hours
}

variable "cdn_geo_restriction_type" {
  description = "Geo restriction type (none, whitelist, blacklist)"
  type        = string
  default     = "none"
}

variable "cdn_geo_restriction_locations" {
  description = "List of country codes for geo restriction"
  type        = list(string)
  default     = []
}

variable "cdn_custom_domain" {
  description = "Custom domain for CDN (optional)"
  type        = string
  default     = ""
}

variable "cdn_certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = ""
}

variable "enable_signed_urls" {
  description = "Enable signed URLs for CDN"
  type        = bool
  default     = true
}

variable "cdn_public_key" {
  description = "Public key for CloudFront signed URLs (PEM format)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "audio_retention_days" {
  description = "Number of days to retain audio files"
  type        = number
  default     = 90
}

# TLS and encryption configuration
variable "custom_domain_name" {
  description = "Custom domain name for API Gateway (optional)"
  type        = string
  default     = ""
}

variable "certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  type        = string
  default     = ""
}

variable "enable_cache" {
  description = "Enable API Gateway caching"
  type        = bool
  default     = false
}

variable "kms_key_id" {
  description = "KMS key ID for encryption at rest"
  type        = string
  default     = ""
}

variable "enable_encryption" {
  description = "Enable encryption at rest for audio files"
  type        = bool
  default     = true
}

# Lambda configuration
variable "lambda_package_path" {
  description = "Path to Lambda deployment package"
  type        = string
  default     = "../dist/lambda.zip"
}

variable "lambda_layer_path" {
  description = "Path to Lambda layer package"
  type        = string
  default     = "../dist/layer.zip"
}

variable "lambda_memory_size" {
  description = "Memory size for standard Lambda functions (MB)"
  type        = number
  default     = 512
}

variable "lambda_memory_size_large" {
  description = "Memory size for large Lambda functions (MB)"
  type        = number
  default     = 1024
}

variable "lambda_memory_size_xlarge" {
  description = "Memory size for XL Lambda functions (MB)"
  type        = number
  default     = 3008
}

variable "spoof_detector_image_uri" {
  description = "ECR image URI for spoof detector Lambda"
  type        = string
  default     = ""
}

variable "enable_provisioned_concurrency" {
  description = "Enable provisioned concurrency for Lambda functions"
  type        = bool
  default     = false
}

variable "provisioned_concurrency" {
  description = "Number of provisioned concurrent executions"
  type        = number
  default     = 5
}

variable "enable_lambda_warming" {
  description = "Enable Lambda function pre-warming"
  type        = bool
  default     = true
}

variable "lambda_warming_schedule" {
  description = "CloudWatch Events schedule for Lambda warming (cron or rate expression)"
  type        = string
  default     = "rate(5 minutes)"
}

variable "lambda_warming_concurrency" {
  description = "Number of concurrent Lambda instances to keep warm"
  type        = number
  default     = 3
}

variable "log_level" {
  description = "Log level for Lambda functions"
  type        = string
  default     = "INFO"
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# DynamoDB configuration
variable "dynamodb_billing_mode" {
  description = "DynamoDB billing mode (PROVISIONED or PAY_PER_REQUEST)"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "sessions_read_capacity" {
  description = "Read capacity units for sessions table"
  type        = number
  default     = 5
}

variable "sessions_write_capacity" {
  description = "Write capacity units for sessions table"
  type        = number
  default     = 5
}

variable "sessions_read_max_capacity" {
  description = "Maximum read capacity units for sessions table auto-scaling"
  type        = number
  default     = 100
}

variable "sessions_write_max_capacity" {
  description = "Maximum write capacity units for sessions table auto-scaling"
  type        = number
  default     = 100
}

variable "audit_logs_read_capacity" {
  description = "Read capacity units for audit logs table"
  type        = number
  default     = 5
}

variable "audit_logs_write_capacity" {
  description = "Write capacity units for audit logs table"
  type        = number
  default     = 5
}

variable "enable_autoscaling" {
  description = "Enable DynamoDB auto-scaling"
  type        = bool
  default     = true
}

variable "enable_point_in_time_recovery" {
  description = "Enable point-in-time recovery for DynamoDB"
  type        = bool
  default     = true
}

variable "enable_dynamodb_streams" {
  description = "Enable DynamoDB streams"
  type        = bool
  default     = false
}

# Backup configuration
variable "enable_backup" {
  description = "Enable AWS Backup for DynamoDB tables"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

# Secrets configuration
variable "elevenlabs_api_key" {
  description = "ElevenLabs API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT secret for session tokens"
  type        = string
  default     = ""
  sensitive   = true
}

variable "cdn_private_key" {
  description = "CloudFront private key for signed URLs"
  type        = string
  default     = ""
  sensitive   = true
}

variable "secret_recovery_window_days" {
  description = "Number of days to retain deleted secrets"
  type        = number
  default     = 7
}

# Monitoring configuration
variable "alert_email" {
  description = "Email address for CloudWatch alerts"
  type        = string
  default     = ""
}

variable "api_5xx_error_threshold" {
  description = "Threshold for API Gateway 5xx errors alarm"
  type        = number
  default     = 10
}

variable "api_latency_threshold_ms" {
  description = "Threshold for API Gateway latency alarm (milliseconds)"
  type        = number
  default     = 10000
}

variable "lambda_error_threshold" {
  description = "Threshold for Lambda errors alarm"
  type        = number
  default     = 5
}

variable "lambda_duration_threshold_ms" {
  description = "Threshold for Lambda duration alarm (milliseconds)"
  type        = number
  default     = 10000
}

variable "fraud_attempts_threshold" {
  description = "Threshold for fraud attempts alarm"
  type        = number
  default     = 20
}
