# GT admissions portal — deployment skeleton (D-012).
# SKELETON ONLY: not wired to a live account, no state backend, no credentials.
# Parse with:  terraform init -backend=false && terraform validate

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # A real deployment would configure an S3 + DynamoDB backend here.
  # backend "s3" {}
}

provider "aws" {
  region = var.aws_region

  # Placeholder: a real deployment supplies credentials via the environment or
  # an assumed role. Skeleton runs are validate-only.
  default_tags {
    tags = {
      Project   = "gt-selection-capstone"
      Component = "family-portal"
      ManagedBy = "terraform-skeleton"
      Decision  = "D-012"
    }
  }
}
