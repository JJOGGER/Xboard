# Xboard Deployment Guide for aaPanel Environment

## Table of Contents
1. [Requirements](#requirements)
2. [Quick Deployment](#quick-deployment)
3. [Detailed Configuration](#detailed-configuration)
4. [Maintenance Guide](#maintenance-guide)
5. [Troubleshooting](#troubleshooting)

## Requirements

### Hardware Requirements
- CPU: 1 core or above
- Memory: 2GB or above
- Storage: 10GB+ available space

### Software Requirements
- Operating System: Ubuntu 20.04+ / Debian 10+ (⚠️ CentOS 7 is not recommended)
- Latest version of aaPanel
- PHP 8.2
- MySQL 5.7+
- Redis
- Nginx (any version)

## Quick Deployment

### 1. Install aaPanel
```bash
URL=https://www.aapanel.com/script/install_6.0_en.sh && \
if [ -f /usr/bin/curl ];then curl -ksSO "$URL" ;else wget --no-check-certificate -O install_6.0_en.sh "$URL";fi && \
bash install_6.0_en.sh aapanel
```

### 2. Basic Environment Setup

#### 2.1 Install LNMP Environment
In the aaPanel dashboard, install:
- Nginx (any version)
- MySQL 5.7
- PHP 8.2

#### 2.2 Install PHP Extensions
Required PHP extensions:
- redis
- fileinfo
- swoole
- readline
- event
- mbstring

#### 2.3 Enable Required PHP Functions
Functions that need to be enabled:
- putenv
- proc_open
- pcntl_alarm
- pcntl_signal

### 3. Site Configuration

#### 3.1 Create Website
1. Navigate to: aaPanel > Website > Add site
2. Fill in the information:
   - Domain: Enter your site domain
   - Database: Select MySQL
   - PHP Version: Select 8.2

#### 3.2 Deploy Xboard
```bash
# Enter site directory
cd /www/wwwroot/your-domain

# Clean directory
chattr -i .user.ini
rm -rf .htaccess 404.html 502.html index.html .user.ini

# Clone repository
git clone https://github.com/cedar2025/Xboard.git ./

# Install dependencies
sh init.sh
```

#### 3.3 Configure Site
1. Set running directory to `/public`
2. Add rewrite rules:
```nginx
location /downloads {
}

location / {  
    try_files $uri $uri/ /index.php$is_args$query_string;  
}

location ~ .*\.(js|css)?$
{
    expires      1h;
    error_log off;
    access_log /dev/null; 
}
```

## Detailed Configuration

### 1. Configure Daemon Process
1. Install Supervisor
2. Add queue daemon process:
   - Name: `Xboard`
   - Run User: `www`
   - Running Directory: Site directory
   - Start Command: `php artisan horizon`
   - Process Count: 1

### 2. Configure Scheduled Tasks
- Type: Shell Script
- Task Name: v2board
- Run User: www
- Frequency: 1 minute
- Script Content: `php /www/wwwroot/site-directory/artisan schedule:run`

### 3. Octane Configuration (Optional)
#### 3.1 Install Swoole Extension (Required for Octane)
⚠️ **Important**: Octane requires the Swoole PHP extension. If you haven't installed it yet:

**Method 1: Install via aaPanel (Recommended)**
1. Go to: aaPanel > App Store > PHP 8.2 > Settings
2. Find "swoole" extension and click "Install"
3. Wait for installation to complete

**Method 2: Install via Script**
```bash
cd /www/wwwroot/Xboard
chmod +x install-swoole.sh
./install-swoole.sh
```

**Method 3: Use RoadRunner Instead**
If you cannot install Swoole, you can use RoadRunner:
1. Install RoadRunner: `composer require spiral/roadrunner-cli --dev`
2. Set in `.env`: `OCTANE_SERVER=roadrunner`
3. Start Octane: `php artisan octane:start --server=roadrunner --port=7010`

**Verify Installation:**
```bash
php -m | grep swoole
# Should output: swoole
```

#### 3.2 Add Octane Daemon Process
- Name: Octane
- Run User: www
- Running Directory: Site directory
- Start Command: `/www/server/php/82/bin/php artisan octane:start --server=swoole --host=0.0.0.0 --port=7010`
- Process Count: 1

#### 3.2 Octane-specific Rewrite Rules
```nginx
location ~* \.(jpg|jpeg|png|gif|js|css|svg|woff2|woff|ttf|eot|wasm|json|ico)$ {
}

location ~ .* {
    proxy_pass http://127.0.0.1:7010;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Real-PORT $remote_port;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $http_host;
    proxy_set_header Scheme $scheme;
    proxy_set_header Server-Protocol $server_protocol;
    proxy_set_header Server-Name $server_name;
    proxy_set_header Server-Addr $server_addr;
    proxy_set_header Server-Port $server_port;
}
```

## Maintenance Guide

### Version Updates
```bash
# Enter site directory
cd /www/wwwroot/your-domain

# Execute update script
git fetch --all && git reset --hard origin/master && git pull origin master
sh update.sh

# If Octane is enabled, restart the daemon process
# aaPanel > App Store > Tools > Supervisor > Restart Octane
```

### Routine Maintenance
- Regular log checking
- Monitor system resource usage
- Regular backup of database and configuration files

## Troubleshooting

### Common Issues

#### 1. Octane Startup Error: "The Swoole extension is missing"
**Solution:**
```bash
# Install Swoole extension
cd /www/wwwroot/Xboard
chmod +x install-swoole.sh
./install-swoole.sh

# Or install via aaPanel:
# App Store > PHP 8.2 > Settings > Install "swoole"

# Verify installation
php -m | grep swoole

# Restart Octane
supervisorctl restart xboard-octane
```

#### 2. Octane Startup Error: "The project starts abnormally!"
**Possible Causes:**
- Missing Swoole extension (see issue #1)
- Port already in use
- PHP configuration error

**Solution:**
```bash
# Check if port is in use
netstat -tlnp | grep 7010

# Check Octane logs
tail -f /tmp/octane.log

# Check Laravel logs
tail -f storage/logs/laravel.log

# Try starting manually to see errors
php artisan octane:start --server=swoole --host=0.0.0.0 --port=7010
```

#### 3. Other Common Issues
- Changes to admin path require service restart to take effect
- Any code changes after enabling Octane require restart to take effect
- When PHP extension installation fails, check if PHP version is correct
- For database connection failures, check database configuration and permissions 
