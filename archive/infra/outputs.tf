output "cloudfront_domain" {
  description = "Public CloudFront domain for the family portal."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "alb_dns_name" {
  description = "Internal ALB DNS name (origin for CloudFront)."
  value       = aws_lb.public.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster running the Fargate service."
  value       = aws_ecs_cluster.main.name
}

output "cognito_user_pool_id" {
  description = "Cognito user pool id backing authentication."
  value       = aws_cognito_user_pool.main.id
}
