import { compareNoteToDocument } from '../services/noteDocumentComparison';

const noteText = 'Patient A. Paramesh, 49 year old male, presenting with fever and headache for 2 days. Provisional diagnosis: Dengue.';
const documentData = {
  patient: { patientName: 'A. Paramesh', age: 50, gender: 'Male' },
  insurance: { insurerName: 'Star Health and Allied Insurance Co Ltd', policyNumber: '2579112105001267' }
};

const result = compareNoteToDocument(noteText, documentData);
console.log(JSON.stringify(result, null, 2));
