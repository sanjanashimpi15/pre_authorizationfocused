const fs = require('fs');

const EXTRACTION_PROMPT = `
You are a highly experienced Indian TPA claims and medical data extraction assistant.
Extract patient and insurance information from this document. The document may be unstructured medical notes, discharge summaries, or scanned PDFs/images containing abbreviations, typos, or messy layouts.

CRITICAL INSTRUCTION FOR INSURER/TPA NAMES:
Hospitals and insurance cards use varying shorthand for insurer/TPA names. You must extract and normalize these to official Indian insurer/TPA names:
- "Star Health", "Star Health Insurance", "Star Health & Allied" -> "Star Health and Allied Insurance Co Ltd"
- "Care", "Care Health", "Religare" -> "Care Health Insurance"
- "Reliance", "Reliance General" -> "Reliance General Insurance"
- "Chola", "Cholamandalam" -> "Cholamandalam MS General Insurance Co Ltd"
- "Royal Sundaram" -> "Royal Sundaram General Insurance Co Ltd"
- "Manipal", "Cigna" -> "ManipalCigna Health Insurance Company Limited"
- "HDFC ERGO", "HDFC" -> "HDFC ERGO General Insurance Co Ltd"
- "Niva Bupa", "Max Bupa" -> "Niva Bupa Health Insurance"
- "ICICI Lombard", "ICICI" -> "ICICI Lombard General Insurance Co Ltd"
- "SBI General" -> "SBI General Insurance"
- "Aditya Birla" -> "Aditya Birla Health Insurance Co Ltd"
- For TPAs like "Medi Assist", "MDIndia", "Vidal Health", "Paramount Healthcare", normalize them exactly.

Return ONLY valid JSON (no markdown formatting, no \`\`\`json block) in this exact structure:
{
  "document_type": "hospital_registration" | "insurance_card" | "policy_document" | "id_card" | "lab_report" | "prescription" | "discharge_summary" | "investigation_report" | "unknown",
  "patient": {
    "name": "Full name as written",
    "age": "number or null",
    "ageUnit": "years" | "months" | null,
    "dob": "YYYY-MM-DD or null",
    "gender": "Male" | "Female" | "Other" | null,
    "address": "Full address or null",
    "phone": "Phone number or null",
    "abha_id": "ABHA ID (Ayushman Bharat Health Account) or null"
  },
  "insurance": {
    "policy_number": "Policy/Certificate number or null",
    "insurance_company": "Company name or null",
    "tpa_name": "TPA name if visible or null",
    "sum_insured": "number or null",
    "valid_till": "YYYY-MM-DD or null",
    "member_id": "Member/Employee ID or null"
  },
  "confidence": "0-100 number",
  "notes": "Any issues or unclear text",
  "clinical_excerpts": [
    "verbatim clinical quote or clinical finding 1",
    "verbatim clinical quote or clinical finding 2"
  ]
}

If a field is not visible, missing, or unclear, return strictly null for that field. Do not make up information.

STRICT ANTI-HALLUCINATION RULE: Only extract a value if it is clearly and
directly stated in the document body text itself. Never infer, guess, or
derive a field from document titles, headers, section names, filenames, or
surrounding context that is not the actual field value. If you are not
certain a value is explicitly present, return null for that field — a
null is always preferred over a guess, even if the document seems related
to the field's topic (e.g. a document that mentions "insurance" in its
title does not mean an insurer name is present in the body).
`;

async function main() {
  const imageBase64 = fs.readFileSync(__dirname + '/page1_b64.txt', 'utf-8');

  const start = Date.now();
  const res = await fetch('http://localhost:3000/api/ollama-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: EXTRACTION_PROMPT, imageBase64 })
  });
  const elapsed = Date.now() - start;

  const json = await res.json();
  console.log('=== HTTP STATUS:', res.status, '===');
  console.log('=== RAW /api/ollama-vision RESPONSE ===');
  console.log(JSON.stringify(json, null, 2));
  console.log(`\n=== LATENCY: ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s) ===`);

  if (json.text) {
    let jsonStr = json.text.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('\n=== PARSED EXTRACTION ===');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('\n=== JSON PARSE FAILED ===', e.message);
    }
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
