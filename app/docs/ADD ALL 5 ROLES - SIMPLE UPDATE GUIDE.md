ADD ALL 5 ROLES - SIMPLE UPDATE GUIDE
Replace 2 Files to Add All Roles
Goal: Add all 5 roles from the PDF to your working system
Time Required: 2 minutes
***📦 WHAT YOU'RE ADDING
Current System:
✅ 1 role (KYC Manager)
Updated System:
✅ 5 roles:
AML DDI Manager (Band H) - Manages third-party AML checks
Customer Advisor (Band F) - First point of contact, onboarding
MLRO (Band 5) - Money Laundering Reporting Officer
Transaction Monitoring Analyst (Band G) - Reviews alerts
KYC Analyst (Band G) - Verifies identities, highest risk
***✅ STEP 1: Replace Backend File (1 minute)
Replace this file:
pages/api/roles/import.ts
With this file:
api-roles-import-ALL-ROLES.ts
Command:
cp ~/Downloads/api-roles-import-ALL-ROLES.ts pages/api/roles/import.ts
***✅ STEP 2: Replace Frontend File (1 minute)
Replace this file:
app/page.tsx
With this file:
app-page-ALL-ROLES.tsx
Command:
cp ~/Downloads/app-page-ALL-ROLES.tsx app/page.tsx
***✅ STEP 3: Restart Server
# Stop server (Ctrl+C)
# Start again
npm run dev
***✅ STEP 4: Test It
Open: http://localhost:3000
You should now see:
5 role cards in a grid
Each with icon, title, description
Risk level badges (CRITICAL, HIGH, MEDIUM-HIGH)
Band level displayed
Click any role to test the full flow!
***🎬 NEW DEMO FLOW
Step 1: "We now support 5 different compliance roles"
Show 5 role cards
Point out risk levels: "MLRO is CRITICAL, Customer Advisor is MEDIUM-HIGH"
Step 2: Click any role (e.g., MLRO)
"Each role generates personalized training"
Run analysis → 22 modules in 2 seconds
Step 3-5: Same as before
Framework approval
View modules
LMS assignment
***📊 WHAT CHANGED
Backend Changes:
Added 5 role definitions (title, band, exposures, responsibilities)
API now accepts role_key parameter
Returns role metadata (band, risk level)
Frontend Changes:
Grid layout showing all 5 roles
Click to import (instead of single button)
Visual indicators (icons, risk badges, band)
Selected role tracked throughout flow
***🎯 NO OTHER CHANGES NEEDED
Everything else stays the same:
✅ Database schema (unchanged)
✅ Analysis endpoint (unchanged)
✅ Module generation (unchanged)
✅ Audit trail (unchanged)
Just 2 files replaced!
***🧪 VERIFY ALL 5 ROLES WORK
Test each role:
# 1. Import each role
Click "AML DDI Manager" → Should import
Click "Customer Advisor" → Should import
Click "MLRO" → Should import
Click "TM Analyst" → Should import
Click "KYC Analyst" → Should import
# 2. Check database
psql vidda_today -c "SELECT id, title FROM \"Role\";"
# Should show 5 roles
# 3. Run analysis on different role
# Import "MLRO" → Run Analysis → See 22 modules
# Import "Customer Advisor" → Run Analysis → See 22 modules
Each role should:
✅ Import successfully
✅ Generate 22 modules
✅ Show risk exposures
✅ Complete full 5-step flow
***📋 ROLE DETAILS
1. AML DDI Manager (Band H)
Icon: 👔  
Risk: HIGH  
Focus: Third-party risk, periodic reviews, GDPR, team coaching
2. Customer Advisor (Band F)
Icon: 📞  
Risk: MEDIUM-HIGH  
Focus: Onboarding, ID verification, escalation, high volume
3. MLRO (Band 5)
Icon: ⚖️  
Risk: CRITICAL  
Focus: SAR decisions, Board reporting, ultimate accountability
4. Transaction Monitoring Analyst (Band G)
Icon: 🔍  
Risk: HIGH  
Focus: Alert review, pattern detection, escalation timing
5. KYC Analyst (Band G)
Icon: 🛡️  
Risk: CRITICAL  
Focus: Identity verification, high-risk customers, judgement calls
***🎉 DONE!
You now have:
✅ 5 selectable roles
✅ Each with accurate risk profiles
✅ Professional UI with icons and badges
✅ Same 22-module generation for each
✅ Complete audit trail
Total changes: 2 files  
Total time: 2 minutes  
Result: 5x more demo variety
***🚀 ENHANCED DEMO
New talking point:
> "Vidda Solutions works across all compliance roles. From front-line Customer Advisors to the MLRO, each role gets personalized training mapped to their specific risk exposures."
Show variety:
Import MLRO → "CRITICAL risk, ultimate accountability"
Import Customer Advisor → "MEDIUM-HIGH risk, onboarding focus"
Import TM Analyst → "HIGH risk, alert fatigue concerns"
Emphasize:
> "Same governance framework, different risk profiles, personalized curriculum for each."
***💡 NEXT ENHANCEMENTS (Optional)
If you want to go further:
Different module counts per role (MLRO gets 25, Customer Advisor gets 18)
Role-specific competencies in modules
Side-by-side role comparison
Bulk import (select multiple roles)
Custom role upload (CSV)
But for now, 5 roles is perfect for demo! ✅