# Regional Deployment Configuration
# Task 15.3: Reduce network latency with regional deployment

# Define regions for multi-region deployment
variable "deployment_regions" {
  description = "List of AWS regions for multi-region deployment"
  type        = list(string)
  default     = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]
}

variable "enable_multi_region" {
  description = "Enable multi-region deployment"
  type        = bool
  default     = false
}

# Regional latency routing policy
variable "enable_latency_routing" {
  description = "Enable Route53 latency-based routing"
  type        = bool
  default     = true
}

# Route53 Health Check configuration
variable "health_check_interval" {
  description = "Health check interval in seconds"
  type        = number
  default     = 30
}

variable "health_check_failure_threshold" {
  description = "Number of consecutive failures before marking unhealthy"
  type        = number
  default     = 3
}

# Regional endpoint configuration
locals {
  regional_endpoints = {
    for region in var.deployment_regions :
    region => {
      api_endpoint    = "https://api-${region}.${var.custom_domain_name}"
      cdn_endpoint    = "https://cdn-${region}.${var.custom_domain_name}"
      latency_weight  = 100
    }
  }
}

# Route53 Hosted Zone (if using custom domain)
resource "aws_route53_zone" "vlo" {
  count = var.custom_domain_name != "" && var.enable_multi_region ? 1 : 0

  name = var.custom_domain_name

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-zone"
      Environment = var.environment
    }
  )
}

# Route53 Health Check for API Gateway
resource "aws_route53_health_check" "api" {
  count = var.enable_multi_region ? 1 : 0

  type              = "HTTPS"
  resource_path     = "/health"
  fqdn              = aws_api_gateway_rest_api.vlo_api.id
  port              = 443
  request_interval  = var.health_check_interval
  failure_threshold = var.health_check_failure_threshold

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-api-health"
      Environment = var.environment
    }
  )
}

# Route53 Latency-based Routing Record
resource "aws_route53_record" "api_latency" {
  count = var.custom_domain_name != "" && var.enable_latency_routing ? 1 : 0

  zone_id = aws_route53_zone.vlo[0].zone_id
  name    = "api.${var.custom_domain_name}"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.vlo[0].cloudfront_domain_name
    zone_id                = aws_api_gateway_domain_name.vlo[0].cloudfront_zone_id
    evaluate_target_health = true
  }

  set_identifier = var.aws_region
  latency_routing_policy {
    region = var.aws_region
  }

  health_check_id = var.enable_multi_region ? aws_route53_health_check.api[0].id : null
}

# API Gateway Domain Name
resource "aws_api_gateway_domain_name" "vlo" {
  count = var.custom_domain_name != "" ? 1 : 0

  domain_name              = "api.${var.custom_domain_name}"
  regional_certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-api-domain"
      Environment = var.environment
    }
  )
}

# API Gateway Base Path Mapping
resource "aws_api_gateway_base_path_mapping" "vlo" {
  count = var.custom_domain_name != "" ? 1 : 0

  api_id      = aws_api_gateway_rest_api.vlo_api.id
  stage_name  = aws_api_gateway_stage.vlo.stage_name
  domain_name = aws_api_gateway_domain_name.vlo[0].domain_name
}

# CloudFront Distribution for Global CDN (multi-region)
resource "aws_cloudfront_distribution" "global_cdn" {
  count = var.enable_multi_region ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.environment} VLO Global CDN"
  price_class         = "PriceClass_All" # Global distribution
  default_root_object = ""

  # Multiple regional origins
  dynamic "origin" {
    for_each = var.deployment_regions
    content {
      domain_name = "api-${origin.value}.${var.custom_domain_name}"
      origin_id   = "API-${origin.value}"

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }

      origin_shield {
        enabled              = true
        origin_shield_region = origin.value
      }
    }
  }

  # Origin group for failover
  origin_group {
    origin_id = "API-Group"

    failover_criteria {
      status_codes = [500, 502, 503, 504]
    }

    dynamic "member" {
      for_each = var.deployment_regions
      content {
        origin_id = "API-${member.value}"
      }
    }
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "API-Group"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.cdn_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-global-cdn"
      Environment = var.environment
    }
  )
}

# Outputs
output "regional_endpoints" {
  description = "Regional API endpoints"
  value       = local.regional_endpoints
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.custom_domain_name != "" && var.enable_multi_region ? aws_route53_zone.vlo[0].zone_id : null
}

output "global_cdn_domain" {
  description = "Global CDN domain name"
  value       = var.enable_multi_region ? aws_cloudfront_distribution.global_cdn[0].domain_name : null
}
