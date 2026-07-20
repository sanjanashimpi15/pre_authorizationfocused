import { extractFromDocument } from '../services/documentExtractionService';
import { computeReadiness } from '../utils/readinessScore';

async function main() {
  console.log('=== STEP 1: Extraction (demo-mode, real extractFromDocument code path) ===');
  const fileLike: any = { name: 'demo_gluc_report.pdf', type: 'application/pdf' };
  const extracted = await extractFromDocument(fileLike);
  console.log('document_type:', extracted.document_type);
  console.log('page_classifications:', JSON.stringify(extracted.page_classifications));
  console.log('patient:', JSON.stringify(extracted.patient));
  console.log('insurance:', JSON.stringify(extracted.insurance));

  console.log('\n=== STEP 2: Merge into a wizard record (mirrors index.tsx updateRecord) ===');
  // Intentionally mismatched note: age differs from extraction (28 -> note says 30),
  // and the note never mentions TPA/policy specifics beyond what's asserted.
  const record: any = {
    patient: {
      patientName: extracted.patient?.name,
      age: extracted.patient?.age,
      gender: extracted.patient?.gender,
    },
    insurance: {
      insurerName: extracted.insurance?.insurance_company,
      policyNumber: extracted.insurance?.policy_number,
    },
    clinical: {
      chiefComplaints: `Patient ${extracted.patient?.name}, 30 year old ${(extracted.patient?.gender || '').toLowerCase()}, insured with ${extracted.insurance?.insurance_company}, presenting with elevated glucose.`,
      historyOfPresentIllness: '',
      relevantClinicalFindings: '',
    },
  };
  console.log('record.patient:', JSON.stringify(record.patient));
  console.log('record.clinical.chiefComplaints:', record.clinical.chiefComplaints);

  console.log('\n=== STEP 3: Claim Readiness (real computeReadiness code path) ===');
  const readiness = computeReadiness(record, null);
  console.log('score:', readiness.score);
  console.log('missingItems:');
  for (const item of readiness.missingItems) {
    console.log(`  - [${item.deduction}] ${item.text}${item.reason ? ` — ${item.reason}` : ''}`);
  }

  console.log('\n=== STEP 4: Page classification badge data (what InsuranceModule.tsx would render) ===');
  const pageDocumentTypes = extracted.page_classifications
    ? Object.fromEntries(Object.entries(extracted.page_classifications).map(([p, c]) => [Number(p), c.document_type]))
    : undefined;
  console.log('pageDocumentTypes (badge source):', JSON.stringify(pageDocumentTypes));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
