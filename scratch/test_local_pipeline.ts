import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';

const realFetch = global.fetch;
global.fetch = ((input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return realFetch(`http://localhost:3000${input}`, init);
  }
  return realFetch(input, init);
}) as any;

import { extractFromDocument } from '../services/documentExtractionService';

async function main() {
  const pdfPath = 'C:\\Users\\sanja\\Downloads\\A Paramesh _Apex Hospital _Kamareddy.pdf';
  const fullBuf = fs.readFileSync(pdfPath);

  // Single page only (the actual claim form, page 1) — the full 50-page document
  // caused the local pipeline to fail/timeout on the first attempt (heavy PP-StructureV3
  // model stack: layout + OCR + table + formula recognition, all loaded per invocation).
  const srcDoc = await PDFDocument.load(fullBuf);
  const subDoc = await PDFDocument.create();
  const [copiedPage] = await subDoc.copyPages(srcDoc, [0]);
  subDoc.addPage(copiedPage);
  const buf = Buffer.from(await subDoc.save());

  const fileLike: any = {
    name: 'A_Paramesh_page1.pdf',
    type: 'application/pdf',
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  };

  const stageTimestamps: Record<string, number> = {};
  const start = Date.now();
  const result = await extractFromDocument(fileLike, undefined, (stage) => {
    stageTimestamps[stage] = Date.now() - start;
    console.log(`[STAGE] ${stage} at +${Date.now() - start}ms`);
  });
  const totalMs = Date.now() - start;

  console.log('\n=== MAPPED ExtractedPatientData ===');
  console.log(JSON.stringify(result, null, 2));

  console.log(`\n=== TOTAL LATENCY: ${totalMs}ms (${(totalMs / 1000).toFixed(2)}s) ===`);
  console.log('Stage timestamps (ms from start):', stageTimestamps);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
