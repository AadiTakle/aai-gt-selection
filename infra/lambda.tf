# Exam scoring as a standalone function (D-019).
# SKELETON — same posture as the rest of infra/: not wired to a live account, no state backend.
#
# This is the one piece of the system that genuinely suits a function rather than merely could be:
# `@gt-selection/exam-scoring` is pure (no database, no network, no framework), so it lifts out
# cleanly. Keeping scoring off the child's device is what stops a score being something the client
# can assert, and a pure function of a recorded trace is what makes the score reproducible — the
# claim every stored outcome row carries.
#
# The handler deliberately does NOT read the database. Which items are authoritative is decided by
# the caller (for a persisted session, the rows the database's own verifier wrote); re-deciding it
# here would put a second, competing answer in the system.

resource "aws_iam_role" "exam_scoring" {
  name = "gt-${var.environment}-exam-scoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Action    = "sts:AssumeRole"
        Principal = { Service = "lambda.amazonaws.com" }
      },
    ]
  })
}

# Logs only. The function takes its input in the event and returns the score — it reaches nothing,
# so it is granted nothing beyond writing its own logs.
resource "aws_iam_role_policy_attachment" "exam_scoring_logs" {
  role       = aws_iam_role.exam_scoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "exam_scoring" {
  name              = "/aws/lambda/gt-${var.environment}-exam-scoring"
  retention_in_days = var.lambda_log_retention_days
}

resource "aws_lambda_function" "exam_scoring" {
  function_name = "gt-${var.environment}-exam-scoring"
  role          = aws_iam_role.exam_scoring.arn
  runtime       = "nodejs22.x"
  handler       = "index.handler"
  architectures = ["arm64"]

  # Placeholder artifact. A real deployment bundles packages/exam-scoring (it has no runtime
  # dependencies) and publishes the zip; skeleton runs are validate-only.
  filename         = var.exam_scoring_artifact
  source_code_hash = filebase64sha256(var.exam_scoring_artifact)

  # Scoring one session is CPU-bound arithmetic over a few dozen items: small and quick. The
  # timeout is a guard against a pathological trace, not a budget the normal path uses.
  memory_size = 512
  timeout     = 15

  environment {
    variables = {
      GT_ENVIRONMENT = var.environment
      # Born-synthetic: the function must never be pointed at real applicant data.
      GT_SYNTHETIC_ONLY = "true"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.exam_scoring_logs,
    aws_cloudwatch_log_group.exam_scoring,
  ]
}
