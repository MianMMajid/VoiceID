# CloudWatch Monitoring and Alerting

# SNS Topic for Alerts
resource "aws_sns_topic" "vlo_alerts" {
  name              = "${var.environment}-vlo-alerts"
  display_name      = "VLO System Alerts"
  kms_master_key_id = var.kms_key_id != "" ? var.kms_key_id : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-alerts"
      Environment = var.environment
    }
  )
}

# SNS Topic Subscription (Email)
resource "aws_sns_topic_subscription" "vlo_alerts_email" {
  count = var.alert_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.vlo_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Alarm: API Gateway 5xx Errors
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${var.environment}-vlo-api-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = var.api_5xx_error_threshold
  alarm_description   = "API Gateway 5xx errors exceeded threshold"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  dimensions = {
    ApiName = aws_api_gateway_rest_api.vlo_api.name
    Stage   = aws_api_gateway_stage.vlo_stage.stage_name
  }

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Alarm: API Gateway Latency
resource "aws_cloudwatch_metric_alarm" "api_latency" {
  alarm_name          = "${var.environment}-vlo-api-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Average"
  threshold           = var.api_latency_threshold_ms
  alarm_description   = "API Gateway latency exceeded 10s threshold"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  dimensions = {
    ApiName = aws_api_gateway_rest_api.vlo_api.name
    Stage   = aws_api_gateway_stage.vlo_stage.stage_name
  }

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Alarm: Lambda Errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = {
    session_creator           = aws_lambda_function.session_creator.function_name
    audio_processor           = aws_lambda_function.audio_processor.function_name
    verification_orchestrator = aws_lambda_function.verification_orchestrator.function_name
    spoof_detector            = aws_lambda_function.spoof_detector.function_name
  }

  alarm_name          = "${var.environment}-vlo-${each.key}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = var.lambda_error_threshold
  alarm_description   = "Lambda function ${each.key} errors exceeded threshold"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  dimensions = {
    FunctionName = each.value
  }

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Alarm: Lambda Duration
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  for_each = {
    verification_orchestrator = aws_lambda_function.verification_orchestrator.function_name
  }

  alarm_name          = "${var.environment}-vlo-${each.key}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Average"
  threshold           = var.lambda_duration_threshold_ms
  alarm_description   = "Lambda function ${each.key} duration exceeded threshold"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  dimensions = {
    FunctionName = each.value
  }

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Alarm: Lambda Throttles
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  for_each = {
    session_creator           = aws_lambda_function.session_creator.function_name
    audio_processor           = aws_lambda_function.audio_processor.function_name
    verification_orchestrator = aws_lambda_function.verification_orchestrator.function_name
    spoof_detector            = aws_lambda_function.spoof_detector.function_name
  }

  alarm_name          = "${var.environment}-vlo-${each.key}-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda function ${each.key} is being throttled"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  dimensions = {
    FunctionName = each.value
  }

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Alarm: DynamoDB Read Throttles
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttles" {
  for_each = {
    sessions    = aws_dynamodb_table.sessions.name
    audit_logs  = aws_dynamodb_table.audit_logs.name
  }

  alarm_name          = "${var.environment}-vlo-${each.key}-read-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB table ${each.key} read throttles detected"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  dimensions = {
    TableName = each.value
  }

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Alarm: DynamoDB Write Throttles
resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttles" {
  for_each = {
    sessions    = aws_dynamodb_table.sessions.name
    audit_logs  = aws_dynamodb_table.audit_logs.name
  }

  alarm_name          = "${var.environment}-vlo-${each.key}-write-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "DynamoDB table ${each.key} write throttles detected"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  dimensions = {
    TableName = each.value
  }

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "vlo_dashboard" {
  dashboard_name = "${var.environment}-vlo-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Count", { stat = "Sum", label = "API Requests" }],
            [".", "5XXError", { stat = "Sum", label = "5xx Errors" }],
            [".", "4XXError", { stat = "Sum", label = "4xx Errors" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "API Gateway Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/ApiGateway", "Latency", { stat = "Average", label = "Avg Latency" }],
            ["...", { stat = "p95", label = "P95 Latency" }],
            ["...", { stat = "p99", label = "P99 Latency" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "API Gateway Latency"
          yAxis = {
            left = {
              label = "Milliseconds"
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", { stat = "Sum" }],
            [".", "Errors", { stat = "Sum" }],
            [".", "Throttles", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/Lambda", "Duration", { stat = "Average", label = "Avg Duration" }],
            ["...", { stat = "p95", label = "P95 Duration" }]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Lambda Duration"
          yAxis = {
            left = {
              label = "Milliseconds"
            }
          }
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", { stat = "Sum" }],
            [".", "ConsumedWriteCapacityUnits", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "DynamoDB Capacity"
        }
      },
      {
        type = "log"
        properties = {
          query   = "SOURCE '/aws/lambda/${aws_lambda_function.verification_orchestrator.function_name}' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20"
          region  = var.aws_region
          title   = "Recent Errors"
        }
      }
    ]
  })
}

# Custom Metrics for VLO
resource "aws_cloudwatch_log_metric_filter" "fraud_attempts" {
  name           = "${var.environment}-vlo-fraud-attempts"
  log_group_name = aws_cloudwatch_log_group.verification_orchestrator.name
  pattern        = "[time, request_id, level=ERROR, msg=\"*synthetic*\" || msg=\"*spoof*\"]"

  metric_transformation {
    name      = "FraudAttempts"
    namespace = "VLO/${var.environment}"
    value     = "1"
    unit      = "Count"
  }
}

# CloudWatch Alarm: Fraud Attempts
resource "aws_cloudwatch_metric_alarm" "fraud_attempts" {
  alarm_name          = "${var.environment}-vlo-fraud-attempts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FraudAttempts"
  namespace           = "VLO/${var.environment}"
  period              = 300
  statistic           = "Sum"
  threshold           = var.fraud_attempts_threshold
  alarm_description   = "High number of fraud attempts detected"
  alarm_actions       = [aws_sns_topic.vlo_alerts.arn]

  tags = merge(
    var.project_tags,
    {
      Environment = var.environment
    }
  )
}

# Custom Metrics for Verification Success Rate
resource "aws_cloudwatch_log_metric_filter" "verification_success" {
  name           = "${var.environment}-vlo-verification-success"
  log_group_name = aws_cloudwatch_log_group.verification_orchestrator.name
  pattern        = "[time, request_id, level=INFO, msg=\"*verification*success*\"]"

  metric_transformation {
    name      = "VerificationSuccess"
    namespace = "VLO/${var.environment}"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "verification_failure" {
  name           = "${var.environment}-vlo-verification-failure"
  log_group_name = aws_cloudwatch_log_group.verification_orchestrator.name
  pattern        = "[time, request_id, level=INFO, msg=\"*verification*failed*\"]"

  metric_transformation {
    name      = "VerificationFailure"
    namespace = "VLO/${var.environment}"
    value     = "1"
    unit      = "Count"
  }
}

# Outputs
output "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.vlo_alerts.arn
}

output "dashboard_url" {
  description = "CloudWatch Dashboard URL"
  value       = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.vlo_dashboard.dashboard_name}"
}
