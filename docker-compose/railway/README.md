## Railway Service Layout

This folder provides per-service deployment paths so you can point Railway at:

- Root Directory: `vendor/helm-charts/docker-compose`
- Dockerfile Path: `railway/<service>/Dockerfile`

Railway reads `railway.json` from the selected root; per-service `railway.json` files here are templates you can copy into the service's settings or use as reference.

### Services

- `railway/lb/Dockerfile`
- `railway/universer/Dockerfile`
- `railway/collaboration-envoy/Dockerfile`
- `railway/univer-temporal/Dockerfile`
- `railway/univer-worker-exchange/Dockerfile`

### Required env vars

- `lb`: `UNIVERSER_UPSTREAM`, `USIP_UPSTREAM`
- `universer`: `EDITION`, `UNIVERSER_VERSION`
- `univer-temporal`: `TEMPORAL_VERSION`
- `univer-worker-exchange`: `UNIVER_WORKER_EXCHANGE_VERSION`

