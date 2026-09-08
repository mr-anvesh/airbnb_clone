#!/bin/sh
# Only substitute ${PORT} — leaves all nginx $variables untouched
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
