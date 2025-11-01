#!/bin/bash

# Load environment variables from .env file
# Usage: source ./scripts/load-env.sh

set -a  # automatically export all variables
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    source .env
    echo "✓ Environment variables loaded"
    echo ""
    echo "Loaded variables:"
    echo "  - TF_VAR_openai_api_key: ${TF_VAR_openai_api_key:0:20}..."
    echo "  - TF_VAR_elevenlabs_api_key: ${TF_VAR_elevenlabs_api_key:0:20}..."
    echo "  - TF_VAR_alert_email: ${TF_VAR_alert_email}"
else
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and fill in your API keys."
    exit 1
fi
set +a
