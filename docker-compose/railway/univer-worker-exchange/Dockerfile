ARG UNIVER_WORKER_EXCHANGE_VERSION=0.18.0
FROM univer-acr-registry.cn-shenzhen.cr.aliyuncs.com/release/worker-exchange:${UNIVER_WORKER_EXCHANGE_VERSION}

COPY exchange /data/configs
RUN mkdir -p /app/logs

CMD ["/app/worker", "-conf", "/data/configs/config.yaml"]
