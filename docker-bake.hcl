variable "DOCKER_USERNAME" {
  default = "yourusername"
}

variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["frontend", "backend"]
}

target "frontend" {
  context    = "./frontend"
  dockerfile = "Dockerfile"
  tags       = ["${DOCKER_USERNAME}/scaler-frontend:${TAG}"]
  platforms  = ["linux/amd64"]
}

target "backend" {
  context    = "./backend"
  dockerfile = "Dockerfile"
  tags       = ["${DOCKER_USERNAME}/scaler-backend:${TAG}"]
  platforms  = ["linux/amd64"]
}
