import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

// Test-harness-only shim: services/apiKeys.ts's getOpenRouterClient() calls
// fetch('/api/openrouter') with a relative URL, which only resolves in a
// browser (relative to page origin). Node's fetch has no page origin, so we
// prepend the already-running local dev server's origin here, in this
// throwaway test script only — not touching any app code.
const realFetch = global.fetch;
global.fetch = ((input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return realFetch(`http://localhost:3000${input}`, init);
  }
  return realFetch(input, init);
}) as any;

import { extractFromDocument } from '../services/documentExtractionService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const pdfPath = 'C:\\Users\\sanja\\Downloads\\A Paramesh _Apex Hospital _Kamareddy.pdf';
  const arrayBuffer = fs.readFileSync(pdfPath);

  const srcDoc = await PDFDocument.load(arrayBuffer);
  const subDoc = await PDFDocument.create();
  const [copiedPage] = await subDoc.copyPages(srcDoc, [0]);
  subDoc.addPage(copiedPage);
  const subPdfBytes = await subDoc.save();
  const base64Data = Buffer.from(subPdfBytes).toString('base64');

  const fileLike: any = {
    name: 'A Paramesh _Apex Hospital _Kamareddy.pdf',
    type: 'application/pdf',
  };

  const pages = [{ index: 1, base64Data, fileName: 'A_Paramesh_page_1.pdf' }];

  console.log(`Loaded real PDF page 1 (claim form), base64 length: ${base64Data.length}`);

  const stageTimes: Record<string, number> = {};
  let lastStageStart = Date.now();
  const start = Date.now();

  const result = await extractFromDocument(fileLike, pages as any, (stage) => {
    const now = Date.now();
    stageTimes[stage] = now - lastStageStart;
    lastStageStart = now;
    console.log(`[STAGE] ${stage} reached at +${now - start}ms`);
  });

  const totalMs = Date.now() - start;

  console.log('\n=== FINAL RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  console.log(`\n=== TOTAL LATENCY: ${totalMs}ms (${(totalMs/1000).toFixed(2)}s) ===`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
