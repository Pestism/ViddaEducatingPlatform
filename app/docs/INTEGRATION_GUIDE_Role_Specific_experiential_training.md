# INTEGRATION GUIDE: Role-Specific Experiential Training
## How to Add Scenarios to Your Existing Vidda Platform

---

## 📦 WHAT YOU HAVE

You now have 3 complete files:

1. **SCENARIO_DATA_ALL_ROLES.tsx** - All scenario data for 5 roles
2. **ScenarioViewer.tsx** - Interactive scenario component
3. This integration guide

---

## 🎯 WHERE TO ADD SCENARIOS

### **Option 1: Add to Step 4 (Training Path) - RECOMMENDED**

Scenarios appear when users click on a module in Step 4.

**Flow:**
```
Step 4: Training Path
  ↓
User clicks "Customer Identification" module
  ↓
Module explainability panel opens
  ↓
NEW: "🎭 Try Interactive Scenario" button
  ↓
ScenarioViewer opens
  ↓
User completes scenario
  ↓
Results logged to audit trail
```

### **Option 2: Add as Separate Step (Step 4.5)**

Insert scenarios between current Step 4 and Step 5.

**Flow:**
```
Step 4: View Training Modules
  ↓
NEW Step 4.5: Complete Interactive Scenarios
  ↓
Step 5: LMS Assignment
```

---

## 🔧 IMPLEMENTATION: Option 1 (Within Step 4)

### **Step 1: Copy Files**

```bash
# Copy scenario data
cp SCENARIO_DATA_ALL_ROLES.tsx app/scenarios/data.tsx

# Copy scenario viewer
cp ScenarioViewer.tsx app/scenarios/ScenarioViewer.tsx
```

### **Step 2: Update app/page.tsx**

Add scenario trigger to module explainability panel:

```typescript
// At the top, add import
import ScenarioViewer from './scenarios/ScenarioViewer';
import { TRAINING_SCENARIOS } from './scenarios/data';

// Add state for scenario viewer
const [activeScenario, setActiveScenario] = useState<string | null>(null);

// Find matching scenario for module
const getScenarioForModule = (moduleName: string, roleKey: string) => {
  // Match modules to scenarios
  const moduleToScenario: Record<string, string> = {
    'Customer Identification': 'kyc_001',
    'SAR Decision Making': 'mlro_001',
    'Alert Review Process': 'tm_001',
    'Customer Onboarding': 'ca_001',
    'Third-Party Due Diligence': 'aml_001'
  };
  
  const scenarioId = moduleToScenario[moduleName];
  if (!scenarioId) return null;
  
  return TRAINING_SCENARIOS.find(s => s.id === scenarioId && s.role === roleKey);
};

// In the module explainability panel, add button
{selectedModule && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
      {/* Existing explainability content */}
      
      {/* NEW: Scenario button */}
      {getScenarioForModule(selectedModule.name, selectedRoleKey) && (
        <div className="border-t p-6 bg-gradient-to-r from-purple-50 to-blue-50">
          <h4 className="font-bold text-lg mb-2">
            🎭 Experiential Training Available
          </h4>
          <p className="text-sm text-gray-700 mb-4">
            Practice this skill with a real-world scenario that includes brain readiness tests, 
            decision points, and consequence analysis.
          </p>
          <button
            onClick={() => {
              const scenario = getScenarioForModule(selectedModule.name, selectedRoleKey);
              if (scenario) setActiveScenario(scenario.id);
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700"
          >
            Start Interactive Scenario →
          </button>
        </div>
      )}
    </div>
  </div>
)}

// Add scenario viewer modal
{activeScenario && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
    <div className="w-full">
      <ScenarioViewer
        scenario={TRAINING_SCENARIOS.find(s => s.id === activeScenario)!}
        onComplete={(results) => {
          console.log('Scenario completed:', results);
          // Log to audit trail
          // Update module completion status
          setActiveScenario(null);
        }}
      />
    </div>
  </div>
)}
```

### **Step 3: Add Audit Trail Logging**

```typescript
const handleScenarioComplete = async (results: any) => {
  // Log to audit trail
  await fetch('/api/audit/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: 'scenario_completed',
      actor: 'user',
      details: {
        scenario_id: results.scenario_id,
        brain_test_score: results.brain_test_score,
        decision_quality: results.decision_made?.outcome_type,
        completed_at: results.completed_at
      }
    })
  });
  
  setActiveScenario(null);
};
```

