import { computeReadiness } from '../utils/readinessScore';

// Same A. Paramesh scenario used all night: age mismatch (49 in note vs 50 in
// document), policy/insurer known from document but never mentioned in the note,
// gender/name genuinely present and corroborated.
const record: any = {
    patient: { patientName: 'A. Paramesh', age: 50, gender: 'Male' },
    insurance: { insurerName: 'Star Health and Allied Insurance Co Ltd', policyNumber: '2579112105001267' },
    clinical: {
        chiefComplaints: 'Patient A. Paramesh, 49 year old male, presenting with fever and headache for 2 days.',
        historyOfPresentIllness: 'Provisional diagnosis: Dengue.',
        relevantClinicalFindings: '',
    },
};

const result = computeReadiness(record, null);
console.log('score:', result.score);
console.log('\nmissingItems:');
for (const item of result.missingItems) {
    console.log(`- [${item.deduction}] ${item.text}${item.reason ? ` — ${item.reason}` : ''}`);
}
