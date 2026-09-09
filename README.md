# Vidda Solutions - AI-Powered Compliance Training Generator

**Zero Black Boxes. Complete Governance. Real Transparency.**

Vidda Solutions generates role-specific AML compliance training curricula using AI, with full human oversight, inline editing, and complete audit trails. Every decision is transparent, auditable, and explainable.

---

## 🎯 What Is This?

Vidda Solutions transforms compliance training from a black box into a transparent, governable process:

- **AI-Powered Generation**: ViddaGPT analyzes role descriptions and generates 22 personalized training modules mapped to AMLR 2024/1624 Articles 9-15
- **Human-in-the-Loop Governance**: 7-step validation framework with expandable details and inline editing
- **Complete Auditability**: Every analysis decision, modification, and approval logged with timestamps
- **Knowledge/Skills/Judgment Framework**: Training mapped to competencies, not just compliance checkboxes
- **Role-Specific Curricula**: Different training for MLRO, KYC Analyst, Transaction Monitoring, Customer Advisors, and AML DDI Managers

---

## 🚀 Features

### **1. Role Selection (Step 1)**
Select from 5 compliance roles:
- 👔 **AML DDI Manager** (Band H) - Third-party risk oversight
- 📞 **Customer Advisor** (Band F) - Onboarding and first contact
- ⚖️ **MLRO** (Band 5) - Ultimate SAR accountability
- 🔍 **Transaction Monitoring Analyst** (Band G) - Alert review
- 🛡️ **KYC Analyst** (Band G) - Identity verification

Each role includes risk level badges, band classification, and specific responsibilities.

### **2. ViddaGPT Analysis (Step 2)**
- **Mock Mode**: 2-second generation of 22 modules (no API key needed)
- **Real Claude API Mode**: Full AI-powered analysis (requires Anthropic API key)
- Generates quarterly curriculum (Q1 Foundation → Q4 Embedding)
- Maps to AMLR Articles 9-15 automatically

### **3. Governance Layer (Step 3)** ⭐ **THE MONEY SHOT**
7-step validation framework with **inline editing**:

1. **Role Function** - Job title, department, primary function
2. **Main Responsibilities** - All 8 core duties
3. **Inherent AML Risk** - Risk exposures with HIGH/CRITICAL badges
4. **Risk Themes** - Primary/secondary/tertiary analysis
5. **Regulatory Obligations** - AMLR Articles 9-15 requirements
6. **Competencies (K/S/J)** - Knowledge, Skills, Judgment mapping
7. **Training Focus** - Q1-Q4 module distribution

**For each step:**
- Click to expand and see details
- Click [✎ Modify] to edit fields inline
- Text areas for descriptions, dropdowns for risk levels
- [💾 Save Changes] to save (without auto-approving)
- [✓ Approve] when satisfied
- [✗ Reject] to block progress
- Multiple modification rounds supported

**Visual Status:**
- ⏸️ Pending (not reviewed)
- ✅ Approved (green border)
- ❌ Rejected (red border)
- [MODIFIED] badge for edited steps

### **4. Training Path (Step 4)**
- **22 Modules** distributed across Q1-Q4
- Click any module to see **explainability panel**:
  - Why this module was assigned (plain English)
  - Risk alignment (which risks it addresses)
  - AMLR Articles covered (9-15)
  - K/S/J competencies (knowledge/skills/judgment breakdown)

### **5. LMS Assignment (Step 5)**
- Summary statistics (total modules, mandatory count, hours, articles)
- Employee assignment input
- **Complete audit trail** showing all logged events

---

## 📋 Prerequisites

