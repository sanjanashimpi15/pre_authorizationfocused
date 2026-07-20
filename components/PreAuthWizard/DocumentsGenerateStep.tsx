import React from 'react';
import { PreAuthRecord } from '../PreAuthWizard/types';
import { computeReadiness, scoreColorClass, readinessStatusLine } from '../../utils/readinessScore';
import { calculateTotals } from '../../utils/costCalculator';

interface DocGenerateStepProps {
    record: Partial<PreAuthRecord>;
    onRecordChange: (r: Partial<PreAuthRecord>) => void;
    onBack: () => void;
    onGenerate: (irdaiText: string) => void;
    defaultTab?: 'docs' | 'necessity' | 'summary' | 'declarations' | 'tpa-review';
    isDemo?: boolean;
    onResetDemo?: () => void;
    onJumpToStep?: (step: 1 | 2 | 3 | 4) => void;
    externalTpaReport?: any;
}

const RING_R = 40;
const RING_CX = 48;
const RING_CY = 48;
const RING_SIZE = 96;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export const DocumentsGenerateStep: React.FC<DocGenerateStepProps> = ({
    record,
    onBack,
    onJumpToStep
}) => {
    // 1. Compute Readiness Score and Gaps deterministically (TPA report is null/unused)
    const { score, missingItems, needsManualReview } = computeReadiness(record, null);
    const colors = scoreColorClass(score);
    const statusLine = readinessStatusLine(score, missingItems.length);
    const offset = CIRCUMFERENCE - (CIRCUMFERENCE * score) / 100;

    // 2. Extract structured data for review
    const patient = record.patient ?? {};
    const ins = record.insurance ?? {};
    const clinical = record.clinical ?? {};
    const admission = record.admission ?? {};
    const cost = record.costEstimate ?? {};
    const selectedDx = clinical.diagnoses?.[clinical.selectedDiagnosisIndex ?? 0];

    const escapeHtml = (v: any): string => {
        if (v === null || v === undefined || v === '') return '—';
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };

    // 3. Download Claim Summary PDF
    const handleDownloadClaimSummary = () => {
        const costTotals = calculateTotals({
            roomRentPerDay: cost.roomRentPerDay,
            expectedRoomDays: cost.expectedRoomDays,
            nursingChargesPerDay: cost.nursingChargesPerDay,
            icuChargesPerDay: cost.icuChargesPerDay,
            expectedIcuDays: cost.expectedIcuDays,
            otCharges: cost.otCharges,
            surgeonFee: cost.surgeonFee,
            anesthetistFee: cost.anesthetistFee,
            consultantFee: cost.consultantFee,
            investigationsEstimate: cost.investigationsEstimate,
            medicinesEstimate: cost.medicinesEstimate,
            consumablesEstimate: cost.consumablesEstimate,
            ambulanceCharges: cost.ambulanceCharges,
            miscCharges: cost.miscCharges,
            packageName: cost.packageName,
            isPackageRate: cost.isPackageRate,
            packageAmount: cost.packageAmount
        }, ins.sumInsured ?? 0);

        const lineOfTreatment = [
            clinical.proposedLineOfTreatment?.medical ? 'Medical Management' : null,
            clinical.proposedLineOfTreatment?.surgical ? 'Surgical Procedure' : null,
            clinical.proposedLineOfTreatment?.intensiveCare ? 'Intensive Care (ICU)' : null,
            clinical.proposedLineOfTreatment?.investigation ? 'Investigation/Diagnostic' : null,
        ].filter(Boolean).join(', ') || '—';

        const treatmentDays = (admission.expectedLengthOfStay ?? 0);
        const icuDays = (admission.expectedIcuDays ?? 0);

        const isLowConf = ins.dataSource === 'ocr' && (ins.ocrConfidence ?? 100) < 70;
        
        const renderValue = (val: string | number | null | undefined, isOcr?: boolean) => {
            if (val === null || val === undefined || val === '') {
                return '<span class="field-value empty">&mdash;</span>';
            }
            let text = escapeHtml(val);
            if (isLowConf && isOcr) {
                text += ` <span style="color:#d69e2e;font-size:9px;font-weight:600;">(⚠️ Low AI Confidence - Needs Verification)</span>`;
            }
            return `<span class="field-value">${text}</span>`;
        };

        const activeLine = clinical.proposedLineOfTreatment?.surgical ? 'surgical'
            : clinical.proposedLineOfTreatment?.intensiveCare ? 'icu'
            : clinical.proposedLineOfTreatment?.investigation ? 'investigation'
            : clinical.proposedLineOfTreatment?.nonAllopathic ? 'nonAllopathic'
            : 'medical';

        const treatmentCheckboxes = `
        <ul class="treatment-list">
          <li><span class="checkbox"><span class="box">${activeLine === 'medical' ? 'X' : ''}</span> Medical Management</span></li>
          <li><span class="checkbox"><span class="box">${activeLine === 'surgical' ? 'X' : ''}</span> Surgical Management</span></li>
          <li><span class="checkbox"><span class="box">${activeLine === 'icu' ? 'X' : ''}</span> Intensive Care</span></li>
          <li><span class="checkbox"><span class="box">${activeLine === 'investigation' ? 'X' : ''}</span> Investigation</span></li>
          <li><span class="checkbox"><span class="box">${activeLine === 'nonAllopathic' ? 'X' : ''}</span> Non-allopathic Treatment</span></li>
        </ul>`;

        const surgicalBlock = activeLine === 'surgical' ? `
        <tr style="background:#fcf8e3;">
          <td class="field-label">Surgery / Procedure Name</td>
          <td class="field-value">${escapeHtml(clinical.surgeryDetails?.nameOfSurgery || '—')}</td>
        </tr>
        <tr style="background:#fcf8e3;">
          <td class="field-label">Surgery ICD-10-PCS Code</td>
          <td class="field-value">${escapeHtml(clinical.surgeryDetails?.surgeryIcdCode || '—')}</td>
        </tr>` : '';

        const injuryBlock = clinical.injuryDetails?.isInjury ? `
        <tr style="background:#fff5f5;">
          <td class="field-label">Injury / Accident Date & Cause</td>
          <td class="field-value">${escapeHtml(clinical.injuryDetails?.dateOfInjury || '—')} &bull; ${escapeHtml(clinical.injuryDetails?.causeOfInjury || '—')}</td>
        </tr>
        <tr style="background:#fff5f5;">
          <td class="field-label">Medico-Legal Case (MLC)</td>
          <td class="field-value">${clinical.injuryDetails?.isMLC ? 'Yes' : 'No'}</td>
        </tr>` : '';

        const maternityBlock = clinical.maternityDetails?.isMaternity ? `
        <tr style="background:#f0fff4;">
          <td class="field-label">Maternity Expected Delivery Date</td>
          <td class="field-value">${escapeHtml(clinical.maternityDetails?.expectedDateOfDelivery || '—')}</td>
        </tr>
        <tr style="background:#f0fff4;">
          <td class="field-label">Gravida / Para Status</td>
          <td class="field-value">${escapeHtml(clinical.maternityDetails?.gravidaPara || '—')}</td>
        </tr>` : '';

        const gapItemsHtml = missingItems.length > 0
            ? missingItems.map(item => `
        <div class="gap-item">
          <div class="gtitle">&#9888; Step ${item.step}: ${escapeHtml(item.text)}</div>
          <div class="gmeta">Source checked: ${escapeHtml(item.reason || 'Source page not confidently identified')} &nbsp;|&nbsp; Action: Resolve on Step ${item.step}</div>
        </div>`).join('')
            : `<div class="gap-item" style="color:#22543d;font-weight:bold;">✓ No outstanding gaps — case ready for submission</div>`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Pre-Authorization Summary — Part C — ${escapeHtml(record.id)}</title>
<style>
  @page {
    size: A4;
    margin: 14mm 12mm 14mm 12mm;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
      font-size: 9px;
      color: #666;
    }
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Times New Roman", Georgia, serif;
    font-size: 11px;
    color: #1a1a1a;
    line-height: 1.45;
    margin: 0;
    padding: 12px;
  }
  .doc-title { text-align: center; margin-bottom: 4px; }
  .doc-title h1 { font-size: 14px; text-decoration: underline; margin: 0 0 2px 0; letter-spacing: 0.3px; }
  .doc-title h2 { font-size: 12px; text-decoration: underline; margin: 0; }
  .doc-title .note { font-size: 9.5px; font-style: italic; margin-top: 3px; }
  .case-meta {
    display: flex; justify-content: space-between; font-size: 9.5px; color: #444;
    border-bottom: 1px solid #999; padding-bottom: 4px; margin: 6px 0 12px 0;
  }
  .section { margin-bottom: 12px; break-inside: avoid; }
  .section-title { font-size: 11.5px; font-weight: bold; text-decoration: underline; margin-bottom: 6px; }
  table.field-table { width: 100%; border-collapse: collapse; }
  table.field-table td { padding: 3px 6px; vertical-align: top; border-bottom: 1px dotted #ccc; }
  .field-label { width: 42%; color: #333; white-space: nowrap; font-weight: 500; }
  .field-value { font-weight: 600; border-bottom: 1px solid #333; min-height: 14px; display: inline-block; width: 100%; }
  .field-value.empty { color: #999; font-weight: normal; font-style: italic; border-bottom: none; }
  .checkbox-row { display: flex; gap: 18px; align-items: center; }
  .checkbox { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; }
  .checkbox .box { width: 11px; height: 11px; border: 1px solid #333; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
  .treatment-list { list-style: none; padding: 0; margin: 4px 0 0 0; }
  .treatment-list li { display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 10.5px; }
  .cost-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .cost-table td { padding: 3px 6px; font-size: 10.5px; border-bottom: 1px dotted #ccc; }
  .cost-table td.amount { text-align: right; font-weight: 600; width: 110px; }
  .cost-table tr.total td { border-top: 1.5px solid #333; border-bottom: none; font-weight: bold; padding-top: 6px; }
  .declaration-block { font-size: 9.5px; color: #333; border: 1px solid #999; padding: 8px 10px; margin-top: 6px; }
  .sign-row { display: flex; justify-content: space-between; margin-top: 26px; }
  .sign-box { width: 44%; border-top: 1px solid #333; padding-top: 3px; font-size: 9.5px; text-align: center; }
  .gaps-section { margin-top: 14px; border: 1px solid #b33; padding: 8px 10px; break-inside: avoid; }
  .gaps-section .section-title { color: #b33; margin-bottom: 4px; }
  .gap-item { font-size: 10px; padding: 4px 0; border-bottom: 1px dotted #ddd; }
  .gap-item:last-child { border-bottom: none; }
  .gap-item .gtitle { font-weight: bold; color: #c53030; }
  .gap-item .gmeta { color: #555; font-size: 9px; }
  .score-strip {
    display: flex; justify-content: space-between; align-items: center;
    background: #f2f2f2; border: 1px solid #999; padding: 6px 10px;
    margin: 10px 0; font-size: 10.5px;
  }
  .score-strip .score-value { font-weight: bold; font-size: 13px; }
</style>
</head>
<body>

  <div class="doc-title">
    <h1>Request for Cashless Hospitalisation for Health Insurance</h1>
    <h2>Policy Part &ndash; C (Pre-Authorization Summary)</h2>
    <div class="note">Generated from extracted case data &mdash; structurally mapped to Pre-Auth Part C (Revised)</div>
  </div>

  <div class="case-meta">
    <span>Case ID: ${escapeHtml(record.id)}</span>
    <span>Generated: ${new Date().toLocaleString('en-IN')}</span>
  </div>

  <!-- SECTION A: TPA / INSURER / HOSPITAL -->
  <div class="section">
    <div class="section-title">A. Details of Third Party Administrator / Insurer / Hospital</div>
    <table class="field-table">
      <tr>
        <td class="field-label">a. Name of TPA / Insurance Company</td>
        <td>${renderValue(ins.insurerName || ins.tpaName, true)}</td>
      </tr>
      <tr>
        <td class="field-label">b. Name of Hospital</td>
        <td>${renderValue(record.declarations?.hospital?.hospitalName || 'Apex Hospital, Kamareddy')}</td>
      </tr>
      <tr>
        <td class="field-label">c. Rohini ID</td>
        <td>${renderValue(record.declarations?.hospital?.rohiniId)}</td>
      </tr>
      <tr>
        <td class="field-label">d. Hospital Address</td>
        <td>${renderValue(record.declarations?.hospital?.hospitalAddress)}</td>
      </tr>
    </table>
  </div>

  <!-- SECTION B: INSURED / PATIENT -->
  <div class="section">
    <div class="section-title">B. Insured / Patient Details</div>
    <table class="field-table">
      <tr>
        <td class="field-label">A. Name of the Patient</td>
        <td>${renderValue(patient.patientName, true)}</td>
      </tr>
      <tr>
        <td class="field-label">B. Gender / C. Age / D. Date of Birth</td>
        <td>
          <span class="field-value">${escapeHtml(patient.gender || '—')} &bull; ${patient.age ? `${patient.age} Years` : 'Age —'} &bull; ${patient.dateOfBirth ? `DOB: ${escapeHtml(patient.dateOfBirth)}` : 'DOB not confirmed'}</span>
        </td>
      </tr>
      <tr>
        <td class="field-label">E. Contact Number</td>
        <td>${renderValue(patient.mobileNumber)}</td>
      </tr>
      <tr>
        <td class="field-label">G/H. Insured Card ID / Policy Number</td>
        <td>${renderValue(ins.policyNumber || ins.tpaIdCardNumber, true)}</td>
      </tr>
      <tr>
        <td class="field-label">Sum Insured</td>
        <td>${renderValue(ins.sumInsured ? `₹ ${Number(ins.sumInsured).toLocaleString('en-IN')}` : undefined)}</td>
      </tr>
      <tr>
        <td class="field-label">N. Current Address of Insured Patient</td>
        <td>${renderValue(patient.city ? `${patient.address || ''} ${patient.city || ''}, ${patient.state || ''}`.trim() : undefined)}</td>
      </tr>
    </table>
  </div>

  <!-- SECTION C: TREATING DOCTOR / CLINICAL -->
  <div class="section">
    <div class="section-title">C. Treating Doctor / Clinical Details</div>
    <table class="field-table">
      <tr>
        <td class="field-label">A. Name of Treating Doctor</td>
        <td>${renderValue(record.declarations?.doctor?.doctorName)}</td>
      </tr>
      <tr>
        <td class="field-label">C. Nature of Illness / Presenting Complaint</td>
        <td>${renderValue(clinical.natureOfIllness || clinical.chiefComplaints)}</td>
      </tr>
      <tr>
        <td class="field-label">E. Duration of Present Ailment</td>
        <td>${renderValue(clinical.durationOfPresentAilment)}</td>
      </tr>
      <tr>
        <td class="field-label">F. Provisional Diagnosis</td>
        <td>${renderValue(selectedDx?.diagnosis)}</td>
      </tr>
      <tr>
        <td class="field-label">F.i. ICD-10 Code</td>
        <td>${renderValue(selectedDx?.icd10Code ? `${selectedDx.icd10Code} — ${selectedDx.icd10Description || ''}` : undefined)}</td>
      </tr>
      ${surgicalBlock}
      ${injuryBlock}
      ${maternityBlock}
    </table>

    <div style="margin-top:6px; font-size:10.5px;"><strong>G. Proposed Line of Treatment</strong></div>
    ${treatmentCheckboxes}
  </div>

  <!-- SECTION D: ADMISSION & COST -->
  <div class="section">
    <div class="section-title">D. Admission Details &amp; Estimated Cost</div>
    <div class="two-col">
      <table class="field-table">
        <tr>
          <td class="field-label">Date of Admission</td>
          <td>${renderValue(admission.dateOfAdmission)}</td>
        </tr>
        <tr>
          <td class="field-label">Emergency / Planned</td>
          <td>${renderValue(admission.admissionType)}</td>
        </tr>
        <tr>
          <td class="field-label">Expected Length of Stay</td>
          <td>${renderValue(treatmentDays ? `${treatmentDays} Days` : undefined)}</td>
        </tr>
      </table>
      <table class="field-table">
        <tr>
          <td class="field-label">Room Type</td>
          <td>${renderValue(admission.roomCategory)}</td>
        </tr>
        <tr>
          <td class="field-label">ICU Days</td>
          <td>${renderValue(icuDays ? `${icuDays} Days` : 'Not applicable')}</td>
        </tr>
      </table>
    </div>

    <table class="cost-table">
      <tr><td>Room Rent / day (incl. nursing &amp; service charges)</td><td class="amount">${cost.roomRentPerDay ? `₹ ${Number(cost.roomRentPerDay).toLocaleString('en-IN')}` : '<span class="field-value empty">&mdash;</span>'}</td></tr>
      <tr><td>Investigation / Diagnostic Cost</td><td class="amount">${cost.investigationsEstimate ? `₹ ${Number(cost.investigationsEstimate).toLocaleString('en-IN')}` : '<span class="field-value empty">&mdash;</span>'}</td></tr>
      <tr><td>ICU Charges</td><td class="amount">${cost.icuChargesPerDay ? `₹ ${Number(cost.icuChargesPerDay).toLocaleString('en-IN')}/day` : '<span class="field-value empty">Not applicable</span>'}</td></tr>
      <tr><td>Professional Fees (Surgeon / Anaesthetist / Consultation)</td><td class="amount">${(cost.surgeonFee || cost.consultantFee) ? `₹ ${((cost.surgeonFee ?? 0) + (cost.consultantFee ?? 0) + (cost.anesthetistFee ?? 0)).toLocaleString('en-IN')}` : '<span class="field-value empty">&mdash;</span>'}</td></tr>
      <tr><td>Medicines / Consumables / Implants</td><td class="amount">${(cost.medicinesEstimate || cost.consumablesEstimate) ? `₹ ${((cost.medicinesEstimate ?? 0) + (cost.consumablesEstimate ?? 0)).toLocaleString('en-IN')}` : '<span class="field-value empty">&mdash;</span>'}</td></tr>
      <tr class="total"><td>Sum Total Expected Cost of Hospitalization</td><td class="amount">₹ ${costTotals.totalEstimatedCost.toLocaleString('en-IN')}</td></tr>
    </table>
  </div>

  <!-- CLAIM READINESS STRIP -->
  <div class="score-strip">
    <span>Claim Readiness Score</span>
    <span class="score-value">${score} / 100 &mdash; ${escapeHtml(colors.label)}</span>
  </div>

  <!-- SECTION E: DECLARATION -->
  <div class="section">
    <div class="section-title">E. Declaration</div>
    <div class="declaration-block">
      We confirm having read, understood and agreed to the declarations governing this
      cashless hospitalisation request, including terms relating to policy coverage,
      non-admissible expenses, and the accuracy of information disclosed above. This
      summary is generated for pre-authorization review and does not itself constitute
      a signed submission.
    </div>
    <div class="sign-row">
      <div class="sign-box">Hospital Seal &amp; Authorized Signatory</div>
      <div class="sign-box">Patient / Insured Name &amp; Signature</div>
    </div>
  </div>

  <!-- SECTION F: OUTSTANDING ITEMS -->
  <div class="gaps-section">
    <div class="section-title">F. Outstanding Items for Review (${missingItems.length})</div>
    ${gapItemsHtml}
  </div>

</body>
</html>`;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };


    return (
        <div className="space-y-6 text-opd-text-primary">
            {/* Header section */}
            <div>
                <h2 className="text-lg font-bold font-lora text-opd-primary">Review & Generate Summary</h2>
                <p className="text-opd-text-secondary text-sm mt-1">Verify all extracted data, clinical details, and readiness checks before submission.</p>
            </div>

            {/* Dashboard grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left column: Minimal Patient & Clinical Summary */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* A. Patient Demographics */}
                    <div className="card-premium p-5 space-y-4">
                        <h3 className="font-semibold text-opd-primary text-xs uppercase tracking-wider border-b border-opd-border pb-2 font-lora">A. Patient Demographics</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Full Name</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{patient.patientName || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Age &amp; Gender</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{patient.age ? `${patient.age} Y` : '—'} / {patient.gender || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Date of Birth</span>
                                <span className="font-bold text-slate-800 block mt-0.5 font-mono">{patient.dateOfBirth || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Contact Number</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{patient.mobileNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">City &amp; State</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{patient.city || '—'}, {patient.state || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* B. Policy & Insurer */}
                    <div className="card-premium p-5 space-y-4">
                        <h3 className="font-semibold text-opd-primary text-xs uppercase tracking-wider border-b border-opd-border pb-2 font-lora">B. Policy & Insurer</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Insurance Company</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{ins.insurerName || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">TPA Coordinator</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{ins.tpaName || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Policy Number / Card ID</span>
                                <span className="font-bold text-slate-800 block mt-0.5 font-mono">{ins.policyNumber || ins.tpaIdCardNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Sum Insured</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{ins.sumInsured ? `₹ ${ins.sumInsured.toLocaleString('en-IN')}` : '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* C. Clinical Summary */}
                    <div className="card-premium p-5 space-y-4">
                        <h3 className="font-semibold text-opd-primary text-xs uppercase tracking-wider border-b border-opd-border pb-2 font-lora">C. Clinical Summary</h3>
                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Primary Diagnosis / Presenting Complaint</span>
                                <span className="font-bold text-slate-800 block mt-0.5">{selectedDx?.diagnosis || clinical.chiefComplaints || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Nature of Illness</span>
                                <span className="font-semibold text-slate-800 block mt-0.5">{clinical.natureOfIllness || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Key Clinical Findings</span>
                                <span className="text-slate-700 block mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                                    "{clinical.relevantClinicalFindings || 'No findings recorded'}"
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] text-opd-text-secondary uppercase tracking-wider block">Proposed Treatment & Line of Care</span>
                                <span className="font-semibold text-slate-800 block mt-0.5">
                                    {[
                                        clinical.proposedLineOfTreatment?.medical ? 'Medical Management' : null,
                                        clinical.proposedLineOfTreatment?.surgical ? 'Surgical Procedure' : null,
                                        clinical.proposedLineOfTreatment?.intensiveCare ? 'Intensive Care (ICU)' : null,
                                        clinical.proposedLineOfTreatment?.investigation ? 'Investigation/Diagnostic' : null,
                                    ].filter(Boolean).join(', ') || '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right column: Action Controls */}
                <div className="space-y-6">
                    <div className="card-premium p-5 space-y-4 shadow-sm">
                        <h3 className="font-semibold text-opd-primary text-xs uppercase tracking-wider border-b border-opd-border pb-2 font-lora">Export & Submission</h3>
                        
                        <button
                            type="button"
                            onClick={handleDownloadClaimSummary}
                            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-xs font-bold shadow-md"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Download Claim Summary PDF
                        </button>

                        <button
                            type="button"
                            onClick={onBack}
                            className="btn-secondary w-full py-2.5 text-xs font-semibold"
                        >
                            ← Back to Cost Estimation
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DocumentsGenerateStep;
