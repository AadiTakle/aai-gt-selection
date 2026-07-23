# ECS Fargate placeholders: cluster, task definition, service.
# SKELETON — the task role, execution role, and log config are illustrative.

resource "aws_ecs_cluster" "main" {
  name = "gt-${var.environment}"
}

resource "aws_ecs_task_definition" "web" {
  family                   = "gt-${var.environment}-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = var.container_image
      essential = true
      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = tostring(var.container_port) }
        # Real DB/auth env (Aurora via RDS Proxy, Cognito) is injected from
        # Secrets Manager once the env-guard relaxation lands under D-012.
      ]
    }
  ])
}

resource "aws_ecs_service" "web" {
  name            = "gt-${var.environment}-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = []
    security_groups = [aws_security_group.service.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = var.container_port
  }
}
