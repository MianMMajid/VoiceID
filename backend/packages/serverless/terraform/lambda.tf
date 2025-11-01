# Lambda Functions for VLO Services

# IAM Role for Lambda Functions
resource "aws_iam_role" "lambda_execution" {
  name = "${var.environment}-vlo-lambda-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-lambda-execution"
      Environment = var.environment
    }
  )
}

# Lambda Basic Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda X-Ray Policy
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# Lambda Custom Policy for VLO Resources
resource "aws_iam_role_policy" "lambda_vlo_policy" {
  name = "${var.environment}-vlo-lambda-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:DeleteItem"
        ]
        Resource = [
          aws_dynamodb_table.sessions.arn,
          aws_dynamodb_table.audit_logs.arn,
          "${aws_dynamodb_table.sessions.arn}/index/*",
          "${aws_dynamodb_table.audit_logs.arn}/index/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.audio_storage.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = var.kms_key_id != "" ? var.kms_key_id : "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.elevenlabs_api_key.arn,
          aws_secretsmanager_secret.openai_api_key.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda Layer for shared dependencies
resource "aws_lambda_layer_version" "vlo_dependencies" {
  filename            = var.lambda_layer_path
  layer_name          = "${var.environment}-vlo-dependencies"
  compatible_runtimes = ["nodejs20.x"]
  description         = "Shared dependencies for VLO Lambda functions"

  lifecycle {
    create_before_destroy = true
  }
}

# Lambda Function: Session Creator
resource "aws_lambda_function" "session_creator" {
  filename         = var.lambda_package_path
  function_name    = "${var.environment}-vlo-session-creator"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "dist/handlers/session-creator.handler"
  source_code_hash = filebase64sha256(var.lambda_package_path)
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = var.lambda_memory_size

  layers = [aws_lambda_layer_version.vlo_dependencies.arn]

  environment {
    variables = {
      ENVIRONMENT           = var.environment
      SESSIONS_TABLE        = aws_dynamodb_table.sessions.name
      AUDIO_BUCKET          = aws_s3_bucket.audio_storage.id
      CDN_DOMAIN            = aws_cloudfront_distribution.audio_cdn.domain_name
      ELEVENLABS_SECRET_ARN = aws_secretsmanager_secret.elevenlabs_api_key.arn
      LOG_LEVEL             = var.log_level
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-session-creator"
      Environment = var.environment
    }
  )
}

# Lambda Function: Audio Processor
resource "aws_lambda_function" "audio_processor" {
  filename         = var.lambda_package_path
  function_name    = "${var.environment}-vlo-audio-processor"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "dist/handlers/audio-processor.handler"
  source_code_hash = filebase64sha256(var.lambda_package_path)
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = var.lambda_memory_size_large

  layers = [aws_lambda_layer_version.vlo_dependencies.arn]

  environment {
    variables = {
      ENVIRONMENT           = var.environment
      SESSIONS_TABLE        = aws_dynamodb_table.sessions.name
      AUDIT_LOGS_TABLE      = aws_dynamodb_table.audit_logs.name
      AUDIO_BUCKET          = aws_s3_bucket.audio_storage.id
      ELEVENLABS_SECRET_ARN = aws_secretsmanager_secret.elevenlabs_api_key.arn
      OPENAI_SECRET_ARN     = aws_secretsmanager_secret.openai_api_key.arn
      LOG_LEVEL             = var.log_level
    }
  }

  tracing_config {
    mode = "Active"
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-audio-processor"
      Environment = var.environment
    }
  )
}

# Lambda Function: Verification Orchestrator
resource "aws_lambda_function" "verification_orchestrator" {
  filename         = var.lambda_package_path
  function_name    = "${var.environment}-vlo-verification-orchestrator"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "dist/handlers/verification-orchestrator.handler"
  source_code_hash = filebase64sha256(var.lambda_package_path)
  runtime          = "nodejs20.x"
  timeout          = 60
  memory_size      = var.lambda_memory_size_large

  layers = [aws_lambda_layer_version.vlo_dependencies.arn]

  environment {
    variables = {
      ENVIRONMENT           = var.environment
      SESSIONS_TABLE        = aws_dynamodb_table.sessions.name
      AUDIT_LOGS_TABLE      = aws_dynamodb_table.audit_logs.name
      AUDIO_BUCKET          = aws_s3_bucket.audio_storage.id
      ELEVENLABS_SECRET_ARN = aws_secretsmanager_secret.elevenlabs_api_key.arn
      OPENAI_SECRET_ARN     = aws_secretsmanager_secret.openai_api_key.arn
      LOG_LEVEL             = var.log_level
    }
  }

  tracing_config {
    mode = "Active"
  }

  reserved_concurrent_executions = var.enable_provisioned_concurrency ? var.provisioned_concurrency : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-verification-orchestrator"
      Environment = var.environment
    }
  )
}

# Lambda Alias for Provisioned Concurrency
resource "aws_lambda_alias" "verification_orchestrator" {
  name             = "${var.environment}-current"
  function_name    = aws_lambda_function.verification_orchestrator.function_name
  function_version = aws_lambda_function.verification_orchestrator.version
}

# Provisioned Concurrency for Verification Orchestrator (optional)
resource "aws_lambda_provisioned_concurrency_config" "verification_orchestrator" {
  count = var.enable_provisioned_concurrency ? 1 : 0

  function_name                     = aws_lambda_function.verification_orchestrator.function_name
  provisioned_concurrent_executions = var.provisioned_concurrency
  qualifier                         = aws_lambda_alias.verification_orchestrator.name

  lifecycle {
    ignore_changes = [provisioned_concurrent_executions]
  }
}

