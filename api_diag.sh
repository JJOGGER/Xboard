#!/usr/bin/env bash
set -euo pipefail

API_URL="https://mazucloud.icu/api/v2/passport/auth/login"
ORIGIN="https://mazucloud.shop"
 EMAIL="guanchenwei0719@gmail.com"
 PASSWORD="woai.123"
: "${EMAIL:?guanchenwei0719@gmail.com}"
: "${PASSWORD:?Please set PASSWORD env var}"

echo "== Basic =="
date
echo "API_URL=$API_URL"
echo "ORIGIN=$ORIGIN"
echo

echo "== DNS =="
( command -v dig >/dev/null && dig +short mazucloud.icu A && dig +short mazucloud.icu AAAA ) || true
( command -v nslookup >/dev/null && nslookup mazucloud.icu ) || true
echo

echo "== TCP/TLS quick check =="
# -v 会打印连接过程；--max-time 防止卡太久
curl -vkI --max-time 10 "https://mazucloud.icu/" || true
echo

echo "== Preflight (OPTIONS) =="
curl -vk -i --max-time 15 -X OPTIONS "$API_URL" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" || true
echo

echo "== POST (HTTP/2 default) =="
curl -vk -i --max-time 20 "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || true
echo

echo "== POST (force HTTP/1.1) =="
curl -vk --http1.1 -i --max-time 20 "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || true
echo

echo "== POST (force IPv4) =="
curl -vk -4 -i --max-time 20 "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || true
echo

echo "== POST (force IPv6) =="
curl -vk -6 -i --max-time 20 "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: $ORIGIN" \
  --data "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" || true
echo