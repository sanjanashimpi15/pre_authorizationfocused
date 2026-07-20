const COMPARISON_FIELDS = ['patient_name', 'age', 'gender', 'policy_number', 'insurer_name'];

const buildNoteComparisonPrompt = (noteText, documentJson) => `
Compare the CLINICAL NOTE against the EXTRACTED DOCUMENT DATA (JSON) below, for EXACTLY
these 5 fields, in this exact order: ${COMPARISON_FIELDS.join(', ')}.

For each field, determine one status:
- "match": both sources have a value and they agree
- "mismatch": both sources have a value but they DISAGREE (this is not the same as match —
  only use "match" when the values are the same)
- "missing_in_document": the note has a value but the document does not
- "missing_in_note": the document has a value but the note does not

You MUST return a JSON ARRAY with EXACTLY 5 objects, one per field, even if a field is
identical or absent in both. Do not return a single object. Do not omit any field.

EXAMPLE (illustrative only, not the real data):
Note: "Patient Ramesh Kumar, 45yo male"
Document: {"patient": {"name": "Ramesh Kumar", "age": 52}, "insurance": {}}
Correct output:
[
  {"field": "patient_name", "status": "match", "note_value": "Ramesh Kumar", "document_value": "Ramesh Kumar"},
  {"field": "age", "status": "mismatch", "note_value": "45", "document_value": "52"},
  {"field": "gender", "status": "missing_in_document", "note_value": "male", "document_value": null},
  {"field": "policy_number", "status": "missing_in_note", "note_value": null, "document_value": null},
  {"field": "insurer_name", "status": "missing_in_note", "note_value": null, "document_value": null}
]
(Note: policy_number/insurer_name above are "missing_in_note" only because they're also
absent from the document in this example — if the document HAD a value and the note
didn't, that pair would still be "missing_in_note" per the rule above.)

Return ONLY the JSON array, no markdown fences, no preamble.

CLINICAL NOTE:
${noteText}

EXTRACTED DOCUMENT DATA:
${documentJson}
`;

async function main() {
  // Deliberately: age mismatch (49 vs 50), gender match, policy match, insurer missing from note
  const noteText = 'Patient A. Paramesh, 49 year old male, presenting with fever and headache for 2 days. Provisional diagnosis: Dengue.';
  const documentData = {
    patient: { patientName: 'A. Paramesh', age: 50, gender: 'Male' },
    insurance: { insurerName: 'Star Health and Allied Insurance Co Ltd', policyNumber: '2579112105001267' }
  };

  const prompt = buildNoteComparisonPrompt(noteText, JSON.stringify(documentData));

  const start = Date.now();
  const res = await fetch('http://localhost:3000/api/ollama-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, timeoutMs: 90000 })
  });
  const elapsed = Date.now() - start;

  const json = await res.json();
  console.log('=== HTTP STATUS:', res.status, '===');
  console.log('=== RAW RESPONSE ===');
  console.log(JSON.stringify(json, null, 2));
  console.log(`\n=== LATENCY: ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s) ===`);

  if (json.text) {
    let jsonStr = json.text.trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('\n=== PARSED COMPARISON ===');
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
