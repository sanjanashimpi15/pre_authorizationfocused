import { classifyPagesByKeywords } from '../services/documentClassificationService';

const ocrPages: Record<string, string> = {
  '1': 'GOVERNMENT OF INDIA\nUnique Identification Authority of India\nAadhaar No: 1234 5678 9012',
  '2': 'Policy Number: 2579112105001267\nInsured: A. Paramesh\nSum Insured: 500000\nTPA: Medi Assist',
  '3': 'DISCHARGE SUMMARY\nDiagnosis: Dengue Fever\nAdmission Date: 10/09/2025',
  '4': 'Rx: Tab. Doxycycline 100mg BD\nMedication for 5 days\nDosage: twice daily',
  '5': 'PROGRESS NOTES\nClinical findings: stable vitals, afebrile',
  '6': 'COMPLETE BLOOD PICTURE\nInvestigation report\nLab results: WBC 9.1',
  '7': 'Random unrelated text with no matching keywords at all here.',
};

const result = classifyPagesByKeywords(ocrPages);
console.log(JSON.stringify(result, null, 2));
