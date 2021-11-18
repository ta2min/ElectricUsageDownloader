variable "account_id" {}
variable "aws_access_key" {}
variable "aws_secret_key" {}

variable "pgp_key" {
  description = "IAMユーザーのパスワード生成で利用するpgpの公開鍵(base64形式)"
  type        = string
}