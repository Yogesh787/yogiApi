#!/bin/bash

# Configuration Variables
SERVER_USER="root"
SERVER_IP="34.131.27.26"
LOCAL_NGINX_DIR="/home/yougalkumar/WebstormProjects/ssl/src/tokens/"
#REMOTE_NGINX_DIR="/etc/nginx/sites-available/"

# Step 3: Sync Nginx configuration to the server
echo "Updating Nginx configuration..."
rsync -avz -e "ssh" $LOCAL_NGINX_DIR $SERVER_USER@$SERVER_IP:/var/www/html/.well-known/acme-challenge
#ssh $SERVER_USER@$SERVER_IP "mv /var/www/html/.well-known/acme-challenge* $REMOTE_NGINX_DIR"
if [ $? -ne 0 ]; then
    echo "Failed to update Nginx configuration"
    exit 1
fi
echo "Nginx configuration updated successfully"

echo "upload completed successfully"
