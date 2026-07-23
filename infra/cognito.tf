# Cognito user pool placeholder. The JWT carries an admin-controlled
# custom:user_role claim that the app maps to its role gating (D-012).
# SKELETON — app clients, domains, and triggers are omitted.

resource "aws_cognito_user_pool" "main" {
  name = "gt-${var.environment}"

  schema {
    name                     = "user_role"
    attribute_data_type      = "String"
    developer_only_attribute = false
    mutable                  = true
    required                 = false

    string_attribute_constraints {
      min_length = 1
      max_length = 64
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = true
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "gt-${var.environment}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}
