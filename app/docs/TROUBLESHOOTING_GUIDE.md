# TROUBLESHOOTING GUIDE
## Quick fixes for common issues

---

## 🚨 COMMON ISSUES & INSTANT FIXES

### 1. "Can't reach database server"

**Symptoms:**
```
Error: P1001
Can't reach database server at localhost:5432
```

**Fix:**
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it:
brew services start postgresql@14
# or
sudo service postgresql start

# Verify connection
psql -h localhost -p 5432 -l
```

---

### 2. "Module not found: @/lib/db"

**Symptoms:**
```
Error: Cannot find module '@/lib/db'
```

**Fix:**
```bash
# Check if lib files exist
ls -la lib/db.ts lib/audit.ts

# If missing, recreate them from the output files
# Check tsconfig.json has correct paths:
cat tsconfig.json | grep "@"

# Should show:
# "paths": {
#   "@/*": ["./*"]
# }
```

---

### 3. "API returns HTML instead of JSON"

**Symptoms:**
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Fix:**
```bash
# Check API file exists in correct location
ls pages/api/analysis/run.ts
ls pages/api/analysis/[id].ts

# Test API directly
curl http://localhost:3000/api/roles/import -X POST

# Should return JSON, not HTML
# If HTML, check:
# 1. File is in pages/api/ not app/api/
# 2. Export default function handler() exists
# 3. No TypeScript errors: npx tsc --noEmit
```

---

### 4. "Hydration mismatch warning"

**Symptoms:**
```
Warning: A tree hydrated but some attributes didn't match
```

**Impact:** Cosmetic only - app works fine

**Fix (optional):**
In `app/page.tsx`, find audit trail section and use static timestamps:
```typescript
// Change from:
{new Date().toISOString()}

// To:
2024-05-17T09:15:00.000Z
```

---

### 5. "Prisma Client not generated"

**Symptoms:**
```
Cannot find module '@prisma/client'
```

**Fix:**
```bash
npx prisma generate
npm install @prisma/client
```

---

### 6. "Tables don't exist"

**Symptoms:**
```
Error: relation "Role" does not exist
```

**Fix:**
```bash
# Run migration
npx prisma migrate dev --name init

# If that fails, reset database
npx prisma migrate reset
npx prisma migrate dev --name init
```

---

### 7. "Port 3000 already in use"

**Symptoms:**
```
Error: Port 3000 is already in use
```

**Fix:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm run dev
```

---

### 8. "Authentication error with Claude API"

**Symptoms:**
```
Error: Could not resolve authentication method
```

**Current Setup:** Using MOCK version (no API key needed)

**Future Fix (when using real API):**
```bash
# Add real Anthropic API key to .env
echo 'ANTHROPIC_API_KEY="sk-ant-YOUR_KEY"' >> .env

# Verify it's set
cat .env | grep ANTHROPIC_API_KEY
```

---

### 9. "Module duration type error"

**Symptoms:**
```
Type 'Decimal' is not assignable to type 'number'
```

**Fix:**
In frontend when displaying duration:
```typescript
// Use Number() to convert Decimal
duration: Number(m.duration)
```

---

### 10. "Import path error in API"

**Symptoms:**
```
Cannot find module '../../../lib/db'
```

**Fix:**
Use `@/lib/db` instead:
```typescript
// Change from:
import { db } from '../../../lib/db';

// To:
import { db } from '@/lib/db';
```

---

## 🔄 NUCLEAR OPTION: Complete Reset

If everything is broken, start fresh:

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Clear everything
rm -rf node_modules .next
rm -rf prisma/migrations

# 3. Reinstall
npm install

# 4. Recreate database
dropdb vidda_today
createdb vidda_today

# 5. Run migration
npx prisma migrate dev --name init

# 6. Start server
npm run dev

# 7. Test: http://localhost:3000
```

---

## 🧪 DIAGNOSTIC COMMANDS

Run these to diagnose issues:

```bash
# 1. Check Node/npm versions
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher

# 2. Check PostgreSQL
psql --version
pg_isready

# 3. Check database
psql vidda_today -c "\dt"

# 4. Check file structure
tree -L 3 -I node_modules

# 5. Check environment variables
cat .env

# 6. Check TypeScript
npx tsc --noEmit

# 7. Check API endpoints
curl http://localhost:3000/api/roles/import -X POST
```

---

## 📞 STILL STUCK?

1. Check the browser console (F12)
2. Check terminal running `npm run dev` for errors
3. Check database logs: `tail -f /usr/local/var/log/postgresql@14.log`
4. Search error message in Next.js docs: https://nextjs.org/docs

---

## ✅ VERIFICATION CHECKLIST

Before asking for help, verify:

- [ ] PostgreSQL is running: `pg_isready`
- [ ] Database exists: `psql -l | grep vidda_today`
- [ ] .env has DATABASE_URL
- [ ] Files in correct locations: `ls pages/api/`
- [ ] Dependencies installed: `ls node_modules`
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Dev server running: `npm run dev`
- [ ] Port 3000 accessible: `curl http://localhost:3000`

---

## 🎯 MOST COMMON FIXES (90% of issues)

1. **Restart dev server** (Ctrl+C, then `npm run dev`)
2. **Clear .next folder** (`rm -rf .next`)
3. **Regenerate Prisma client** (`npx prisma generate`)
4. **Check DATABASE_URL in .env**
5. **Make sure PostgreSQL is running**

**Try these first before deep debugging!**
