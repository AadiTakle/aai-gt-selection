variable "aws_region" {
  description = "AWS region for the deployment."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name (e.g. staging, prod)."
  type        = string
  default     = "staging"
}

variable "container_image" {
  description = "ECR image URI for the Next.js family portal (built from apps/web/Dockerfile)."
  type        = string
  default     = "PLACEHOLDER.dkr.ecr.us-east-1.amazonaws.com/gt-web:latest"
}

variable "container_port" {
  description = "Port the Next.js server listens on inside the container."
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Number of Fargate tasks to run."
  type        = number
  default     = 2
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC placeholder."
  type        = string
  default     = "10.20.0.0/16"
}
