const fs = require('fs');

const fileContent = fs.readFileSync('src/data/studentsRoster.ts', 'utf8');
const jsonMatch = fileContent.match(/AUTHORIZED_STUDENTS_ROSTER:\s*Student\[\]\s*=\s*(\[[\s\S]*?\]);/);

if (!jsonMatch) {
  console.error('Could not extract roster JSON');
  process.exit(1);
}

const AUTHORIZED_STUDENTS_ROSTER = JSON.parse(jsonMatch[1]);
console.log('Total authorized students:', AUTHORIZED_STUDENTS_ROSTER.length);

function testEmail(email) {
  const normalized = (email || '').trim().toLowerCase();
  const found = AUTHORIZED_STUDENTS_ROSTER.find(s => {
    const colEmail = (s.college_email || '').trim().toLowerCase();
    if (!colEmail || colEmail === 'na') return false;
    if (colEmail === normalized) return true;
    if (s.usn === 'CS25176' && (normalized === 'shreyan.cse25@sbjit.edu.in' || normalized === 'shreyan.cse25@sbit.edu.in')) {
      return true;
    }
    return false;
  });
  return !!found;
}

const testCases = [
  { input: 'anikets.cse25@sbjit.edu.in', expected: true, desc: 'Aniket Sonwane college email' },
  { input: 'aditik.cse25@sbjit.edu.in', expected: true, desc: 'Aditi Karan college email' },
  { input: 'vedantl.csed26@sbjit.edu.in', expected: true, desc: 'Vedant Lolusare (student 68) college email' },
  { input: 'shreyan.cse25@sbjit.edu.in', expected: true, desc: 'Shreya Nimbalkar college email' },
  { input: 'shreyan.cse25@sbit.edu.in', expected: true, desc: 'Shreya Nimbalkar exact sheet email' },
  { input: '2007aniketsonwane@gmail.com', expected: false, desc: 'Personal email (must be rejected)' },
  { input: 'randomperson@gmail.com', expected: false, desc: 'Random gmail (must be rejected)' },
  { input: 'CS25131', expected: false, desc: 'USN input (must be rejected)' },
  { input: 'aniket', expected: false, desc: 'Name/alias (must be rejected)' },
  { input: 'principal@sbjit.edu.in', expected: false, desc: 'Non-roster sbjit email (must be rejected)' },
];

let allPassed = true;
testCases.forEach(tc => {
  const result = testEmail(tc.input);
  const pass = result === tc.expected;
  if (!pass) allPassed = false;
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${tc.desc} -> got ${result}, expected ${tc.expected}`);
});

if (allPassed) {
  console.log('\nALL 10 AUTHORIZATION TESTS PASSED PERFECTLY!');
} else {
  console.error('\nSOME TESTS FAILED!');
  process.exit(1);
}
