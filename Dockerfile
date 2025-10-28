FROM webdevops/php-nginx:8.2
ENV TZ=Europe/Rome \
    WEB_DOCUMENT_ROOT=/app \
    PHP_DISPLAY_ERRORS=0 \
    PHP_MEMORY_LIMIT=256M \
    PHP_MAX_EXECUTION_TIME=30
COPY . /app


