terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "vlo_api" {
  name        = "${var.environment}-vlo-api"
  description = "VoiceLiveness Onboarder API Gateway"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  # Enforce minimum TLS version
  minimum_compression_size = -1

  tags = {
    Environment = var.environment
    Project     = "VoiceLiveness-Onboarder"
  }
}

# Custom Domain Name with TLS 1.3
resource "aws_api_gateway_domain_name" "vlo_domain" {
  count = var.custom_domain_name != "" ? 1 : 0

  domain_name              = var.custom_domain_name
  regional_certificate_arn = var.certificate_arn
  security_policy          = "TLS_1_3"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = var.environment
    Project     = "VoiceLiveness-Onboarder"
  }
}

# Base Path Mapping for Custom Domain
resource "aws_api_gateway_base_path_mapping" "vlo_mapping" {
  count = var.custom_domain_name != "" ? 1 : 0

  api_id      = aws_api_gateway_rest_api.vlo_api.id
  stage_name  = aws_api_gateway_stage.vlo_stage.stage_name
  domain_name = aws_api_gateway_domain_name.vlo_domain[0].domain_name
}

# API Gateway Resource: /sessions
resource "aws_api_gateway_resource" "sessions" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  parent_id   = aws_api_gateway_rest_api.vlo_api.root_resource_id
  path_part   = "sessions"
}

# API Gateway Resource: /sessions/{sessionId}
resource "aws_api_gateway_resource" "session_id" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  parent_id   = aws_api_gateway_resource.sessions.id
  path_part   = "{sessionId}"
}

# API Gateway Resource: /sessions/{sessionId}/audio
resource "aws_api_gateway_resource" "session_audio" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  parent_id   = aws_api_gateway_resource.session_id.id
  path_part   = "audio"
}

# API Gateway Resource: /sessions/{sessionId}/result
resource "aws_api_gateway_resource" "session_result" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  parent_id   = aws_api_gateway_resource.session_id.id
  path_part   = "result"
}

# API Gateway Method: POST /sessions
resource "aws_api_gateway_method" "create_session" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.sessions.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

# API Gateway Method: GET /sessions/{sessionId}
resource "aws_api_gateway_method" "get_session" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.session_id.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.sessionId" = true
  }
}

# API Gateway Method: POST /sessions/{sessionId}/audio
resource "aws_api_gateway_method" "submit_audio" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.session_audio.id
  http_method   = "POST"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.sessionId"      = true
    "method.request.header.Content-Type" = true
  }
}

# API Gateway Method: GET /sessions/{sessionId}/result
resource "aws_api_gateway_method" "get_result" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.session_result.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.path.sessionId" = true
  }
}

# CORS Configuration - OPTIONS methods
resource "aws_api_gateway_method" "sessions_options" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.sessions.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "session_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.session_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "session_audio_options" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.session_audio.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "session_result_options" {
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  resource_id   = aws_api_gateway_resource.session_result.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# CORS Integration Responses
resource "aws_api_gateway_integration" "sessions_options" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  resource_id = aws_api_gateway_resource.sessions.id
  http_method = aws_api_gateway_method.sessions_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "sessions_options" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  resource_id = aws_api_gateway_resource.sessions.id
  http_method = aws_api_gateway_method.sessions_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "sessions_options" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  resource_id = aws_api_gateway_resource.sessions.id
  http_method = aws_api_gateway_method.sessions_options.http_method
  status_code = aws_api_gateway_method_response.sessions_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Session-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Usage Plan for Rate Limiting
resource "aws_api_gateway_usage_plan" "vlo_usage_plan" {
  name        = "${var.environment}-vlo-usage-plan"
  description = "Usage plan for VLO API with rate limiting"

  api_stages {
    api_id = aws_api_gateway_rest_api.vlo_api.id
    stage  = aws_api_gateway_stage.vlo_stage.stage_name
  }

  quota_settings {
    limit  = var.rate_limit_per_hour
    period = "HOUR"
  }

  throttle_settings {
    burst_limit = var.rate_limit_burst
    rate_limit  = var.rate_limit_per_minute
  }

  tags = {
    Environment = var.environment
    Project     = "VoiceLiveness-Onboarder"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "vlo_deployment" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.sessions.id,
      aws_api_gateway_resource.session_id.id,
      aws_api_gateway_resource.session_audio.id,
      aws_api_gateway_resource.session_result.id,
      aws_api_gateway_method.create_session.id,
      aws_api_gateway_method.get_session.id,
      aws_api_gateway_method.submit_audio.id,
      aws_api_gateway_method.get_result.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "vlo_stage" {
  deployment_id = aws_api_gateway_deployment.vlo_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.vlo_api.id
  stage_name    = var.environment

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  xray_tracing_enabled = true

  # Enable cache encryption
  cache_cluster_enabled = var.enable_cache
  cache_cluster_size    = var.enable_cache ? "0.5" : null

  tags = {
    Environment = var.environment
    Project     = "VoiceLiveness-Onboarder"
  }
}

# Method Settings for Cache Encryption
resource "aws_api_gateway_method_settings" "vlo_settings" {
  rest_api_id = aws_api_gateway_rest_api.vlo_api.id
  stage_name  = aws_api_gateway_stage.vlo_stage.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"
    data_trace_enabled     = true
    throttling_burst_limit = var.rate_limit_burst
    throttling_rate_limit  = var.rate_limit_per_minute
    caching_enabled        = var.enable_cache
    cache_data_encrypted   = var.enable_cache
    cache_ttl_in_seconds   = 300
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.environment}-vlo-api"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    Project     = "VoiceLiveness-Onboarder"
  }
}

# API Gateway Account (for CloudWatch logging)
resource "aws_api_gateway_account" "vlo_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# IAM Role for API Gateway CloudWatch Logging
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "${var.environment}-vlo-api-gateway-cloudwatch"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = "VoiceLiveness-Onboarder"
  }
}

# Attach CloudWatch Logs policy to API Gateway role
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Outputs
output "api_gateway_url" {
  description = "API Gateway URL"
  value       = "${aws_api_gateway_stage.vlo_stage.invoke_url}/api/v1"
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.vlo_api.id
}

output "api_gateway_stage" {
  description = "API Gateway Stage"
  value       = aws_api_gateway_stage.vlo_stage.stage_name
}
