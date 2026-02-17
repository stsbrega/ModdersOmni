#!/bin/sh
# Inject runtime environment variables into the Angular app
API_URL="${API_URL:-http://localhost:8000/api}"

# Create env-config.js with runtime values
cat <<EOF > /usr/share/nginx/html/env-config.js
(function(window) {
  window.__env = {
    API_URL: "${API_URL}"
  };
})(window);
EOF

exec "$@"
