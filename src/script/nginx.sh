#!/bin/bash

# Configuration Variables
SERVER_USER="root"
SERVER_IP="34.131.27.26"
#LOCAL_STATIC_DIR="./static_files/"
#REMOTE_STATIC_DIR="/var/www/your_website"
LOCAL_NGINX_DIR="./src/sslCertificates/"
LOCAL_NGINX_DIR1="./src/configuration/"
REMOTE_NGINX_DIR="/etc/nginx/sites-available/"
CERT_NGINX_DIR="/etc/nginx/ssl/"
CERT_API_URL="http://localhost:5197/domains/"
DOMAIN_NAME=$1


# Step 2.5: Sync Nginx configuration to the server
echo "Updating Certificates..."
rsync -avz -e "ssh" $LOCAL_NGINX_DIR $SERVER_USER@$SERVER_IP:$CERT_NGINX_DIR
if [ $? -ne 0 ]; then
    echo "Failed to update Nginx configuration"
    exit 1
fi
echo "Nginx configuration updated successfully"

# Step 3: Sync Nginx configuration to the server
echo "Updating Nginx configuration..."
rsync -avz -e "ssh" $LOCAL_NGINX_DIR1 $SERVER_USER@$SERVER_IP:$REMOTE_NGINX_DIR
ssh $SERVER_USER@$SERVER_IP "rm /etc/nginx/sites-enabled/$DOMAIN_NAME.conf && ln -s /etc/nginx/sites-available/$DOMAIN_NAME.conf /etc/nginx/sites-enabled/"
if [ $? -ne 0 ]; then
    echo "Failed to update Nginx configuration"
    exit 1
fi
echo "Nginx configuration updated successfully"

# Step 4: Check Nginx Configuration
echo "Checking Nginx Configuration..."
ssh $SERVER_USER@$SERVER_IP "nginx -t"
if [ $? -ne 0 ]; then
    echo "Wrong Nginx Configuration"
    exit 1
fi
echo "Nginx Configuration is correct"

# Step 5: Reload Nginx
echo "Reloading Nginx..."
ssh $SERVER_USER@$SERVER_IP "systemctl reload nginx"
if [ $? -ne 0 ]; then
    echo "Failed to reload Nginx"
    exit 1
fi
echo "Nginx reloaded successfully"

echo "Deployment completed successfully"
