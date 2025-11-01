# S3 Bucket for audio storage
resource "aws_s3_bucket" "audio_storage" {
  bucket = "${var.environment}-vlo-audio-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-audio"
      Environment = var.environment
    }
  )
}

# S3 Bucket versioning
resource "aws_s3_bucket_versioning" "audio_storage" {
  bucket = aws_s3_bucket.audio_storage.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "audio_storage" {
  bucket = aws_s3_bucket.audio_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# S3 Bucket public access block
resource "aws_s3_bucket_public_access_block" "audio_storage" {
  bucket = aws_s3_bucket.audio_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "audio_storage" {
  bucket = aws_s3_bucket.audio_storage.id

  rule {
    id     = "delete-old-audio"
    status = "Enabled"

    expiration {
      days = var.audio_retention_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "audio_cdn" {
  comment = "${var.environment} VLO Audio CDN OAI"
}

# S3 Bucket policy for CloudFront
resource "aws_s3_bucket_policy" "audio_storage" {
  bucket = aws_s3_bucket.audio_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.audio_cdn.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.audio_storage.arn}/*"
      }
    ]
  })
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "audio_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.environment} VLO Audio CDN"
  default_root_object = ""
  price_class         = var.cdn_price_class

  origin {
    domain_name = aws_s3_bucket.audio_storage.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.audio_storage.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.audio_cdn.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${aws_s3_bucket.audio_storage.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = var.cdn_default_ttl
    max_ttl                = var.cdn_max_ttl
    compress               = true

    # Lambda@Edge function for signed URLs (optional)
    # lambda_function_association {
    #   event_type   = "viewer-request"
    #   lambda_arn   = aws_lambda_function.cdn_auth.qualified_arn
    #   include_body = false
    # }
  }

  # Cache behavior for challenge audio (longer cache)
  ordered_cache_behavior {
    path_pattern     = "challenges/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD", "OPTIONS"]
    target_origin_id = "S3-${aws_s3_bucket.audio_storage.id}"

    forwarded_values {
      query_string = true # For signed URLs
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 3600
    default_ttl            = 86400  # 24 hours
    max_ttl                = 604800 # 7 days
    compress               = true
  }

  # Cache behavior for user audio (shorter cache)
  ordered_cache_behavior {
    path_pattern     = "recordings/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.audio_storage.id}"

    forwarded_values {
      query_string = true # For signed URLs
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 300   # 5 minutes
    max_ttl                = 3600  # 1 hour
    compress               = false # Don't compress audio
  }

  restrictions {
    geo_restriction {
      restriction_type = var.cdn_geo_restriction_type
      locations        = var.cdn_geo_restriction_locations
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.cdn_custom_domain == "" ? true : false
    acm_certificate_arn            = var.cdn_custom_domain != "" ? var.cdn_certificate_arn : null
    ssl_support_method             = var.cdn_custom_domain != "" ? "sni-only" : null
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  custom_error_response {
    error_code            = 403
    response_code         = 403
    response_page_path    = "/error.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/error.html"
    error_caching_min_ttl = 10
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-audio-cdn"
      Environment = var.environment
    }
  )
}

# CloudFront Public Key for signed URLs
resource "aws_cloudfront_public_key" "audio_cdn" {
  count = var.enable_signed_urls ? 1 : 0

  name        = "${var.environment}-vlo-cdn-key"
  encoded_key = var.cdn_public_key
  comment     = "Public key for VLO CDN signed URLs"
}

# CloudFront Key Group for signed URLs
resource "aws_cloudfront_key_group" "audio_cdn" {
  count = var.enable_signed_urls ? 1 : 0

  name    = "${var.environment}-vlo-cdn-key-group"
  comment = "Key group for VLO CDN signed URLs"
  items   = [aws_cloudfront_public_key.audio_cdn[0].id]
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Outputs
output "cdn_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.audio_cdn.domain_name
}

output "cdn_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.audio_cdn.id
}

output "audio_bucket_name" {
  description = "S3 bucket name for audio storage"
  value       = aws_s3_bucket.audio_storage.id
}

output "audio_bucket_arn" {
  description = "S3 bucket ARN for audio storage"
  value       = aws_s3_bucket.audio_storage.arn
}

output "cdn_key_pair_id" {
  description = "CloudFront key pair ID for signed URLs"
  value       = var.enable_signed_urls ? aws_cloudfront_public_key.audio_cdn[0].id : null
}
