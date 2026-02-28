const fs = require('fs');
const filePath = 'server/routes/rsm.js';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find where the reject endpoint comment is
const rejectCommentIdx = lines.findIndex((l, i) => i > 850 && l.includes("POST /api/rsm/spare-requests/:requestId/reject"));
console.log('Reject endpoint comment found at line:', rejectCommentIdx + 1);

// Walk backwards to find the closing }); of the approve endpoint
let approveEndIdx = rejectCommentIdx - 1;
let braceCount = 0;
let foundEnd = false;
while (approveEndIdx >= 0 && !foundEnd) {
  const line = lines[approveEndIdx];
  // Count closing braces
  for (let i = line.length - 1; i >= 0; i--) {
    if (line[i] === '}') {
      braceCount++;
      if (braceCount === 2 && line.includes('});')) {
        foundEnd = true;
        break;
      }
    }
  }
  if (!foundEnd) approveEndIdx--;
}

console.log('Approve endpoint closes at line:', approveEndIdx + 1);
console.log('Line content:', lines[approveEndIdx]);

// Show what's between them
console.log('\nContent between approve end and reject comment:');
for (let i = approveEndIdx + 1; i < rejectCommentIdx && i < approveEndIdx + 20; i++) {
  console.log('Line', i + 1, ':', lines[i]);
}
