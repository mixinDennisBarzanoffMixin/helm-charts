#!/usr/bin/env sh
set -eu

: "${UNIVERSER_UPSTREAM:?UNIVERSER_UPSTREAM is required (example: universer.railway.internal:8000)}"
: "${USIP_UPSTREAM:?USIP_UPSTREAM is required (example: veritly-usip.railway.internal:8080)}"

envsubst '${UNIVERSER_UPSTREAM} ${USIP_UPSTREAM}' \
  < /etc/nginx/templates/universer.conf.template \
  > /etc/nginx/conf.d/universer.conf

exec nginx -g 'daemon off;'
