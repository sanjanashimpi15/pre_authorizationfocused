const fs = require('fs');
const readline = require('readline');
const path = require('path');

const filePath = 'C:\\Users\\sanja\\.gemini\\antigravity\\brain\\9c6ac357-688b-47dd-bbc8-1ece3f5c9b95\\.system_generated\\logs\\transcript_full.jsonl';

const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    output: process.stdout,
    terminal: false
});

rl.on('line', (line) => {
    try {
        const obj = JSON.parse(line);
        if (obj.step_index === 930) {
            fs.writeFileSync('scratch/step_output.txt', JSON.stringify(obj, null, 2));
            process.exit(0);
        }
    } catch (e) {
        // ignore parsing errors
    }
});