### **Required Software**
- **Node.js**: v18.x or higher ([Download](https://nodejs.org/))
- **npm**: v9.x or higher (comes with Node.js)
- **PostgreSQL**: v14.x or higher ([Download](https://www.postgresql.org/download/))

### **Optional**
- **Anthropic API Key** (for real AI generation - not needed for mock mode)
  - Get one at: https://console.anthropic.com/settings/keys

### **System Requirements**
- macOS, Windows, or Linux
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space

---

## 🛠️ Installation

### **Step 1: Clone the Repository**

```bash
git clone <your-repo-url>
cd vidda-solutions
```

### **Step 2: Install Dependencies**

```bash
npm install
```

This installs:
- Next.js 14 (React framework)
- Prisma (database ORM)
- TypeScript
- Tailwind CSS
- Other dependencies

### **Step 3: Set Up PostgreSQL Database**

#### **Option A: Local PostgreSQL**

1. **Install PostgreSQL** (if not already installed)
   - macOS: `brew install postgresql@14`
   - Windows: Download from https://www.postgresql.org/download/
   - Linux: `sudo apt-get install postgresql-14`

2. **Start PostgreSQL Service**
   ```bash
   # macOS with Homebrew
   brew services start postgresql@14
   
   # Linux
   sudo systemctl start postgresql
   
   # Windows - starts automatically
   ```

3. **Create Database**
   ```bash
   # Connect to PostgreSQL
   psql postgres
   
   # Create database
   CREATE DATABASE vidda_today;
   
   # Create user (if needed)
   CREATE USER alekhya WITH PASSWORD 'your_password';
   
   # Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE vidda_today TO alekhya;
   
   # Exit
   \q
   ```

#### **Option B: Docker PostgreSQL**

```bash
# Pull PostgreSQL image
docker pull postgres:14

# Run PostgreSQL container
docker run --name vidda-postgres \
  -e POSTGRES_DB=vidda_today \
  -e POSTGRES_USER=alekhya \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:14

# Check it's running
docker ps
```

### **Step 4: Configure Environment**

Create `.env` file in project root:

```bash
# Database connection
DATABASE_URL="postgresql://alekhya:your_password@localhost:5432/vidda_today"

# Optional: Anthropic API key (for real AI mode)
# ANTHROPIC_API_KEY="sk-ant-api03-..."
```

**Important Notes:**
- Replace `your_password` with your actual PostgreSQL password
- Replace `alekhya` with your PostgreSQL username if different
- If using Docker, use `localhost:5432` (default)
- If PostgreSQL is on a different port, change `5432` to your port

### **Step 5: Run Database Migrations**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Verify tables were created
npx prisma studio
```

This creates 5 tables:
- **Role** - Compliance roles with exposures and responsibilities
- **AnalysisRun** - ViddaGPT pipeline executions
- **Module** - Training modules with competencies
- **Enrollment** - LMS assignments
- **AuditLog** - Complete event trail

### **Step 6: Seed Initial Data (Optional)**

You can import the 5 roles via the API after starting the app, or seed them now:

```bash
# Create a seed script (prisma/seed.ts) if you want
# Or import via API after starting (recommended)
```

### **Step 7: Start Development Server**

```bash
npm run dev
```

**Server will start at:** http://localhost:3000

---

## 🎬 First Run

### **1. Import Your First Role**

Navigate to http://localhost:3000

**Option A: Via UI** (Recommended)
- You'll see 5 role cards
- Click on any role (e.g., KYC Analyst)
- Role imports automatically

**Option B: Via API**
```bash
curl -X POST http://localhost:3000/api/roles/import \
  -H "Content-Type: application/json" \
  -d '{"role_key": "kyc-analyst"}'
```

Available role keys:
- `aml-ddi-manager`
- `customer-advisor`
- `mlro`
- `tm-analyst`
- `kyc-analyst`

### **2. Run Analysis**

Click **[🚀 Run ViddaGPT Analysis]**

**Mock Mode** (default - no API key needed):
- Generates 22 modules in 2 seconds
- Uses pre-defined module data
- Perfect for demos and testing

**Real AI Mode** (requires API key):
- Takes 20-30 seconds
- Calls Claude API for real analysis
- Costs ~$0.10-0.20 per run

### **3. Validate with Governance**

**Step 3 - The Governance Layer:**

1. **Expand any step** (e.g., "Step 3: Inherent AML Risk")
2. **Review the analysis** (risk exposures, descriptions, levels)
3. **Click [✎ Modify]** to edit inline
4. **Make changes** (edit text, change risk levels)
5. **Click [💾 Save Changes]** (saves without approving)
6. **Review again** (can modify multiple times)
7. **Click [✓ Approve]** when satisfied

Repeat for all 7 steps.

### **4. View Training Modules**

**Step 4 - Training Path:**
- See 22 modules across Q1-Q4
- Click any module for explainability
- View why it was assigned, risks addressed, competencies mapped

### **5. Assign to LMS**

**Step 5 - LMS Assignment:**
- Enter employee email
- Click **[Assign Training Path]**
- View complete audit trail

---

## 📁 Project Structure

```
vidda-solutions/
├── app/
│   ├── page.tsx                    # Main UI (1030 lines - governance + inline editing)
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Tailwind styles
│
├── pages/api/                      # API Routes (Next.js Pages Router)
│   ├── roles/
│   │   └── import.ts              # POST /api/roles/import (5 roles)
│   ├── analysis/
│   │   ├── run.ts                 # POST /api/analysis/run (mock version)
│   │   └── [id].ts                # GET /api/analysis/:id (fetch modules)
│
├── lib/
│   ├── db.ts                      # Prisma client singleton
│   └── audit.ts                   # Audit logging utility
│
├── prisma/
│   ├── schema.prisma              # Database schema (5 tables)
│   └── migrations/                # Migration history
│
├── public/                         # Static assets
│
├── .env                           # Environment variables (create this)
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md                      # This file
```

---

## 🔧 Configuration

### **Environment Variables**

```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/vidda_today"

# Optional - for real AI mode
ANTHROPIC_API_KEY="sk-ant-api03-..."

# Optional - custom port
PORT=3000
```

### **Database Configuration**

Edit `prisma/schema.prisma` if you need to change database settings:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### **API Configuration**

**Switch to Real Claude API:**

1. Get API key from https://console.anthropic.com/settings/keys
2. Add to `.env`: `ANTHROPIC_API_KEY="sk-ant-..."`
3. Replace `pages/api/analysis/run.ts` with the real version:
   ```bash
   cp /path/to/api-analysis-run.ts pages/api/analysis/run.ts
   ```
4. Update model string if needed (check latest at https://docs.anthropic.com/en/docs/about-claude/models)

---

## 📊 Database Schema

### **Tables**

**1. Role**
```sql
- id: String (UUID)
- title: String
- exposures: String[] (risk descriptions)
- responsibilities: String[] (core duties)
- created_at: DateTime
```

**2. AnalysisRun**
```sql
- id: String (UUID)
- role_id: String (FK → Role)
- status: String (running/completed/failed)
- duration_seconds: Int
- checkpoint_data: Json (7-step validation)
- created_at: DateTime
- completed_at: DateTime
```

**3. Module**
```sql
- id: String (UUID)
- analysis_id: String (FK → AnalysisRun)
- name: String
- quarter: String (Q1/Q2/Q3/Q4)
- objective: String
- duration: Float (hours)
- is_mandatory: Boolean
- reason_assigned: String (explainability)
- amlr_articles: Int[] (9-15)
- risk_alignment: String[]
- competencies: Json {knowledge, skills, judgment}
- created_at: DateTime
```

**4. Enrollment**
```sql
- id: String (UUID)
- module_id: String (FK → Module)
- employee_email: String
- status: String (not_started/in_progress/completed)
- progress_percent: Int
- created_at: DateTime
- completed_at: DateTime
```

**5. AuditLog**
```sql
- id: String (UUID)
- event_type: String
- actor: String (system/user)
- details: Json
- timestamp: DateTime
```

### **View Database**

```bash
# Open Prisma Studio (visual database browser)
npx prisma studio

# Access at: http://localhost:5555
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "Cannot connect to database"**

**Check PostgreSQL is running:**
```bash
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Docker
docker ps | grep postgres
```

**Test connection:**
```bash
psql -h localhost -U alekhya -d vidda_today
```

**Fix:**
- Ensure PostgreSQL is started
- Check `.env` has correct credentials
- Verify database exists: `psql -l`

#### **2. "Prisma Client not generated"**

```bash
npx prisma generate
```

#### **3. "Module not found: @prisma/client"**

```bash
npm install @prisma/client
npx prisma generate
```

#### **4. "Port 3000 already in use"**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

#### **5. Hydration Errors in Console**

These are suppressed in the code with `suppressHydrationWarning`, but if you see them:

```bash
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

#### **6. "Analysis takes forever"**

If using real Claude API:
- Check API key is valid
- Check network connection
- Verify model string is current
- Check Anthropic API status: https://status.anthropic.com/

If using mock mode:
- Should complete in 2 seconds
- Check browser console for errors

---

## 🎯 API Endpoints

### **POST /api/roles/import**

Import a predefined role.

**Request:**
```json
{
  "role_key": "kyc-analyst"
}
```

**Response:**
```json
{
  "role_id": "uuid",
  "role_title": "KYC Analyst",
  "role_key": "kyc-analyst",
  "band": "G",
  "status": "imported"
}
```

**Available role_keys:**
- `aml-ddi-manager`, `customer-advisor`, `mlro`, `tm-analyst`, `kyc-analyst`

### **POST /api/analysis/run**

Generate training curriculum for a role.

**Request:**
```json
{
  "role_id": "uuid-from-import"
}
```

**Response:**
```json
{
  "analysis_id": "uuid",
  "status": "completed",
  "duration_seconds": 2,
  "modules_generated": 22
}
```

### **GET /api/analysis/:id**

Fetch analysis results and modules.

**Response:**
```json
{
  "analysis": {
    "id": "uuid",
    "status": "completed",
    "duration_seconds": 2
  },
  "modules": [
    {
      "id": "uuid",
      "name": "Customer Identification",
      "quarter": "Q1",
      "objective": "...",
      "duration": 2.5,
      "is_mandatory": true,
      "reason_assigned": "...",
      "amlr_articles": [9, 10, 12],
      "competencies": {
        "knowledge": [...],
        "skills": [...],
        "judgment": [...]
      }
    }
  ]
}
```

---

## 🚀 Deployment

### **Production Build**

```bash
# Build for production
npm run build

# Start production server
npm start
```

### **Environment Variables for Production**

```bash
DATABASE_URL="postgresql://user:password@prod-host:5432/vidda_prod"
ANTHROPIC_API_KEY="sk-ant-..."
NODE_ENV="production"
```

### **Deployment Platforms**

**Vercel** (Recommended for Next.js):
```bash
npm install -g vercel
vercel
```

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "start"]
```

---

## 🧪 Testing

```bash
# Run development server
npm run dev

# Test role import
curl -X POST http://localhost:3000/api/roles/import \
  -H "Content-Type: application/json" \
  -d '{"role_key": "kyc-analyst"}'

# Test analysis
curl -X POST http://localhost:3000/api/analysis/run \
  -H "Content-Type: application/json" \
  -d '{"role_id": "your-role-id"}'
```

---

## 📚 Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL 14, Prisma ORM
- **AI**: Anthropic Claude API (Sonnet 4)
- **Deployment**: Vercel (recommended) or Docker

---

## 🎯 Next Steps

### **For Demo:**
1. Import MLRO role (most impressive)
2. Run analysis
3. Show Step 3 governance layer (the money shot)
4. Expand "Inherent AML Risk"
5. Click [✎ Modify] and edit inline
6. Save changes, show [MODIFIED] badge
7. Approve all steps
8. Show explainability in Step 4
9. Show audit trail in Step 5

### **For Development:**
1. Add more roles from PDF
2. Create real Claude API integration
3. Add scenario-based training (in progress)
4. Add user authentication
5. Connect to real LMS
6. Add reporting dashboard

---

## 📞 Support

**Issues:**
- Check troubleshooting section above
- Review browser console for errors
- Check PostgreSQL logs
- Verify environment variables

**Documentation:**
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Anthropic: https://docs.anthropic.com

---

## 🎉 You're Ready!

Your Vidda Solutions instance is now set up and ready to demonstrate:

✅ **Zero Black Boxes** - Complete transparency  
✅ **Human Governance** - Inline editing and approval  
✅ **Full Auditability** - Every decision logged  
✅ **Real Explainability** - Why every module matters  

**Start the server and impress your stakeholders!** 🚀

```bash
npm run dev
# Open http://localhost:3000
```
