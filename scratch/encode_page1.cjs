const fs = require('fs');
const path = 'C:\\Users\\sanja\\.gemini\\antigravity\\scratch\\claims-ocr-pipeline\\intermediate\\images\\A_Paramesh__Apex_Hospital__Kamareddy_1784339388719_page_1.png';
const b64 = fs.readFileSync(path).toString('base64');
fs.writeFileSync(__dirname + '/page1_b64.txt', b64);
console.log('base64 length:', b64.length);
