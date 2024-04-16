#!/bin/bash

# Configuration Variables
TEMPLATE_PATH="src/script/nginx_vhost_template.conf"
OUTPUT_DIR="src/configuration/"
SSL_CERTS_DIR="/etc/nginx/ssl/"
STATIC_FILES_BASE_DIR="/var/www/html"

# Function to generate Nginx config
generate_nginx_config() {
    DOMAIN_NAME=$1
    ACCOUNT_URL=$2

    # Replace placeholders in the template
    CONFIG=$(cat $TEMPLATE_PATH)
    CONFIG="${CONFIG//\{\{DOMAIN_NAME\}\}/$DOMAIN_NAME}"
    CONFIG="${CONFIG//\{\{ACCOUNT_URL\}\}/$ACCOUNT_URL}"
    CONFIG="${CONFIG//\{\{SSL_CERT_PATH\}\}/$SSL_CERTS_DIR$DOMAIN_NAME.crt}"
    CONFIG="${CONFIG//\{\{SSL_KEY_PATH\}\}/$SSL_CERTS_DIR$DOMAIN_NAME.key}"
    CONFIG="${CONFIG//\{\{STATIC_FILES_PATH\}\}/$STATIC_FILES_BASE_DIR}"

    # Output the configuration to the appropriate file
    echo "$CONFIG" > "$OUTPUT_DIR$DOMAIN_NAME.conf"
    echo "Nginx configuration for $DOMAIN_NAME, with $ACCOUNT_URL generated."
}

# Example usage
DOMAIN=$1
ACCOUNT_URL=$2
generate_nginx_config $DOMAIN $ACCOUNT_URL
