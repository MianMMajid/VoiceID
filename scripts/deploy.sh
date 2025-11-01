#!/bin/bash

# Deployment script for VLO infrastructure
# Usage: ./deploy.sh <environment>

set -e

ENVIRONMENT=$1
AWS_REGION=${AWS_REGION:-us-east-1}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment>"
  echo "Example: $0 dev"
  echo ""
  echo "Available environments: dev, staging, prod"
  exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo "Error: Invalid environment '$ENVIRONMENT'"
  echo "Valid environments: dev, staging, prod"
  exit 1
fi

echo "========================================="
echo "VLO Deployment Script"
echo "========================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Project Root: $PROJECT_ROOT"
echo "========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "Error: npm is not installed"
  exit 1
fi

if ! command -v terraform &> /dev/null; then
  echo "Error: Terraform is not installed"
  exit 1
fi

if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed"
  exit 1
fi

echo "✓ All prerequisites met"
echo ""

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
  echo "Error: AWS credentials not configured"
  echo "Run: aws configure"
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✓ AWS Account: $ACCOUNT_ID"
echo ""

# Install dependencies
echo "Installing dependencies..."
cd "$PROJECT_ROOT"
npm ci
echo "✓ Dependencies installed"
echo ""

# Run tests
echo "Running tests..."
npm test
echo "✓ Tests passed"
echo ""

# Build packages
echo "Building packages..."
npm run build
echo "✓ Build complete"
echo ""

# Create Lambda deployment packages
echo "Creating Lambda deployment packages..."
cd "$PROJECT_ROOT/packages/serverless"

mkdir -p dist

# Create Lambda function package
echo "  Creating lambda.zip..."
zip -q -r dist/lambda.zip dist/ node_modules/ package.json
echo "  ✓ lambda.zip created ($(du -h dist/lambda.zip | cut -f1))"

# Create Lambda layer package
echo "  Creating layer.zip..."
mkdir -p layer/nodejs
cp -r node_modules layer/nodejs/
cd layer && zip -q -r ../dist/layer.zip . && cd ..
rm -rf layer
echo "  ✓ layer.zip created ($(du -h dist/layer.zip | cut -f1))"

echo "✓ Lambda packages created"
echo ""

# Initialize Terraform
echo "Initializing Terraform..."
cd "$PROJECT_ROOT/packages/serverless/terraform"

terraform init -backend-config="environments/backend-${ENVIRONMENT}.hcl" -reconfigure
echo "✓ Terraform initialized"
echo ""

# Terraform plan
echo "Running Terraform plan..."
terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out=tfplan
echo "✓ Terraform plan complete"
echo ""

# Confirm deployment
if [ "$ENVIRONMENT" = "prod" ]; then
  echo "========================================="
  echo "WARNING: Production Deployment"
  echo "========================================="
  echo "You are about to deploy to PRODUCTION."
  echo "This will affect live users."
  echo ""
  read -p "Are you sure you want to continue? (yes/no): " confirm
  
  if [ "$confirm" != "yes" ]; then
    echo "Deployment cancelled"
    exit 0
  fi
  echo ""
fi

# Apply Terraform
echo "Applying Terraform changes..."
terraform apply tfplan
echo "✓ Terraform apply complete"
echo ""

# Get outputs
echo "Deployment outputs:"
echo "========================================="
terraform output
echo "========================================="
echo ""

# Run smoke tests
echo "Running smoke tests..."
API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")

if [ -n "$API_URL" ]; then
  echo "Testing API Gateway endpoint: $API_URL"
  
  # Test health endpoint (if exists)
  if curl -s -f -o /dev/null "$API_URL/health" 2>/dev/null; then
    echo "✓ Health check passed"
  else
    echo "⚠ Health check endpoint not available (this is expected if not implemented)"
  fi
else
  echo "⚠ API Gateway URL not available"
fi

echo ""

# Deployment summary
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Timestamp: $(date)"
echo ""
echo "Next steps:"
echo "1. Monitor CloudWatch dashboard"
echo "2. Check CloudWatch logs for errors"
echo "3. Run integration tests"
echo "4. Monitor API Gateway metrics"
echo ""
echo "CloudWatch Dashboard:"
DASHBOARD_URL=$(terraform output -raw dashboard_url 2>/dev/null || echo "N/A")
echo "$DASHBOARD_URL"
echo ""
echo "========================================="
