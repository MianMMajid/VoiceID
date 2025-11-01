#!/bin/bash

# Script to set up Terraform backend (S3 bucket and DynamoDB table)
# Usage: ./setup-terraform-backend.sh <environment>

set -e

ENVIRONMENT=$1
AWS_REGION=${AWS_REGION:-us-east-1}

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 dev"
  exit 1
fi

BUCKET_NAME="vlo-terraform-state-${ENVIRONMENT}"
DYNAMODB_TABLE="vlo-terraform-locks-${ENVIRONMENT}"

echo "Setting up Terraform backend for environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Bucket: $BUCKET_NAME"
echo "DynamoDB Table: $DYNAMODB_TABLE"
echo ""

# Create S3 bucket
echo "Creating S3 bucket..."
if aws s3 ls "s3://${BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
  aws s3 mb "s3://${BUCKET_NAME}" --region "$AWS_REGION"
  echo "✓ S3 bucket created"
else
  echo "✓ S3 bucket already exists"
fi

# Enable versioning
echo "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled
echo "✓ Versioning enabled"

# Enable encryption
echo "Enabling encryption on S3 bucket..."
aws s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
echo "✓ Encryption enabled"

# Block public access
echo "Blocking public access on S3 bucket..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
echo "✓ Public access blocked"

# Create DynamoDB table
echo "Creating DynamoDB table..."
if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION" 2>&1 | grep -q 'ResourceNotFoundException'; then
  aws dynamodb create-table \
    --table-name "$DYNAMODB_TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$AWS_REGION" \
    --tags Key=Environment,Value="$ENVIRONMENT" Key=Project,Value=VoiceLiveness-Onboarder
  
  echo "Waiting for table to be active..."
  aws dynamodb wait table-exists --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION"
  echo "✓ DynamoDB table created"
else
  echo "✓ DynamoDB table already exists"
fi

# Enable point-in-time recovery
echo "Enabling point-in-time recovery on DynamoDB table..."
aws dynamodb update-continuous-backups \
  --table-name "$DYNAMODB_TABLE" \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region "$AWS_REGION"
echo "✓ Point-in-time recovery enabled"

echo ""
echo "✅ Terraform backend setup complete for environment: $ENVIRONMENT"
echo ""
echo "Backend configuration:"
echo "  bucket         = \"$BUCKET_NAME\""
echo "  key            = \"${ENVIRONMENT}/terraform.tfstate\""
echo "  region         = \"$AWS_REGION\""
echo "  encrypt        = true"
echo "  dynamodb_table = \"$DYNAMODB_TABLE\""
echo ""
echo "You can now initialize Terraform with:"
echo "  cd packages/serverless/terraform"
echo "  terraform init -backend-config=environments/backend-${ENVIRONMENT}.hcl"
