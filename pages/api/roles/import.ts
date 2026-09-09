// pages/api/roles/import.ts
// API endpoint to import ANY of the 5 roles from the PDF

import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/db';
import { logAudit } from '@/lib/audit';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// All 5 roles from the PDF
const ROLES = {
  'aml-ddi-manager': {
    title: 'AML DDI Manager',
    band: 'H',
    exposures: [
      'HIGH third_party_risk: Manages AML/KYC checks on delivery partners - third-party risk is a known ML vulnerability',
      'HIGH oversight_risk: Failures in periodic reviews can allow lapsed partners to remain active',
      'MEDIUM gdpr_risk: GDPR mismanagement creates dual regulatory exposure alongside AML',
      'HIGH propagation_risk: Coaching responsibilities mean errors can propagate across analyst team',
    ],
    responsibilities: [
      'Manage KYC/AML search process (requests, alerts, periodic reviews, exits)',
      'Provide information for Delivery Partner AML checks',
      'Liaise with BU Directors and Relationship managers on AML DDI processes',
      'Develop stakeholder relationships with Product Teams, Risk, Legal, CoSec',
      'Contribute to internal reporting for AML DDI matters',
      'Manage data asset register to monitor GDPR requirements',
      'Support operational processes and SLA compliance',
      'Coach, mentor and develop analyst team members',
    ],
  },
  
  'customer-advisor': {
    title: 'Customer Advisor',
    band: 'F',
    exposures: [
      'HIGH onboarding_risk: First contact during onboarding - weak ID verification lets illegitimate customers enter',
      'MEDIUM volume_risk: High volume interactions with limited AML depth increases missing red flags',
      'HIGH escalation_risk: Failure to recognise or report unusual behaviour breaks chain of defence',
      'MEDIUM vulnerability_risk: Proximity to vulnerable customers creates exploitation exposure',
    ],
    responsibilities: [
      'Respond to customer enquiries via phone, email, digital channels',
      'Resolve account queries and transaction questions at first contact',
      'Guide customers through onboarding and KYC verification',
      'Recognise and escalate potential fraud or unusual behaviour',
      'Log and manage customer complaints per regulatory timeframes',
      'Update customer records per GDPR and data protection policies',
      'Collaborate with Operations, Risk, Compliance on complex queries',
      'Support outbound contact for account reviews and document refresh',
    ],
  },
  
  'mlro': {
    title: 'Money Laundering Reporting Officer (MLRO)',
    band: '5',
    exposures: [
      'CRITICAL personal_liability_risk: Ultimate accountability for SAR decisions carries criminal liability',
      'CRITICAL systemic_risk: Oversees entire financial crime framework - blind spots cascade across all defences',
      'HIGH strategic_risk: Responsible for Board reporting - inaccurate MI leads to flawed risk decisions',
      'CRITICAL reputational_risk: External-facing to regulators - enforcement risk is highest at this level',
    ],
    responsibilities: [
      'Lead design and review of F&FC Risk Management Policies',
      'Provide reports to MLRO, CRO, Board on F&FC risk profile',
      'Support delivery of annual MLRO report to Board',
      'Design and facilitate group-wide F&FC risk assessment',
      'Undertake investigations of suspected fraud and financial crime',
      'Review escalations and make approve/decline recommendations',
      'Investigate and submit Suspicious Activity Reports (SARs)',
      'Review suspected fraud and determine law enforcement referrals',
      'Design and deliver F&FC training content',
      'Monitor staff compliance with training requirements',
      'Maintain bank-wide F&FC oversight forum/committee',
      'Quality assurance sampling and control testing',
      'Monitor emerging legislative and regulatory developments',
      'Deputise for MLRO when required',
    ],
  },
  
  'tm-analyst': {
    title: 'Transaction Monitoring (TM) Analyst',
    band: 'G',
    exposures: [
      'CRITICAL detection_risk: Operates where financial crime becomes visible - missed alerts enable layering',
      'HIGH fatigue_risk: High alert volumes increase risk of fatigue-driven errors and incorrect discounting',
      'HIGH documentation_risk: Inadequate investigation notes weaken audit trail and SAR quality',
      'CRITICAL timing_risk: Delays in escalation can breach regulatory reporting timeframes',
    ],
    responsibilities: [
      'Review transaction monitoring alerts daily against customer profiles',
      'Conduct thorough documented investigations into flagged activity',
      'Determine whether to discount, monitor, or escalate alerts',
      'Prepare clear investigation notes and case records for audit',
      'Escalate SAR-threshold cases to nominated officer',
      'Identify typologies and emerging patterns indicating ML/fraud',
      'Maintain accurate case management records throughout lifecycle',
      'Support periodic reviews with transaction analysis',
      'Adhere to SLA requirements for alert review and escalation',
      'Contribute to team quality assurance activities',
    ],
  },
  
  'kyc-analyst': {
    title: 'KYC Analyst',
    band: 'G',
    exposures: [
      'CRITICAL high_risk_customers: Handles the bank\'s highest-risk customers directly',
      'HIGH judgement_risk: Relies on professional judgement, not just checklists',
      'CRITICAL detection_risk: Weak analysis allows illegitimate customers to go undetected',
      'HIGH escalation_risk: Failure to escalate leads directly to regulatory breaches',
    ],
    responsibilities: [
      'Review and validate official identity documents',
      'Evaluate customers based on geography, business, transaction patterns',
      'Perform CDD and EDD including Source of Wealth/Funds investigations',
      'Screen entities against sanctions, PEP lists, adverse media',
      'Conduct beneficial ownership investigations',
      'Periodically review client profiles to detect unusual behaviour',
      'Document findings and escalate suspicious activities to MLRO',
      'Perform detailed research using World-Check, D&B, Lexis Nexis',
      'Make sound decisions on AML, sanctions, reputational concerns',
      'Conduct enhanced due diligence on higher-risk relationships',
      'Review ongoing screening and monitoring results',
      'Support testing, audit, and training material development',
    ],
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { role_key } = req.body;

    console.log('[/api/roles/import] Importing role:', role_key);

    // Validate role key
    if (!role_key || !ROLES[role_key as keyof typeof ROLES]) {
      return res.status(400).json({
        error: 'Invalid role_key',
        available_roles: Object.keys(ROLES),
      });
    }

    const roleData = ROLES[role_key as keyof typeof ROLES];

    // Create role in database
    const role = await db.role.create({
      data: {
        title: roleData.title,
        exposures: roleData.exposures,
        responsibilities: roleData.responsibilities,
      },
    });

    console.log('[/api/roles/import] Role created:', role.id);

    // Log audit event
    await logAudit('role_imported', 'system', {
      role_id: role.id,
      role_title: role.title,
      role_key: role_key,
      band: roleData.band,
      source: 'preset',
    });

    return res.status(200).json({
      role_id: role.id,
      role_title: role.title,
      role_key: role_key,
      band: roleData.band,
      status: 'imported',
    });
  } catch (error: unknown) {
    console.error('[/api/roles/import] Error:', error);
    const errorMessage = getErrorMessage(error);

    await logAudit('role_import_failed', 'system', {
      error: errorMessage,
    });

    return res.status(500).json({
      error: errorMessage,
      type: 'IMPORT_FAILED',
    });
  }
}