---

## 🔧 IMPLEMENTATION: Option 2 (Separate Step)

### **Step 1: Add New Step to Navigation**

```typescript
const [currentStep, setCurrentStep] = useState(1);

// Steps: 1=Roles, 2=Analysis, 3=Validation, 4=Modules, 4.5=Scenarios, 5=LMS

// After Step 4 completion
if (currentStep === 4 && allModulesReviewed) {
  setCurrentStep(4.5); // Go to scenarios
}
```

### **Step 2: Create Scenario Selection Screen**

```typescript
{currentStep === 4.5 && (
  <div className="max-w-6xl mx-auto p-6">
    <h2 className="text-3xl font-bold mb-4">
      🎭 Complete Interactive Scenarios
    </h2>
    <p className="text-gray-700 mb-6">
      Before assigning training, complete these role-specific scenarios to ensure 
      you understand what your team members will experience.
    </p>
    
    <div className="grid md:grid-cols-2 gap-4">
      {TRAINING_SCENARIOS
        .filter(s => s.role === selectedRoleKey)
        .map(scenario => (
          <div key={scenario.id} className="border-2 rounded-lg p-6 hover:border-blue-500 cursor-pointer">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-lg">{scenario.title}</h3>
              <span className={`px-3 py-1 rounded text-sm font-bold ${
                scenario.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                scenario.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {scenario.risk_level}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>⏱️ {scenario.duration_minutes} min</span>
            </div>
            <button
              onClick={() => setActiveScenario(scenario.id)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
            >
              Start Scenario
            </button>
          </div>
        ))}
    </div>
    
    <button
      onClick={() => setCurrentStep(5)}
      className="mt-6 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
    >
      Skip Scenarios (Not Recommended)
    </button>
  </div>
)}
```

---

## 📊 DATABASE UPDATES

Add scenario completion tracking to database:

### **Update Prisma Schema**

```prisma
// Add to prisma/schema.prisma

model ScenarioCompletion {
  id              String   @id @default(uuid())
  user_email      String
  scenario_id     String
  role            String
  
  // Results
  brain_test_score      Int
  brain_test_passed     Boolean
  decision_made         String
  decision_correct      Boolean
  brain_system_used     String
  outcome_type          String
  
  // Timing
  duration_seconds      Int
  completed_at          DateTime @default(now())
  
  // Audit
  checkpoint_answers    Json
  in_job_answers        Json?
  
  @@index([user_email])
  @@index([scenario_id])
}
```

### **Run Migration**

```bash
npx prisma migrate dev --name add_scenario_completions
```

### **Create API Endpoint**

Create `pages/api/scenarios/complete.ts`:

```typescript
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { user_email, scenario_id, results } = req.body;
  
  try {
    const completion = await prisma.scenarioCompletion.create({
      data: {
        user_email,
        scenario_id,
        role: results.scenario.role,
        brain_test_score: results.brain_test_score,
        brain_test_passed: results.brain_test_passed,
        decision_made: results.decision_made.option,
        decision_correct: results.decision_made.is_correct,
        brain_system_used: results.decision_made.brain_system_used,
        outcome_type: results.decision_made.outcome_type,
        duration_seconds: Math.floor((new Date(results.completed_at) - new Date(results.started_at)) / 1000),
        checkpoint_answers: results.checkpoint_answers,
        in_job_answers: results.in_job_answers
      }
    });
    
    await logAudit({
      event_type: 'scenario_completed',
      actor: user_email,
      details: {
        scenario_id,
        outcome: results.decision_made.outcome_type,
        score: results.brain_test_score
      }
    });
    
    res.status(200).json({ success: true, completion });
  } catch (error) {
    console.error('Error saving scenario completion:', error);
    res.status(500).json({ error: 'Failed to save completion' });
  }
}
```

---

## 🎨 STYLING UPDATES

The scenario components use Tailwind CSS. Ensure your `tailwind.config.ts` includes:

```typescript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Already included in your existing config
      }
    }
  }
}
```

---

## 📈 REPORTING DASHBOARD

Add scenario completion stats to your dashboard:

```typescript
// Fetch scenario stats
const scenarioStats = await prisma.scenarioCompletion.groupBy({
  by: ['scenario_id', 'outcome_type'],
  _count: true
});