# Lambda Function: Warmer
resource "aws_lambda_function" "warmer" {
  filename         = var.lambda_package_path
  function_name    = "${var.environment}-vlo-warmer"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "dist/handlers/warmer.handler"
  source_code_hash = filebase64sha256(var.lambda_package_path)
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      ENVIRONMENT = var.environment
      LOG_LEVEL   = var.log_level
    }
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-warmer"
      Environment = var.environment
    }
  )
}

# CloudWatch Event Rule for Lambda Warming
resource "aws_cloudwatch_event_rule" "lambda_warmer" {
  count = var.enable_lambda_warming ? 1 : 0

  name                = "${var.environment}-vlo-lambda-warmer"
  description         = "Trigger Lambda warmer to keep functions warm"
  schedule_expression = var.lambda_warming_schedule

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Event Target: Session Creator
resource "aws_cloudwatch_event_target" "session_creator_warmer" {
  count = var.enable_lambda_warming ? 1 : 0

  rule      = aws_cloudwatch_event_rule.lambda_warmer[0].name
  target_id = "SessionCreatorWarmer"
  arn       = aws_lambda_function.session_creator.arn

  input = jsonencode({
    warmer      = true
    concurrency = var.lambda_warming_concurrency
  })
}

# CloudWatch Event Target: Verification Orchestrator
resource "aws_cloudwatch_event_target" "verification_orchestrator_warmer" {
  count = var.enable_lambda_warming ? 1 : 0

  rule      = aws_cloudwatch_event_rule.lambda_warmer[0].name
  target_id = "VerificationOrchestratorWarmer"
  arn       = aws_lambda_function.verification_orchestrator.arn

  input = jsonencode({
    warmer      = true
    concurrency = var.lambda_warming_concurrency
  })
}

# CloudWatch Event Target: Audio Processor
resource "aws_cloudwatch_event_target" "audio_processor_warmer" {
  count = var.enable_lambda_warming ? 1 : 0

  rule      = aws_cloudwatch_event_rule.lambda_warmer[0].name
  target_id = "AudioProcessorWarmer"
  arn       = aws_lambda_function.audio_processor.arn

  input = jsonencode({
    warmer      = true
    concurrency = var.lambda_warming_concurrency
  })
}

# Lambda Permissions for CloudWatch Events
resource "aws_lambda_permission" "session_creator_warmer" {
  count = var.enable_lambda_warming ? 1 : 0

  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.session_creator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer[0].arn
}

resource "aws_lambda_permission" "verification_orchestrator_warmer" {
  count = var.enable_lambda_warming ? 1 : 0

  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.verification_orchestrator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer[0].arn
}

resource "aws_lambda_permission" "audio_processor_warmer" {
  count = var.enable_lambda_warming ? 1 : 0

  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.audio_processor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmer[0].arn
}

# Lambda Function: Spoof Detector (Container Image)
resource "aws_lambda_function" "spoof_detector" {
  function_name = "${var.environment}-vlo-spoof-detector"
  role          = aws_iam_role.lambda_execution.arn
  package_type  = "Image"
  image_uri     = var.spoof_detector_image_uri
  timeout       = 30
  memory_size   = var.lambda_memory_size_xlarge

  environment {
    variables = {
      ENVIRONMENT      = var.environment
      AUDIO_BUCKET     = aws_s3_bucket.audio_storage.id
      MODEL_CACHE_PATH = "/tmp/models"
      LOG_LEVEL        = var.log_level
    }
  }

  tracing_config {
    mode = "Active"
  }

  ephemeral_storage {
    size = 2048 # 2GB for model weights
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-spoof-detector"
      Environment = var.environment
    }
  )
}

# CloudWatch Log Groups for Lambda Functions
resource "aws_cloudwatch_log_group" "session_creator" {
  name              = "/aws/lambda/${aws_lambda_function.session_creator.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

resource "aws_cloudwatch_log_group" "audio_processor" {
  name              = "/aws/lambda/${aws_lambda_function.audio_processor.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

resource "aws_cloudwatch_log_group" "verification_orchestrator" {
  name              = "/aws/lambda/${aws_lambda_function.verification_orchestrator.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

resource "aws_cloudwatch_log_group" "spoof_detector" {
  name              = "/aws/lambda/${aws_lambda_function.spoof_detector.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# Lambda Permissions for API Gateway
resource "aws_lambda_permission" "session_creator" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.session_creator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.vlo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "audio_processor" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.audio_processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.vlo_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "verification_orchestrator" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.verification_orchestrator.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.vlo_api.execution_arn}/*/*"
}

# Outputs
output "session_creator_arn" {
  description = "Session Creator Lambda ARN"
  value       = aws_lambda_function.session_creator.arn
}

output "audio_processor_arn" {
  description = "Audio Processor Lambda ARN"
  value       = aws_lambda_function.audio_processor.arn
}

output "verification_orchestrator_arn" {
  description = "Verification Orchestrator Lambda ARN"
  value       = aws_lambda_function.verification_orchestrator.arn
}

output "spoof_detector_arn" {
  description = "Spoof Detector Lambda ARN"
  value       = aws_lambda_function.spoof_detector.arn
}
