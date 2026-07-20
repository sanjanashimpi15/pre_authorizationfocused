import { computeReadiness } from '../utils/readinessScore';

// Policy number and insurer_name genuinely absent from the extracted document (both
// null) — insurer IS mentioned in the note (category 2: stated in note, not in doc),
// policy number is NOT mentioned anywhere (category 1: not found in either).
const record: any = {
    patient: { patientName: 'A. Paramesh', age: 50, gender: 'Male' },
    insurance: { insurerName: null, policyNumber: null },
    clinical: {
        chiefComplaints: 'Patient A. Paramesh, 50 year old male, insured with Star Health, presenting with fever.',
        historyOfPresentIllness: '',
        relevantClinicalFindings: '',
    },
};

const result = computeReadiness(record, null);
console.log('score:', result.score);
console.log('\nmissingItems:');
for (const item of result.missingItems) {
    console.log(`- [${item.deduction}] ${item.text}${item.reason ? ` — ${item.reason}` : ''}`);
}
