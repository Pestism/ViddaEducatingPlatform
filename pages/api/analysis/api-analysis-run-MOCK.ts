// pages/api/analysis/run.ts
// API endpoint to run ViddaGPT analysis (MOCK VERSION - No API key needed)

import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// Mock curriculum data (22 modules)
const MOCK_CURRICULUM = {
  curriculum: [
    // Q1 - Foundation (6 modules)
    {
      module: "Customer Identification & Document Verification",
      quarter: "Q1",
      objective: "Master the fundamentals of customer identification and document verification procedures",
      duration: 4,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "KYC Manager faces HIGH kyc_risk. AMLR Article 9 requires robust customer due diligence procedures. This foundational module addresses the core responsibility of verifying customer identity.",
      risk_alignment: ["kyc_risk", "documentation_risk", "onboarding_risk"],
      amlr_articles: [9, 12, 13],
      competencies: {
        knowledge: ["Types of acceptable identity documents", "Document verification techniques", "Red flags in identity documentation"],
        skills: ["Verify passport authenticity", "Cross-check information across documents", "Identify forged or altered documents"],
        judgment: ["When to accept alternative documentation", "When additional verification is needed", "Escalation thresholds for suspicious documents"]
      }
    },
    {
      module: "Enhanced Due Diligence (EDD) Requirements",
      quarter: "Q1",
      objective: "Understand when and how to apply enhanced due diligence measures",
      duration: 5,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "KYC Manager conducts EDD on high-risk customers. AMLR Article 9 requires risk-based approach. This module develops judgment on when standard CDD is insufficient.",
      risk_alignment: ["kyc_risk", "jurisdiction_risk"],
      amlr_articles: [9, 10, 13],
      competencies: {
        knowledge: ["EDD triggers and scenarios", "High-risk customer categories", "Enhanced verification methods"],
        skills: ["Conduct source of wealth investigations", "Perform enhanced background checks", "Document EDD findings"],
        judgment: ["Distinguishing between CDD and EDD scenarios", "Assessing customer risk levels", "Determining sufficient evidence"]
      }
    },
    {
      module: "Beneficial Ownership Structure Analysis",
      quarter: "Q1",
      objective: "Analyze complex beneficial ownership structures and identify ultimate beneficial owners",
      duration: 4,
      is_mandatory: true,
      content_type: "Workshop",
      reason_assigned: "KYC Manager faces HIGH beneficial_ownership_risk. AMLR Article 9 requires verification of beneficial owners. Weak analysis allows illegitimate customers to go undetected.",
      risk_alignment: ["beneficial_ownership_risk", "kyc_risk"],
      amlr_articles: [9, 10, 13],
      competencies: {
        knowledge: ["Direct vs indirect ownership", "Layered ownership structures", "Shell company indicators"],
        skills: ["Trace ownership chains", "Analyze corporate registries", "Map complex structures"],
        judgment: ["When ownership documentation is sufficient", "Recognizing deliberate obfuscation", "Escalation of ambiguous structures"]
      }
    },
    {
      module: "Source of Wealth and Source of Funds",
      quarter: "Q1",
      objective: "Distinguish between source of wealth and source of funds; verify both effectively",
      duration: 3,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "AMLR Article 9 requires understanding customer wealth origins. This competency is critical for detecting proceeds of crime.",
      risk_alignment: ["kyc_risk", "documentation_risk"],
      amlr_articles: [9, 12],
      competencies: {
        knowledge: ["Difference between SoW and SoF", "Acceptable evidence types", "Red flags in wealth explanations"],
        skills: ["Interview customers about wealth origins", "Verify employment and business claims", "Cross-reference with public records"],
        judgment: ["When wealth explanation is credible", "Appropriate level of verification by risk", "When to seek additional evidence"]
      }
    },
    {
      module: "AMLR 2024/1624 Articles for KYC Managers",
      quarter: "Q1",
      objective: "Understand key AMLR requirements applicable to KYC role",
      duration: 3,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "AMLR Article 12 requires awareness of regulatory requirements. KYC Managers must understand Articles 9, 10, 12, 13 to perform their role compliantly.",
      risk_alignment: ["audit_risk"],
      amlr_articles: [9, 10, 12, 13],
      competencies: {
        knowledge: ["Article 9: Internal policies and CDD", "Article 10: Risk assessment", "Article 12: Training requirements", "Article 13: Employee integrity"],
        skills: ["Apply AMLR requirements to daily work", "Reference regulations when uncertain", "Document compliance with AMLR"],
        judgment: ["When regulatory guidance applies", "Balancing compliance with customer experience", "Recognizing potential breaches"]
      }
    },
    {
      module: "Red Flags and Suspicious Activity Recognition",
      quarter: "Q1",
      objective: "Identify common red flags and indicators of suspicious activity",
      duration: 4,
      is_mandatory: true,
      content_type: "Case Study",
      reason_assigned: "KYC Manager must escalate suspicious activity. AMLR Article 9 requires suspicious transaction reporting. Recognition skills prevent ML/TF.",
      risk_alignment: ["kyc_risk", "escalation_risk"],
      amlr_articles: [9, 12],
      competencies: {
        knowledge: ["Typologies of money laundering", "Common red flags by customer type", "Indicators of terrorist financing"],
        skills: ["Spot patterns across customer base", "Distinguish unusual from suspicious", "Document concerns clearly"],
        judgment: ["When activity crosses from unusual to suspicious", "Appropriate escalation timing", "Balancing false positives with risk"]
      }
    },

    // Q2 - Application (5 modules)
    {
      module: "Case Study: Analyzing Complex Corporate Structures",
      quarter: "Q2",
      objective: "Apply beneficial ownership analysis to real-world scenarios",
      duration: 5,
      is_mandatory: true,
      content_type: "Case Study",
      reason_assigned: "Applying Q1 knowledge to realistic scenarios. Develops practical skills in beneficial ownership analysis.",
      risk_alignment: ["beneficial_ownership_risk"],
      amlr_articles: [9, 10],
      competencies: {
        knowledge: ["Multi-jurisdictional structures", "Nominee directors and shareholders", "Trust structures"],
        skills: ["Investigate complex ownership chains", "Request clarifying documentation", "Map opaque structures"],
        judgment: ["When to accept complex structures", "When complexity indicates obfuscation", "Proportionality in investigation depth"]
      }
    },
    {
      module: "Periodic Review Procedures",
      quarter: "Q2",
      objective: "Conduct effective periodic reviews of customer profiles",
      duration: 4,
      is_mandatory: true,
      content_type: "Workshop",
      reason_assigned: "KYC Manager performs periodic reviews. AMLR Article 9 requires ongoing CDD. Stale information creates compliance gaps.",
      risk_alignment: ["kyc_risk", "documentation_risk"],
      amlr_articles: [9, 12],
      competencies: {
        knowledge: ["Review frequency by risk category", "What information needs updating", "Triggers for interim reviews"],
        skills: ["Efficiently review customer files", "Identify material changes", "Update risk ratings"],
        judgment: ["When to escalate for re-verification", "Materiality of changes", "Managing review workload"]
      }
    },
    {
      module: "Escalation & Reporting Procedures",
      quarter: "Q2",
      objective: "Know when and how to escalate concerns to MLRO",
      duration: 3,
      is_mandatory: true,
      content_type: "Workshop",
      reason_assigned: "KYC Manager's escalation decisions are critical. AMLR Article 9 requires suspicious activity reporting. HIGH escalation_risk if concerns are not escalated.",
      risk_alignment: ["escalation_risk", "kyc_risk"],
      amlr_articles: [9, 11],
      competencies: {
        knowledge: ["Escalation thresholds", "MLRO responsibilities", "Internal reporting procedures"],
        skills: ["Document concerns clearly", "Communicate risk effectively", "Follow up on escalations"],
        judgment: ["When to escalate vs continue investigation", "Urgency of different concerns", "Completeness of information before escalating"]
      }
    },
    {
      module: "Documentation Standards & Audit Trail",
      quarter: "Q2",
      objective: "Maintain comprehensive and defensible documentation",
      duration: 3,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "HIGH documentation_risk. AMLR Article 9 requires record retention. Inadequate documentation weakens SAR quality and regulatory defense.",
      risk_alignment: ["documentation_risk", "audit_risk"],
      amlr_articles: [9, 12],
      competencies: {
        knowledge: ["Required documentation by customer type", "Retention requirements", "Audit trail principles"],
        skills: ["Document decisions and rationale", "Organize customer files", "Maintain version control"],
        judgment: ["What level of detail is sufficient", "When to seek legal review", "Defensibility of documentation"]
      }
    },
    {
      module: "Quality Assurance & Peer Review",
      quarter: "Q2",
      objective: "Participate in QA processes and learn from peer reviews",
      duration: 4,
      is_mandatory: true,
      content_type: "Workshop",
      reason_assigned: "AMLR Article 13 requires employee skills assessment. Peer review improves consistency and catches errors.",
      risk_alignment: ["kyc_risk", "audit_risk"],
      amlr_articles: [11, 13],
      competencies: {
        knowledge: ["QA criteria and standards", "Common errors in KYC work", "Best practices"],
        skills: ["Review colleagues' work constructively", "Accept feedback professionally", "Implement improvements"],
        judgment: ["Spotting errors in others' work", "Prioritizing quality over speed", "When to ask for second opinion"]
      }
    },

    // Q3 - Deepening (6 modules)
    {
      module: "Advanced: Identifying Shell Companies",
      quarter: "Q3",
      objective: "Recognize sophisticated shell company structures",
      duration: 4,
      is_mandatory: true,
      content_type: "Case Study",
      reason_assigned: "Deepening beneficial ownership skills. Shell companies are vehicles for ML/TF. Advanced detection skills critical for HIGH-risk customers.",
      risk_alignment: ["beneficial_ownership_risk", "jurisdiction_risk"],
      amlr_articles: [9, 10],
      competencies: {
        knowledge: ["Shell company indicators", "Secrecy jurisdictions", "Nominee services"],
        skills: ["Investigate minimal substance companies", "Cross-reference public filings", "Map shell networks"],
        judgment: ["Distinguishing legitimate SPVs from shells", "When structure warrants rejection", "Escalation of sophisticated schemes"]
      }
    },
    {
      module: "Advanced: High-Risk Jurisdictions",
      quarter: "Q3",
      objective: "Apply enhanced scrutiny to high-risk jurisdiction relationships",
      duration: 4,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "MEDIUM jurisdiction_risk. Cross-border relationships require enhanced analysis per AMLR Article 10 risk assessment.",
      risk_alignment: ["jurisdiction_risk", "kyc_risk"],
      amlr_articles: [9, 10],
      competencies: {
        knowledge: ["FATF high-risk jurisdictions", "Sanctions lists", "Country-specific ML/TF risks"],
        skills: ["Apply country risk ratings", "Conduct enhanced verification", "Monitor geopolitical changes"],
        judgment: ["When jurisdiction alone warrants EDD", "Balancing jurisdiction risk with other factors", "Appropriate verification depth"]
      }
    },
    {
      module: "Judgment & Decision-Making Under Uncertainty",
      quarter: "Q3",
      objective: "Make sound decisions when information is incomplete",
      duration: 5,
      is_mandatory: true,
      content_type: "Simulation",
      reason_assigned: "Real-world KYC rarely has perfect information. AMLR Article 13 emphasizes employee judgment. This module develops risk-based decision-making.",
      risk_alignment: ["kyc_risk", "escalation_risk"],
      amlr_articles: [9, 13],
      competencies: {
        knowledge: ["Risk appetite framework", "Escalation criteria", "Information sufficiency standards"],
        skills: ["Make decisions with partial information", "Document rationale clearly", "Seek additional information effectively"],
        judgment: ["When to proceed vs escalate", "Acceptable risk levels", "Timing of decisions"]
      }
    },
    {
      module: "Regulatory Updates & New Risk Indicators",
      quarter: "Q3",
      objective: "Stay current with evolving AML/CFT landscape",
      duration: 3,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "AMLR Article 12 requires ongoing training. ML/TF methods evolve; KYC Managers must stay current.",
      risk_alignment: ["audit_risk"],
      amlr_articles: [12],
      competencies: {
        knowledge: ["Recent regulatory changes", "Emerging typologies", "New red flags"],
        skills: ["Interpret regulatory guidance", "Apply updates to procedures", "Share knowledge with team"],
        judgment: ["Relevance of updates to role", "Implementation priority", "When to seek clarification"]
      }
    },
    {
      module: "Team Collaboration & Knowledge Sharing",
      quarter: "Q3",
      objective: "Collaborate effectively with compliance team and other functions",
      duration: 3,
      is_mandatory: false,
      content_type: "Workshop",
      reason_assigned: "AMLR Article 11 emphasizes compliance function coordination. Effective collaboration improves outcomes.",
      risk_alignment: ["escalation_risk"],
      amlr_articles: [11],
      competencies: {
        knowledge: ["Roles of compliance team", "Escalation channels", "Information sharing protocols"],
        skills: ["Communicate with MLRO effectively", "Coordinate with legal/risk", "Share lessons learned"],
        judgment: ["When to involve other functions", "Appropriate communication methods", "Information sensitivity"]
      }
    },
    {
      module: "Handling Edge Cases & Ambiguity",
      quarter: "Q3",
      objective: "Navigate ambiguous situations with confidence",
      duration: 4,
      is_mandatory: true,
      content_type: "Case Study",
      reason_assigned: "Real KYC work involves edge cases. AMLR Article 13 requires skills assessment. This module develops advanced judgment.",
      risk_alignment: ["kyc_risk", "escalation_risk"],
      amlr_articles: [9, 13],
      competencies: {
        knowledge: ["Precedents for edge cases", "Risk-based principles", "Regulatory grey areas"],
        skills: ["Analyze novel situations", "Research similar cases", "Document novel decisions"],
        judgment: ["Applying principles to new situations", "When to seek guidance", "Consistency with past decisions"]
      }
    },

    // Q4 - Embedding (5 modules)
    {
      module: "Mastery Assessment: Complex Structure Analysis",
      quarter: "Q4",
      objective: "Demonstrate mastery in analyzing the most complex structures",
      duration: 6,
      is_mandatory: true,
      content_type: "Assessment",
      reason_assigned: "Year-end competency validation. Ensures KYC Manager can handle highest-risk customers independently.",
      risk_alignment: ["beneficial_ownership_risk", "kyc_risk"],
      amlr_articles: [9, 13],
      competencies: {
        knowledge: ["All beneficial ownership concepts", "Regulatory requirements", "Best practices"],
        skills: ["End-to-end structure analysis", "Complete investigation", "Comprehensive documentation"],
        judgment: ["Independent decision-making", "Appropriate escalation", "Risk calibration"]
      }
    },
    {
      module: "Competency Validation: Risk-Based Judgment",
      quarter: "Q4",
      objective: "Validate judgment skills through realistic scenarios",
      duration: 5,
      is_mandatory: true,
      content_type: "Simulation",
      reason_assigned: "AMLR Article 13 requires judgment assessment. This validates Year 1 learning.",
      risk_alignment: ["kyc_risk", "escalation_risk"],
      amlr_articles: [13],
      competencies: {
        knowledge: ["Risk framework application", "Escalation thresholds", "Proportionality principles"],
        skills: ["Rapid risk assessment", "Clear decision communication", "Effective escalation"],
        judgment: ["Complex risk scenarios", "Time-pressured decisions", "Conflicting information"]
      }
    },
    {
      module: "Regulatory Update: Latest AMLR Guidance",
      quarter: "Q4",
      objective: "Implement most recent regulatory guidance",
      duration: 2,
      is_mandatory: true,
      content_type: "E-learning",
      reason_assigned: "AMLR Article 12 requires ongoing training. Year-end update ensures current knowledge.",
      risk_alignment: ["audit_risk"],
      amlr_articles: [12],
      competencies: {
        knowledge: ["Latest regulatory updates", "Implementation deadlines", "New requirements"],
        skills: ["Apply new guidance", "Update procedures", "Train colleagues"],
        judgment: ["Impact on current work", "Implementation priority", "Clarification needs"]
      }
    },
    {
      module: "Continuous Improvement: Learning from Cases",
      quarter: "Q4",
      objective: "Reflect on Year 1 cases and identify improvement areas",
      duration: 3,
      is_mandatory: true,
      content_type: "Workshop",
      reason_assigned: "AMLR Article 13 emphasizes continuous development. Reflection improves future performance.",
      risk_alignment: ["kyc_risk", "audit_risk"],
      amlr_articles: [13],
      competencies: {
        knowledge: ["Quality metrics", "Common errors", "Improvement methodologies"],
        skills: ["Self-reflection", "Identify development needs", "Set improvement goals"],
        judgment: ["Prioritizing development areas", "Learning from mistakes", "Recognizing strengths"]
      }
    },
    {
      module: "Year 2 Personal Development Plan",
      quarter: "Q4",
      objective: "Create development plan for Year 2",
      duration: 2,
      is_mandatory: false,
      content_type: "Workshop",
      reason_assigned: "AMLR Article 13 requires ongoing skills development. Year 2 plan ensures continuous improvement.",
      risk_alignment: ["kyc_risk"],
      amlr_articles: [13],
      competencies: {
        knowledge: ["Career progression paths", "Advanced competencies", "Specialization areas"],
        skills: ["Self-assessment", "Goal setting", "Development planning"],
        judgment: ["Realistic goals", "Development priorities", "Resource requirements"]
      }
    }
  ]
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getErrorStack(error: unknown) {
  return error instanceof Error ? error.stack : undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { role_id } = req.body;

    console.log('[/api/analysis/run] Starting MOCK analysis for role:', role_id);

    // Fetch role
    const role = await db.role.findUnique({
      where: { id: role_id },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Create analysis record
    const analysis = await db.analysisRun.create({
      data: {
        roleId: role_id,
        status: 'processing',
        startedAt: new Date(),
      },
    });

    console.log('[/api/analysis/run] Analysis created:', analysis.id);

    // Log audit event
    await logAudit('analysis_started', 'system', {
      analysis_id: analysis.id,
      role_id: role_id,
      role_title: role.title,
      mode: 'MOCK_DATA',
    });

    // Simulate API delay (2 seconds instead of 25 seconds)
    console.log('[/api/analysis/run] Using mock data (2 second delay)...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const duration = 2;
    const viddagptOutput = MOCK_CURRICULUM;

    console.log(`[/api/analysis/run] Mock analysis completed with ${viddagptOutput.curriculum.length} modules`);

    // Create modules in database
    const modules = viddagptOutput.curriculum;
    let moduleCount = 0;

    for (const m of modules) {
      try {
        await db.module.create({
          data: {
            analysisId: analysis.id,
            name: m.module,
            quarter: m.quarter,
            objective: m.objective,
            duration: m.duration,
            isMandatory: m.is_mandatory,
            contentType: m.content_type,
            reasonAssigned: m.reason_assigned,
            riskAlignment: m.risk_alignment,
            amlrArticles: m.amlr_articles,
            knowledge: m.competencies.knowledge,
            skills: m.competencies.skills,
            judgment: m.competencies.judgment,
          },
        });
        moduleCount++;
      } catch (moduleError: unknown) {
        console.error('[/api/analysis/run] Failed to create module:', moduleError);
      }
    }

    console.log(`[/api/analysis/run] Created ${moduleCount} modules`);

    // Update analysis record
    await db.analysisRun.update({
      where: { id: analysis.id },
      data: {
        status: 'completed',
        viddagptOutput: viddagptOutput,
        durationSeconds: duration,
        completedAt: new Date(),
      },
    });

    // Log completion
    await logAudit('analysis_completed', 'system', {
      analysis_id: analysis.id,
      modules_generated: moduleCount,
      duration_seconds: duration,
      mode: 'MOCK_DATA',
    });

    // Return success
    return res.status(200).json({
      analysis_id: analysis.id,
      status: 'completed',
      modules_generated: moduleCount,
      duration_seconds: duration,
      mode: 'MOCK_DATA',
    });
  } catch (error: unknown) {
    console.error('[/api/analysis/run] Error:', error);
    const errorMessage = getErrorMessage(error);

    await logAudit('analysis_failed', 'system', {
      error: errorMessage,
      stack: getErrorStack(error),
    });

    return res.status(500).json({
      error: errorMessage,
      type: 'ANALYSIS_FAILED',
    });
  }
}
