# AWS Secrets Manager for API Keys

# ElevenLabs API Key
resource "aws_secretsmanager_secret" "elevenlabs_api_key" {
  name                    = "${var.environment}-vlo-elevenlabs-api-key"
  description             = "ElevenLabs API key for TTS and synth detection"
  recovery_window_in_days = var.secret_recovery_window_days
  kms_key_id              = var.kms_key_id != "" ? var.kms_key_id : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-elevenlabs-api-key"
      Environment = var.environment
    }
  )
}

# ElevenLabs API Key Version (placeholder - must be set manually or via CI/CD)
resource "aws_secretsmanager_secret_version" "elevenlabs_api_key" {
  count = var.elevenlabs_api_key != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.elevenlabs_api_key.id
  secret_string = var.elevenlabs_api_key
}

# OpenAI API Key (for Whisper)
resource "aws_secretsmanager_secret" "openai_api_key" {
  name                    = "${var.environment}-vlo-openai-api-key"
  description             = "OpenAI API key for Whisper STT"
  recovery_window_in_days = var.secret_recovery_window_days
  kms_key_id              = var.kms_key_id != "" ? var.kms_key_id : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-openai-api-key"
      Environment = var.environment
    }
  )
}

# OpenAI API Key Version (placeholder - must be set manually or via CI/CD)
resource "aws_secretsmanager_secret_version" "openai_api_key" {
  count = var.openai_api_key != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

# JWT Secret for Session Tokens
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.environment}-vlo-jwt-secret"
  description             = "JWT secret for session token signing"
  recovery_window_in_days = var.secret_recovery_window_days
  kms_key_id              = var.kms_key_id != "" ? var.kms_key_id : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-jwt-secret"
      Environment = var.environment
    }
  )
}

# Generate random JWT secret if not provided
resource "random_password" "jwt_secret" {
  count = var.jwt_secret == "" ? 1 : 0

  length  = 64
  special = true
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret[0].result
}

# CloudFront Private Key for Signed URLs
resource "aws_secretsmanager_secret" "cdn_private_key" {
  count = var.enable_signed_urls ? 1 : 0

  name                    = "${var.environment}-vlo-cdn-private-key"
  description             = "CloudFront private key for signed URLs"
  recovery_window_in_days = var.secret_recovery_window_days
  kms_key_id              = var.kms_key_id != "" ? var.kms_key_id : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-cdn-private-key"
      Environment = var.environment
    }
  )
}

resource "aws_secretsmanager_secret_version" "cdn_private_key" {
  count = var.enable_signed_urls && var.cdn_private_key != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.cdn_private_key[0].id
  secret_string = var.cdn_private_key
}

# Outputs
output "elevenlabs_secret_arn" {
  description = "ElevenLabs API key secret ARN"
  value       = aws_secretsmanager_secret.elevenlabs_api_key.arn
}

output "openai_secret_arn" {
  description = "OpenAI API key secret ARN"
  value       = aws_secretsmanager_secret.openai_api_key.arn
}

output "jwt_secret_arn" {
  description = "JWT secret ARN"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "cdn_private_key_secret_arn" {
  description = "CDN private key secret ARN"
  value       = var.enable_signed_urls ? aws_secretsmanager_secret.cdn_private_key[0].arn : null
}
