---
description: Debug XBoard Admin API With Token
---

This workflow helps you debug XBoard V2 Admin APIs (e.g. `GET /api/v2/{secure_path}/shared-plans`) by:

- Logging in via API to obtain a Bearer token
- Reusing the token for subsequent curl calls

## 1) Identify `secure_path`

`secure_path` is the dynamic prefix used by V2 admin routes.

Run on the server (project root):

```bash
php artisan route:list | grep "api/v2/" | head
php artisan route:list | grep shared-plans
```

The route output will show a prefix like:

- `api/v2/f81187fc/shared-plans`

So your `SECURE_PATH` is `f81187fc`.

## 2) Login as admin and capture token

Replace the following variables:

- `BASE` (your site domain)
- `EMAIL`
- `PASSWORD`

Then run:

```bash
BASE="https://your-domain.example"
EMAIL="admin@example.com"
PASSWORD="your-password"

TOKEN=$(curl -sS -X POST "$BASE/api/v2/passport/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | sed -n 's/.*"auth_data"\s*:\s*"\([^"]*\)".*/\1/p')

# Some deployments return `token` instead of `auth_data`.
if [ -z "$TOKEN" ]; then
  TOKEN=$(curl -sS -X POST "$BASE/api/v2/passport/auth/login" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data-binary "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
    | sed -n 's/.*"token"\s*:\s*"\([^"]*\)".*/\1/p')
fi

echo "TOKEN=${TOKEN:0:20}..."
```

If your API returns `Bearer xxx` format, you can keep it; otherwise you can prepend `Bearer ` in the next step.

## 3) Call admin API with token

Set your secure path:

```bash
SECURE_PATH="f81187fc"
```

Then call:

```bash
curl -i -sS "$BASE/api/v2/$SECURE_PATH/shared-plans" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

## 4) Common debug calls

### Fetch shared plan detail

```bash
PLAN_ID=1
curl -i -sS "$BASE/api/v2/$SECURE_PATH/shared-plans/$PLAN_ID" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### Fetch backend config (for verifying `secure_path` settings)

```bash
curl -i -sS "$BASE/api/v2/$SECURE_PATH/config/fetch" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

## 5) If you see 401/403

- 401 typically means token is missing/invalid/expired
- 403 typically means the token is valid but the account is not admin

## 6) If you see 500

Check Laravel logs:

```bash
cd /www/wwwroot/mazu

tail -n 200 storage/logs/laravel.log
```
