import { computeReadiness } from '../utils/readinessScore';
import { PreAuthRecord } from '../components/PreAuthWizard/types';

// Mirrors the real extraction result from our Apex Hospital / A Paramesh test PDF
const extractedPatientPartial = {
    patientName: 'A. Paramesh',
    age: 50,
    gender: 'Male' as const,
    mobileNumber: '',
};
const extractedInsurancePartial = {
    insurerName: 'Star Health and Allied Insurance Co Ltd',
    tpaName: '',
    policyNumber: '2579112105001267',
    sumInsured: 0, // not present on this page, correctly null/0 per hardened prompt
};
const uploadedDocumentsPartial = [{ id: 'DOC-1', fileName: 'A Paramesh _Apex Hospital.pdf' } as any];

const emptyRecord: Partial<PreAuthRecord> = { patient: {}, insurance: { dataSource: 'manual' } as any };

function report(label: string, record: Partial<PreAuthRecord>) {
    const result = computeReadiness(record, null);
    console.log(`\n=== ${label} ===`);
    console.log('score:', result.score);
    console.log('missingItems:', result.missingItems.map(m => m.text));
    console.log('docsUploaded/docsRequired:', result.docsUploaded, '/', result.docsRequired);
}

// ── BEFORE THE FIX: all 3 calls merge against the SAME stale snapshot ──────
// (reproduces the bug: last call wins, first two are discarded)
{
    const stale = emptyRecord;
    const afterPatientCall = { ...stale, patient: { ...stale.patient, ...extractedPatientPartial } };
    // BUG: insurance call also merges against `stale`, not `afterPatientCall`
    const afterInsuranceCall = { ...stale, insurance: { ...stale.insurance, ...extractedInsurancePartial } };
    // BUG: documents call also merges against `stale`, not `afterInsuranceCall`
    const afterDocumentsCall = { ...stale, uploadedDocuments: uploadedDocumentsPartial };
    // afterDocumentsCall is what setRecord() ends up holding — patient & insurance both lost
    report('BEFORE FIX (stale-closure race reproduced)', afterDocumentsCall);
}

// ── AFTER STEP 1 FIX: each call merges against the latest state ───────────
{
    let record: Partial<PreAuthRecord> = emptyRecord;
    record = { ...record, patient: { ...record.patient, ...extractedPatientPartial } };
    record = { ...record, insurance: { ...record.insurance, ...extractedInsurancePartial } };
    record = { ...record, uploadedDocuments: uploadedDocumentsPartial };
    report('AFTER STEP 1 FIX (sequential functional merges)', record);
}

// ── AFTER PERSISTENCE-RACE FIX: single bundled merge, exactly what
// onExtractionComplete now does in one updateRecord({...}) call ──────────
{
    const record: Partial<PreAuthRecord> = {
        ...emptyRecord,
        patient: { ...emptyRecord.patient, ...extractedPatientPartial },
        insurance: { ...emptyRecord.insurance, ...extractedInsurancePartial },
        uploadedDocuments: uploadedDocumentsPartial,
    };
    report('AFTER PERSISTENCE FIX (single bundled updateRecord call)', record);
}
