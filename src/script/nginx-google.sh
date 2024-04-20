#!/bin/bash

# Configuration Variables
SERVER_USER="root"
SERVER_IP="34.131.27.26"
#LOCAL_STATIC_DIR="./static_files/"
#REMOTE_STATIC_DIR="/var/www/your_website"
LOCAL_NGINX_DIR="/home/yougalkumar/WebstormProjects/ssl/src/sslCertificates/"
LOCAL_NGINX_DIR1="/home/yougalkumar/WebstormProjects/ssl/src/configuration/"
REMOTE_NGINX_DIR="/etc/nginx/sites-available/"
CERT_NGINX_DIR="/etc/nginx/ssl/"
CERT_MAILCHIMP_API_URL="http://localhost:5197/domains/"
DOMAIN_NAME=$1

# Step 1: Fetch SSL certificates
#echo "Fetching SSL certificates for $DOMAIN_NAME"
#curl -s "$CERT_MAILCHIMP_API_URL$DOMAIN_NAME/certificate" # -o "$LOCAL_NGINX_DIR$DOMAIN_NAME.crt"
#if [ $? -ne 0 ]; then
#    echo "Failed to fetch SSL certificates"
#    exit 1
#fi
#echo "Certificates fetched successfully"

# Step 2: Sync static files to the server
#echo "Syncing static files to the server..."
#scp -r $LOCAL_STATIC_DIR $SERVER_USER@$SERVER_IP:$REMOTE_STATIC_DIR
#if [ $? -ne 0 ]; then
#    echo "Failed to sync static files"
#    exit 1
#fi
#echo "Static files synced successfully"

# Step 2.5: Sync Nginx configuration to the server
echo "Updating Nginx configuration..."
rsync -avz -e "ssh" $LOCAL_NGINX_DIR $SERVER_USER@$SERVER_IP:/etc/nginx/ssl
ssh $SERVER_USER@$SERVER_IP "mv /etc/nginx/ssl/* $CERT_NGINX_DIR"
if [ $? -ne 0 ]; then
    echo "Failed to update Nginx configuration"
    exit 1
fi
echo "Nginx configuration updated successfully"

# Step 3: Sync Nginx configuration to the server
echo "Updating Nginx configuration..."
rsync -avz -e "ssh" $LOCAL_NGINX_DIR1 $SERVER_USER@$SERVER_IP:/tmp/xxx
ssh $SERVER_USER@$SERVER_IP "mv /tmp/xxx/* $REMOTE_NGINX_DIR"
if [ $? -ne 0 ]; then
    echo "Failed to update Nginx configuration"
    exit 1
fi
echo "Nginx configuration updated successfully"

# Step 4: Check Nginx Configuration
echo "Checking Nginx Configuration..."
echo "yougalkumar" | ssh $SERVER_USER@$SERVER_IP "nginx -t"
if [ $? -ne 0 ]; then
    echo "Wrong Nginx Configuration"
    exit 1
fi
echo "Nginx Configuration is correct"

# Step 5: Reload Nginx
# Run only first time - ln -s /etc/nginx/sites-available/* /etc/nginx/sites-enabled/
echo "Reloading Nginx..."
echo "yougalkumar" | ssh $SERVER_USER@$SERVER_IP "systemctl reload nginx"
if [ $? -ne 0 ]; then
    echo "Failed to reload Nginx"
    exit 1
fi
echo "Nginx reloaded successfully"

echo "Deployment completed successfully"
