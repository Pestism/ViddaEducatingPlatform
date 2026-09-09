# QUICK SETUP - 5 Minutes to Running

**For developers who want to get started NOW.**

---

## ✅ Checklist

### **1. Prerequisites** (1 minute)
```bash
# Check you have these:
node --version    # Should be v18+
npm --version     # Should be v9+
psql --version    # Should be v14+
```

❌ Missing something? Install from:
- Node.js: https://nodejs.org/
- PostgreSQL: https://www.postgresql.org/download/

---

### **2. Clone & Install** (1 minute)
```bash
git clone <repo-url>
cd vidda-solutions
npm install
```

---

### **3. Database Setup** (2 minutes)
```bash
# Connect to PostgreSQL
psql postgres

# Run these 3 commands:
CREATE DATABASE vidda_today;
CREATE USER alekhya WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vidda_today TO alekhya;
\q
```

---

### **4. Environment** (30 seconds)
Create `.env` file:
```bash
DATABASE_URL="postgresql://alekhya:your_password@localhost:5432/vidda_today"
```

---

### **5. Migrate Database** (30 seconds)
```bash
npx prisma generate
npx prisma migrate dev --name init
```

---

### **6. Start!** (10 seconds)
```bash
npm run dev
```

Open: http://localhost:3000

**Done!** 🎉

---

## 🎬 First Demo

1. Click **KYC Analyst** card
2. Click **[🚀 Run ViddaGPT Analysis]**
3. Wait 2 seconds (mock mode)
4. Expand **Step 3: Inherent AML Risk**
5. Click **[✎ Modify]**
6. Edit something
7. Click **[💾 Save Changes]**
8. Click **[✓ Approve]**
9. Approve rest of steps
10. Click **[Next: View Training Path →]**

**You just saw the governance layer!** 🚀

---

## 🐛 If Something Breaks

**PostgreSQL not starting?**
```bash
# macOS
brew services start postgresql@14

# Linux
sudo systemctl start postgresql
```

**Port 3000 in use?**
```bash
lsof -ti:3000 | xargs kill -9
```

**Prisma errors?**
```bash
rm -rf node_modules
rm -rf .next
npm install
npx prisma generate
```

**Still broken?**
Read the full README.md for detailed troubleshooting.

---

## 🎯 That's It!

**5 minutes from zero to running.**

Need more details? Check **README.md** for the complete guide.

**Now go demo this thing!** 🚀
