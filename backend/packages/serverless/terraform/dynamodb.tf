# DynamoDB Tables for VLO

# Sessions Table
resource "aws_dynamodb_table" "sessions" {
  name           = "${var.environment}-vlo-sessions"
  billing_mode   = var.dynamodb_billing_mode
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.sessions_read_capacity : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.sessions_write_capacity : null
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }

  attribute {
    name = "status"
    type = "S"
  }

  # GSI for querying by userId
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
    read_capacity   = var.dynamodb_billing_mode == "PROVISIONED" ? var.sessions_read_capacity : null
    write_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.sessions_write_capacity : null
  }

  # GSI for querying by status
  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
    read_capacity   = var.dynamodb_billing_mode == "PROVISIONED" ? var.sessions_read_capacity : null
    write_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.sessions_write_capacity : null
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_id != "" ? var.kms_key_id : null
  }

  stream_enabled   = var.enable_dynamodb_streams
  stream_view_type = var.enable_dynamodb_streams ? "NEW_AND_OLD_IMAGES" : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-sessions"
      Environment = var.environment
    }
  )
}

# Auto-scaling for Sessions Table (if PROVISIONED mode)
resource "aws_appautoscaling_target" "sessions_read" {
  count = var.dynamodb_billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.sessions_read_max_capacity
  min_capacity       = var.sessions_read_capacity
  resource_id        = "table/${aws_dynamodb_table.sessions.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "sessions_read" {
  count = var.dynamodb_billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "${var.environment}-vlo-sessions-read-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sessions_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.sessions_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.sessions_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }
    target_value = 70.0
  }
}

resource "aws_appautoscaling_target" "sessions_write" {
  count = var.dynamodb_billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  max_capacity       = var.sessions_write_max_capacity
  min_capacity       = var.sessions_write_capacity
  resource_id        = "table/${aws_dynamodb_table.sessions.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "sessions_write" {
  count = var.dynamodb_billing_mode == "PROVISIONED" && var.enable_autoscaling ? 1 : 0

  name               = "${var.environment}-vlo-sessions-write-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sessions_write[0].resource_id
  scalable_dimension = aws_appautoscaling_target.sessions_write[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.sessions_write[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }
    target_value = 70.0
  }
}

# Audit Logs Table
resource "aws_dynamodb_table" "audit_logs" {
  name           = "${var.environment}-vlo-audit-logs"
  billing_mode   = var.dynamodb_billing_mode
  read_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_read_capacity : null
  write_capacity = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_write_capacity : null
  hash_key       = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "event"
    type = "S"
  }

  # GSI for querying by sessionId
  global_secondary_index {
    name            = "SessionIdIndex"
    hash_key        = "sessionId"
    range_key       = "timestamp"
    projection_type = "ALL"
    read_capacity   = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_read_capacity : null
    write_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_write_capacity : null
  }

  # GSI for querying by userId
  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "userId"
    range_key       = "timestamp"
    projection_type = "ALL"
    read_capacity   = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_read_capacity : null
    write_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_write_capacity : null
  }

  # GSI for querying by event type
  global_secondary_index {
    name            = "EventIndex"
    hash_key        = "event"
    range_key       = "timestamp"
    projection_type = "ALL"
    read_capacity   = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_read_capacity : null
    write_capacity  = var.dynamodb_billing_mode == "PROVISIONED" ? var.audit_logs_write_capacity : null
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = var.kms_key_id != "" ? var.kms_key_id : null
  }

  stream_enabled   = var.enable_dynamodb_streams
  stream_view_type = var.enable_dynamodb_streams ? "NEW_AND_OLD_IMAGES" : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-audit-logs"
      Environment = var.environment
    }
  )
}

# Backup Vault for DynamoDB
resource "aws_backup_vault" "vlo_backup" {
  count = var.enable_backup ? 1 : 0

  name        = "${var.environment}-vlo-backup-vault"
  kms_key_arn = var.kms_key_id != "" ? var.kms_key_id : null

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-backup-vault"
      Environment = var.environment
    }
  )
}

# Backup Plan for DynamoDB
resource "aws_backup_plan" "vlo_backup" {
  count = var.enable_backup ? 1 : 0

  name = "${var.environment}-vlo-backup-plan"

  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.vlo_backup[0].name
    schedule          = "cron(0 2 * * ? *)" # Daily at 2 AM UTC

    lifecycle {
      delete_after = var.backup_retention_days
    }

    recovery_point_tags = merge(
      var.project_tags,
      {
        Environment = var.environment
      }
    )
  }

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-backup-plan"
      Environment = var.environment
    }
  )
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup_role" {
  count = var.enable_backup ? 1 : 0

  name = "${var.environment}-vlo-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.project_tags,
    {
      Name        = "${var.environment}-vlo-backup-role"
      Environment = var.environment
    }
  )
}

# Attach AWS Backup policy to role
resource "aws_iam_role_policy_attachment" "backup_policy" {
  count = var.enable_backup ? 1 : 0

  role       = aws_iam_role.backup_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "backup_restore_policy" {
  count = var.enable_backup ? 1 : 0

  role       = aws_iam_role.backup_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

# Backup Selection for Sessions Table
resource "aws_backup_selection" "sessions" {
  count = var.enable_backup ? 1 : 0

  name         = "${var.environment}-vlo-sessions-backup"
  plan_id      = aws_backup_plan.vlo_backup[0].id
  iam_role_arn = aws_iam_role.backup_role[0].arn

  resources = [
    aws_dynamodb_table.sessions.arn
  ]
}

# Backup Selection for Audit Logs Table
resource "aws_backup_selection" "audit_logs" {
  count = var.enable_backup ? 1 : 0

  name         = "${var.environment}-vlo-audit-logs-backup"
  plan_id      = aws_backup_plan.vlo_backup[0].id
  iam_role_arn = aws_iam_role.backup_role[0].arn

  resources = [
    aws_dynamodb_table.audit_logs.arn
  ]
}

# Outputs
output "sessions_table_name" {
  description = "Sessions DynamoDB table name"
  value       = aws_dynamodb_table.sessions.name
}

output "sessions_table_arn" {
  description = "Sessions DynamoDB table ARN"
  value       = aws_dynamodb_table.sessions.arn
}

output "audit_logs_table_name" {
  description = "Audit Logs DynamoDB table name"
  value       = aws_dynamodb_table.audit_logs.name
}

output "audit_logs_table_arn" {
  description = "Audit Logs DynamoDB table ARN"
  value       = aws_dynamodb_table.audit_logs.arn
}
