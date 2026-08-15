# Aurora Serverless v2 (PostgreSQL) placeholder.
# SKELETON — credentials would come from Secrets Manager; subnet group omitted.

resource "aws_rds_cluster" "main" {
  cluster_identifier = "gt-${var.environment}"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  database_name      = "gt_selection"

  # Real values (master credentials, KMS, backup, RDS Proxy) are added when the
  # Supabase -> Aurora rebind lands under D-012. Placeholder to document intent.
  master_username = "gt_admin"
  # master_password sourced from Secrets Manager in a real deployment.

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 4.0
  }

  skip_final_snapshot = true
}
