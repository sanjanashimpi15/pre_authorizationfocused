import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { extractFromDocument } from '../services/documentExtractionService';

const realFetch = global.fetch;
global.fetch = ((input: any, init?: any) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    return realFetch(`http://localhost:3000${input}`, init);
  }
  return realFetch(input, init);
}) as any;

async function main() {
  const pdfPath = 'C:\\Users\\sanja\\Downloads\\A Paramesh _Apex Hospital _Kamareddy.pdf';
  const arrayBuffer = fs.readFileSync(pdfPath);
  const srcDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = srcDoc.getPageCount();
  console.log(`Source PDF has ${totalPages} pages.`);

  // Representative subset only, to avoid burning remaining OpenRouter credits on all
  // 50 pages: 1=claim form, 7=OP invoice, 30=lab report (printed sheet photo), 44=phone
  // screenshot (near-zero text), 49=Aadhaar card photo, 50=selfie photo.
  const SAMPLE_PAGE_NUMBERS = [1, 7, 30, 49, 50].filter(p => p <= totalPages);
  const pages: { index: number; base64Data: string; fileName: string }[] = [];
  for (const pageNum of SAMPLE_PAGE_NUMBERS) {
    const i = pageNum - 1;
    const subDoc = await PDFDocument.create();
    const [copiedPage] = await subDoc.copyPages(srcDoc, [i]);
    subDoc.addPage(copiedPage);
    const subPdfBytes = await subDoc.save();
    pages.push({
      index: i + 1,
      base64Data: Buffer.from(subPdfBytes).toString('base64'),
      fileName: `page_${i + 1}.pdf`
    });
  }

  const fileLike: any = { name: 'A Paramesh _Apex Hospital _Kamareddy.pdf', type: 'application/pdf' };

  const start = Date.now();
  const result = await extractFromDocument(fileLike, pages as any, (stage) => {
    console.log(`[STAGE] ${stage} at +${Date.now() - start}ms`);
  });
  const totalMs = Date.now() - start;

  console.log('\n=== page_classifications ===');
  console.log(JSON.stringify(result.page_classifications, null, 2));

  console.log('\n=== Whole-document result (unchanged fields) ===');
  console.log(JSON.stringify({
    document_type: result.document_type,
    patient: result.patient,
    insurance: result.insurance,
    confidence: result.confidence,
    extracted_fields: result.extracted_fields,
    missing_fields: result.missing_fields,
    extraction_readiness_score: result.extraction_readiness_score,
  }, null, 2));

  console.log(`\n=== TOTAL LATENCY: ${totalMs}ms (${(totalMs / 1000).toFixed(2)}s) ===`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
