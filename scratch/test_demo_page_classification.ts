import { extractFromDocument } from '../services/documentExtractionService';

async function main() {
  const fileLike: any = { name: 'demo_gluc_report.pdf', type: 'application/pdf' };
  const result = await extractFromDocument(fileLike);
  console.log('document_type:', result.document_type);
  console.log('page_classifications:', JSON.stringify(result.page_classifications));

  const fileLike2: any = { name: 'demo_cbc_report.pdf', type: 'application/pdf' };
  const result2 = await extractFromDocument(fileLike2);
  console.log('document_type2:', result2.document_type);
  console.log('page_classifications2:', JSON.stringify(result2.page_classifications));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
