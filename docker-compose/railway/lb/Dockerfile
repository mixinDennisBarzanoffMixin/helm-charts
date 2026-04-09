FROM nginx:alpine-slim

RUN apk add --no-cache gettext

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/universer.conf.template /etc/nginx/templates/universer.conf.template
COPY entrypoint.lb.sh /usr/local/bin/entrypoint-lb.sh

RUN chmod +x /usr/local/bin/entrypoint-lb.sh

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint-lb.sh"]
