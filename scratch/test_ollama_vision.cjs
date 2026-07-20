const fs = require('fs');

async function main() {
  const b64 = fs.readFileSync(__dirname + '/page1_b64.txt', 'utf-8');

  const prompt = `Extract the following fields from this document image and return ONLY valid JSON (no markdown fences, no preamble): {"patient_name": string|null, "age": number|null, "gender": string|null, "policy_number": string|null, "insurer_name": string|null}. If a field is not clearly visible, use null.`;

  const start = Date.now();
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5vl:3b',
      messages: [
        { role: 'user', content: prompt, images: [b64] }
      ],
      options: { temperature: 0.0, num_ctx: 8192 },
      stream: false,
      format: 'json'
    })
  });
  const elapsed = Date.now() - start;

  const json = await res.json();
  console.log('=== RAW OLLAMA RESPONSE ===');
  console.log(JSON.stringify(json, null, 2));
  console.log(`\n=== LATENCY: ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s) ===`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
