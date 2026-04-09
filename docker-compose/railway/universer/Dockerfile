ARG EDITION=release
ARG UNIVERSER_VERSION=0.18.0
FROM univer-acr-registry.cn-shenzhen.cr.aliyuncs.com/${EDITION}/universer:${UNIVERSER_VERSION}

COPY configs /data/configs
RUN mkdir -p /tmp/univers /app/logs

EXPOSE 8000 9000