// Display in UI
<div className="grid md:grid-cols-3 gap-4">
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <h4 className="font-bold text-green-800">Excellent Decisions</h4>
    <p className="text-3xl font-bold text-green-600">
      {scenarioStats.filter(s => s.outcome_type === 'excellent').reduce((sum, s) => sum + s._count, 0)}
    </p>
  </div>
  
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <h4 className="font-bold text-yellow-800">Acceptable Decisions</h4>
    <p className="text-3xl font-bold text-yellow-600">
      {scenarioStats.filter(s => s.outcome_type === 'acceptable').reduce((sum, s) => sum + s._count, 0)}
    </p>
  </div>
  
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <h4 className="font-bold text-red-800">Critical Failures</h4>
    <p className="text-3xl font-bold text-red-600">
      {scenarioStats.filter(s => s.outcome_type === 'critical_failure').reduce((sum, s) => sum + s._count, 0)}
    </p>
  </div>
</div>
```

---

## 🧪 TESTING

### **Test Each Role's Scenario**

```bash
# Start dev server
npm run dev

# Test flow:
1. Select KYC Analyst role
2. Run analysis
3. Approve all validation steps
4. Go to Step 4 (Training Path)
5. Click "Customer Identification" module
6. Click "Start Interactive Scenario"
7. Complete brain readiness test
8. Go through preparation path
9. Answer checkpoint questions
10. Make decision (try different options)
11. See consequences
12. Complete in-job monitoring
13. Check audit trail shows completion
```

### **Verify Database**

```bash
npx prisma studio

# Check ScenarioCompletion table
# Verify entries are being created
```

---

## 📚 USER GUIDE

Create a quick guide for users:

```markdown
# Interactive Scenario Training

## What Are Scenarios?

Realistic workplace situations where you make decisions and see consequences.

## How to Use

1. **Brain Readiness Test** - Quick cognitive check
2. **Preparation Path** - Learn what you need to know
3. **On-the-Job Checkpoint** - LMRA-style pre-work check
4. **Decision Point** - Choose A/B/C/D
5. **See Consequences** - What happens with your choice
6. **In-Job Monitoring** - Handle situation changes

## Tips

- Take scenarios when alert (not late at night)
- Read all options carefully
- Think: System 1 (fast) or System 2 (slow)?
- Learn from failures - they're safe here!
- Review learning points at the end
```

---

## 🎯 DEMO SCRIPT

**For stakeholder presentations:**

```
1. "Let me show you what makes this different..."

2. Click on a module: "Traditional training stops here - just text."

3. Click "Start Interactive Scenario": "We make them EXPERIENCE it."

4. Show brain readiness test: "Are they alert enough? We check."

5. Show preparation path: "Collaborative learning - not solo."

6. Show LMRA checkpoint: "Real workplace checks - just like LMRA."

7. Make a WRONG decision: "Watch what happens..."

8. Show consequences: "£2.5M fraud. Your judgment questioned. Real impact."

9. Show brain system analysis: "They learn WHEN to slow down."

10. "This isn't training. This is a flight simulator for compliance."
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Copy SCENARIO_DATA_ALL_ROLES.tsx to project
- [ ] Copy ScenarioViewer.tsx to project
- [ ] Update app/page.tsx with integration code
- [ ] Add ScenarioCompletion model to Prisma schema
- [ ] Run database migration
- [ ] Create /api/scenarios/complete endpoint
- [ ] Test all 5 role scenarios
- [ ] Verify audit trail logging
- [ ] Add scenario stats to dashboard
- [ ] Update README with scenario info
- [ ] Create user guide documentation
- [ ] Test on staging environment
- [ ] Deploy to production

---

## 🎉 YOU'RE DONE!

Your Vidda platform now has:

✅ **5 Role-Specific Experiential Scenarios**  
✅ **Brain Readiness Testing**  
✅ **LMRA-Style Checkpoints**  
✅ **Interactive Decision Trees**  
✅ **Consequence Analysis**  
✅ **Brain System Recognition**  
✅ **Power to Stop Training**  
✅ **Complete Audit Trail**  

**This transforms passive training into active learning!** 🚀

---

## 📞 SUPPORT

Questions? Check:
- SCENARIO_DATA_ALL_ROLES.tsx for scenario structure
- ScenarioViewer.tsx for component logic
- This guide for integration steps

**Now go blow away your stakeholders!** 🎯
