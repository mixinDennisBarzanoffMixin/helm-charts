#!/usr/bin/env node
const lines = [
	"",
	"Univer Server is a multi-container Docker Compose stack (Postgres, Temporal, nginx, …).",
	"Railpack cannot build it as a single Node/Rust app from the helm-charts repo root.",
	"",
	"Do one of the following:",
	"",
	"1) Railway — Docker Compose (recommended)",
	"   In the Railway project: add services by importing docker-compose.yaml from the canvas",
	"   (see https://docs.railway.com/deploy/dockerfiles — “Docker compose” section).",
	"   Or create a service whose root directory is ONLY `docker-compose` and use Railway’s",
	"   Compose workflow if your plan supports it (not the default GitHub → Railpack path).",
	"",
	"2) Railway — wrong root",
	"   If you connected this repo: set Service → Settings → Root Directory to `docker-compose`",
	"   (monorepo: `vendor/helm-charts/docker-compose`). The repo root will always confuse Railpack.",
	"",
	"3) VM / local",
	"   cd docker-compose && bash run.sh start",
	"",
]
console.error(lines.join("\n"))
process.exit(1)
