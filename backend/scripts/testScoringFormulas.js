/**
 * CTFd Scoring Formula Validation Tests
 * 
 * Tests linear and logarithmic decay formulas against CTFd test cases
 * Run: node backend/scripts/testScoringFormulas.js
 */

/**
 * Linear decay formula (CTFd-exact)
 * value = initial - (decay * (solve_count - 1))
 */
function linearDecay(initial, decay, minimum, solveCount) {
  const adjustedCount = Math.max(0, solveCount - 1);
  let value = initial - (decay * adjustedCount);
  return Math.max(minimum, Math.floor(value));
}

/**
 * Logarithmic decay formula (CTFd-exact)
 * value = (((minimum - initial) / (decay^2)) * ((solve_count-1)^2)) + initial
 */
function logarithmicDecay(initial, decay, minimum, solveCount) {
  if (decay === 0) return initial;
  
  const adjustedCount = Math.max(0, solveCount - 1);
  let value = (((minimum - initial) / Math.pow(decay, 2)) * Math.pow(adjustedCount, 2)) + initial;
  return Math.max(minimum, Math.floor(value));
}

console.log('=== CTFd Scoring Formula Tests ===\n');

// Test Case 1: Linear Decay
console.log('TEST 1: Linear Decay (initial=500, decay=20, minimum=100)');
console.log('Expected behavior: Decrease by 20 points per solve');
console.log('First solver gets FULL 500 points\n');

const linearTests = [
  { solve: 1, expected: 500 },
  { solve: 2, expected: 480 },
  { solve: 3, expected: 460 },
  { solve: 5, expected: 420 },
  { solve: 10, expected: 320 },
  { solve: 20, expected: 120 },
  { solve: 21, expected: 100 }, // At minimum
  { solve: 25, expected: 100 }  // Stays at minimum
];

let linearPassed = 0;
let linearFailed = 0;

for (const test of linearTests) {
  const actual = linearDecay(500, 20, 100, test.solve);
  const pass = actual === test.expected;
  
  console.log(`Solve #${test.solve}: ${actual} points ${pass ? '✓' : `✗ (expected ${test.expected})`}`);
  
  if (pass) linearPassed++;
  else linearFailed++;
}

console.log(`\nLinear Tests: ${linearPassed}/${linearTests.length} passed\n`);

// Test Case 2: Logarithmic Decay
console.log('TEST 2: Logarithmic Decay (initial=500, decay=10, minimum=100)');
console.log('Expected behavior: Slow decay at first, then rapid');
console.log('Reaches minimum at solve #10\n');

const logTests = [
  { solve: 1, expected: 500 },
  { solve: 2, expected: 496 },
  { solve: 3, expected: 484 },
  { solve: 5, expected: 436 },
  { solve: 7, expected: 356 },
  { solve: 9, expected: 244 },
  { solve: 10, expected: 176 },
  { solve: 11, expected: 100 }, // At minimum
  { solve: 15, expected: 100 }  // Stays at minimum
];

let logPassed = 0;
let logFailed = 0;

for (const test of logTests) {
  const actual = logarithmicDecay(500, 10, 100, test.solve);
  const pass = actual === test.expected;
  
  console.log(`Solve #${test.solve}: ${actual} points ${pass ? '✓' : `✗ (expected ${test.expected})`}`);
  
  if (pass) logPassed++;
  else logFailed++;
}

console.log(`\nLogarithmic Tests: ${logPassed}/${logTests.length} passed\n`);

// Test Case 3: Edge Cases
console.log('TEST 3: Edge Cases');

const edgeCases = [
  {
    name: 'Zero solves (should return initial)',
    fn: linearDecay,
    params: [500, 20, 100, 0],
    expected: 500
  },
  {
    name: 'Decay of 0 (logarithmic)',
    fn: logarithmicDecay,
    params: [500, 0, 100, 5],
    expected: 500
  },
  {
    name: 'Initial equals minimum (linear)',
    fn: linearDecay,
    params: [100, 20, 100, 10],
    expected: 100
  },
  {
    name: 'Large solve count beyond minimum (linear)',
    fn: linearDecay,
    params: [500, 20, 100, 1000],
    expected: 100
  }
];

let edgePassed = 0;

for (const test of edgeCases) {
  const actual = test.fn(...test.params);
  const pass = actual === test.expected;
  
  console.log(`${test.name}: ${actual} ${pass ? '✓' : `✗ (expected ${test.expected})`}`);
  
  if (pass) edgePassed++;
}

console.log(`\nEdge Case Tests: ${edgePassed}/${edgeCases.length} passed\n`);

// Summary
const totalTests = linearTests.length + logTests.length + edgeCases.length;
const totalPassed = linearPassed + logPassed + edgePassed;
const totalFailed = totalTests - totalPassed;

console.log('=== Test Summary ===');
console.log(`Total tests: ${totalTests}`);
console.log(`✓ Passed: ${totalPassed}`);
console.log(`✗ Failed: ${totalFailed}`);

if (totalFailed === 0) {
  console.log('\n✓✓✓ ALL TESTS PASSED! ✓✓✓');
  console.log('Scoring formulas match CTFd exactly.');
  process.exit(0);
} else {
  console.log('\n✗✗✗ SOME TESTS FAILED ✗✗✗');
  console.log('Please review formula implementation.');
  process.exit(1);
}
