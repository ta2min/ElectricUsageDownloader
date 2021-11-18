terraform {
  required_version = "1.0.7"
  required_providers {
      aws = {
          version = "~> 3.0"
      }
  }
}

provider "aws" {
  region = "ap-northeast-1"
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

resource "aws_s3_bucket" "electric_fee_bucket" {
  bucket = "electric-fee-${var.account_id}-ap-notheast-1"
  acl    = "private"

  versioning {
    enabled = true
  }
}

resource "aws_iam_policy" "electric_fee_s3_policy" {
  name   = "electric-fee-s3-policy"
  policy = <<-EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${aws_s3_bucket.electric_fee_bucket.bucket}/*"
        },
        {
            "Sid": "VisualEditor1",
            "Effect": "Allow",
            "Action": "s3:PutObject",
            "Resource": "arn:aws:s3:::${aws_s3_bucket.electric_fee_bucket.bucket}/*"
        },
        {
            "Sid": "VisualEditor2",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::*"
        }
    ]
}
EOF
}

resource "aws_iam_user" "electric_fee_batch" {
  name = "electric_fee_batch"
}

resource "aws_iam_user_policy_attachment" "electric_policy_attachment" {
  user = aws_iam_user.electric_fee_batch.name
  policy_arn = aws_iam_policy.electric_fee_s3_policy.arn
}

resource "aws_iam_access_key" "electric_fee_batch_key" {
  user = aws_iam_user.electric_fee_batch.name
  pgp_key = var.pgp_key
}

resource "aws_iam_user_login_profile" "electric_fee_batch_profile" {
  user = aws_iam_user.electric_fee_batch.name
  pgp_key = var.pgp_key
  password_reset_required = false
  depends_on = [aws_iam_user.electric_fee_batch]
}

output "first_password" {
  value = aws_iam_user_login_profile.electric_fee_batch_profile.encrypted_password
  description = "IAMユーザの暗号化されたパスワード"
}

output "secret_access" {
  value = aws_iam_access_key.electric_fee_batch_key.encrypted_secret
  description = "IAMユーザの暗号化されたシークレットキー"
}