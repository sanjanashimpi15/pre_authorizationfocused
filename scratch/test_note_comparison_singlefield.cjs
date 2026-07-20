const buildSingleFieldPrompt = (field, noteText, documentJson) => `
Compare this ONE field between the CLINICAL NOTE and the EXTRACTED DOCUMENT DATA: "${field}".
Determine status: "match" (both agree), "mismatch" (both present, disagree), "missing_in_document" (only in note), "missing_in_note" (only in document).
Return ONLY this JSON object (no array, no markdown fences):
{"status": "match"|"mismatch"|"missing_in_document"|"missing_in_note", "note_value": string|null, "document_value": string|null}

CLINICAL NOTE:
${noteText}

EXTRACTED DOCUMENT DATA:
${documentJson}
`;

async function callField(field, noteText, documentJson) {
  const prompt = buildSingleFieldPrompt(field, noteText, documentJson);
  const start = Date.now();
  const res = await fetch('http://localhost:3000/api/ollama-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, timeoutMs: 30000 })
  });
  const elapsed = Date.now() - start;
  const json = await res.json();
  return { field, status: res.status, elapsed, raw: json };
}

async function main() {
  const noteText = 'Patient A. Paramesh, 49 year old male, presenting with fever and headache for 2 days. Provisional diagnosis: Dengue.';
  const documentJson = JSON.stringify({
    patient: { patientName: 'A. Paramesh', age: 50, gender: 'Male' },
    insurance: { insurerName: 'Star Health and Allied Insurance Co Ltd', policyNumber: '2579112105001267' }
  });

  // Test all 5 fields in parallel
  const fields = ['patient_name', 'age', 'gender', 'policy_number', 'insurer_name'];
  const start = Date.now();
  const results = await Promise.all(fields.map(f => callField(f, noteText, documentJson)));
  const totalElapsed = Date.now() - start;

  for (const r of results) {
    console.log(`\n=== ${r.field} (HTTP ${r.status}, ${(r.elapsed/1000).toFixed(2)}s) ===`);
    console.log(JSON.stringify(r.raw, null, 2));
  }
  console.log(`\n=== TOTAL WALL TIME (parallel): ${(totalElapsed/1000).toFixed(2)}s ===`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
