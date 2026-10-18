import {
  isPostcodeInServiceArea,
  parseUkPostcode,
  extractOutwardCode,
  normalizeUkPostcode,
  isValidUkPostcode,
  isValidUkOutwardCode,
  buildPostcodeDistrictRegex,
  buildAddressDistrictRegex,
} from '@laundelle/utils';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${desc}`);
    failed++;
  }
}

console.log('\n=== SUITE 1: EXACT POSTCODE DISTRICT MATCHING & OVERLAP PREVENTION ===');
const prestonAreas = ['PR1', 'PR2'];

// PR1 and PR2 should match
assert(isPostcodeInServiceArea('PR1 4UD', prestonAreas), 'PR1 4UD matches PR1/PR2 service area');
assert(isPostcodeInServiceArea('PR14UD', prestonAreas), 'PR14UD (no space) matches PR1/PR2 service area');
assert(isPostcodeInServiceArea('pr1 4ud', prestonAreas), 'pr1 4ud (lowercase) matches PR1/PR2 service area');
assert(isPostcodeInServiceArea('  PR1   4UD  ', prestonAreas), 'PR1 4UD with extra spaces matches PR1/PR2 service area');
assert(isPostcodeInServiceArea('PR2 3BH', prestonAreas), 'PR2 3BH matches PR1/PR2 service area');
assert(isPostcodeInServiceArea('PR23BH', prestonAreas), 'PR23BH matches PR1/PR2 service area');
assert(isPostcodeInServiceArea('PR1', prestonAreas), 'PR1 (outward only) matches PR1/PR2 service area');
assert(isPostcodeInServiceArea('PR2', prestonAreas), 'PR2 (outward only) matches PR1/PR2 service area');

// Overlapping and non-matching postcodes MUST NEVER match PR1 or PR2
assert(!isPostcodeInServiceArea('PR10 2AB', prestonAreas), 'PR10 2AB NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR102AB', prestonAreas), 'PR102AB NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR10', prestonAreas), 'PR10 (outward only) NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR11 3CD', prestonAreas), 'PR11 3CD NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR11', prestonAreas), 'PR11 NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR12 4EF', prestonAreas), 'PR12 4EF NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR22 3BH', prestonAreas), 'PR22 3BH NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR22', prestonAreas), 'PR22 NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR2A 1AA', prestonAreas), 'PR2A 1AA NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR2A', prestonAreas), 'PR2A NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR29 4UD', prestonAreas), 'PR29 4UD NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('PR29', prestonAreas), 'PR29 NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('SW1A 1AA', prestonAreas), 'SW1A 1AA NEVER matches PR1 or PR2');
assert(!isPostcodeInServiceArea('M1 1AA', prestonAreas), 'M1 1AA NEVER matches PR1 or PR2');

console.log('\n=== SUITE 2: UK POSTCODE FORMAT VALIDATION (BS 7666) ===');
// Valid formats
assert(isValidUkPostcode('M1 1AA'), 'M1 1AA is valid (AN NAA)');
assert(isValidUkPostcode('M60 1NW'), 'M60 1NW is valid (ANN NAA)');
assert(isValidUkPostcode('CR2 6XH'), 'CR2 6XH is valid (AAN NAA)');
assert(isValidUkPostcode('DN55 1PT'), 'DN55 1PT is valid (AANN NAA)');
assert(isValidUkPostcode('W1A 1HQ'), 'W1A 1HQ is valid (ANA NAA)');
assert(isValidUkPostcode('EC1A 1BB'), 'EC1A 1BB is valid (AANA NAA)');
assert(isValidUkPostcode('GIR 0AA'), 'GIR 0AA is valid (Special Girobank)');
assert(isValidUkPostcode('pr1 4ud'), 'pr1 4ud is valid (lowercase)');
assert(isValidUkPostcode('PR14UD'), 'PR14UD is valid (compact)');

// Invalid full postcodes
assert(!isValidUkPostcode('PR1'), 'PR1 is not a full postcode (outward only)');
assert(!isValidUkPostcode('12345'), '12345 is not a valid UK postcode');
assert(!isValidUkPostcode('XYZ 999'), 'XYZ 999 is not a valid UK postcode');
assert(!isValidUkPostcode('PR1 4U'), 'PR1 4U is incomplete');
assert(!isValidUkPostcode(''), 'Empty string is not a valid UK postcode');
assert(!isValidUkPostcode(null as any), 'null is not a valid UK postcode');

// Outward code validation
assert(isValidUkOutwardCode('PR1'), 'PR1 is valid outward code');
assert(isValidUkOutwardCode('PR10'), 'PR10 is valid outward code');
assert(isValidUkOutwardCode('SW1A'), 'SW1A is valid outward code');
assert(isValidUkOutwardCode('M1'), 'M1 is valid outward code');
assert(!isValidUkOutwardCode('1234'), '1234 is not a valid outward code');
assert(!isValidUkOutwardCode('P'), 'Single letter P is not a valid outward code');

console.log('\n=== SUITE 3: OUTWARD EXTRACTION & NORMALIZATION ===');
assert(extractOutwardCode('PR1 4UD') === 'PR1', 'extractOutwardCode("PR1 4UD") === "PR1"');
assert(extractOutwardCode('PR10 2AB') === 'PR10', 'extractOutwardCode("PR10 2AB") === "PR10"');
assert(extractOutwardCode('PR2A 1AA') === 'PR2A', 'extractOutwardCode("PR2A 1AA") === "PR2A"');
assert(extractOutwardCode('PR14UD') === 'PR1', 'extractOutwardCode("PR14UD") === "PR1"');
assert(extractOutwardCode('PR102AB') === 'PR10', 'extractOutwardCode("PR102AB") === "PR10"');
assert(extractOutwardCode('12 High Street, Preston, PR1 4UD') === 'PR1', 'extractOutwardCode extracts PR1 from full address');
assert(extractOutwardCode('12 High Street, Preston, PR10 2AB') === 'PR10', 'extractOutwardCode extracts PR10 from full address');

assert(normalizeUkPostcode('pr14ud') === 'PR1 4UD', 'normalizeUkPostcode("pr14ud") === "PR1 4UD"');
assert(normalizeUkPostcode('  pr10  2ab ') === 'PR10 2AB', 'normalizeUkPostcode("  pr10  2ab ") === "PR10 2AB"');
assert(normalizeUkPostcode('pr1') === 'PR1', 'normalizeUkPostcode("pr1") === "PR1"');

console.log('\n=== SUITE 4: MONGODB REGEX DISTRICT BOUNDARY TESTS ===');
const regexPr1 = buildPostcodeDistrictRegex('PR1');
assert(regexPr1.test('PR1 4UD'), 'Regex PR1 matches "PR1 4UD"');
assert(regexPr1.test('PR14UD'), 'Regex PR1 matches "PR14UD"');
assert(regexPr1.test('PR1'), 'Regex PR1 matches "PR1"');
assert(!regexPr1.test('PR10 2AB'), 'Regex PR1 does NOT match "PR10 2AB"');
assert(!regexPr1.test('PR102AB'), 'Regex PR1 does NOT match "PR102AB"');
assert(!regexPr1.test('PR10'), 'Regex PR1 does NOT match "PR10"');
assert(!regexPr1.test('PR11 3CD'), 'Regex PR1 does NOT match "PR11 3CD"');
assert(!regexPr1.test('PR1A 1AA'), 'Regex PR1 does NOT match "PR1A 1AA"');

const regexPr2 = buildPostcodeDistrictRegex('PR2');
assert(regexPr2.test('PR2 3BH'), 'Regex PR2 matches "PR2 3BH"');
assert(regexPr2.test('PR2'), 'Regex PR2 matches "PR2"');
assert(!regexPr2.test('PR22 3BH'), 'Regex PR2 does NOT match "PR22 3BH"');
assert(!regexPr2.test('PR2A 1AA'), 'Regex PR2 does NOT match "PR2A 1AA"');
assert(!regexPr2.test('PR29 4UD'), 'Regex PR2 does NOT match "PR29 4UD"');

console.log('\n=== SUITE 5: ADDRESS STRING BOUNDARY REGEX TESTS ===');
const addrRegexPr1 = buildAddressDistrictRegex('PR1');
assert(addrRegexPr1.test('10 Friargate, Preston, PR1 2EE'), 'Address regex PR1 matches "PR1 2EE" in address');
assert(addrRegexPr1.test('10 Friargate, Preston PR14UD'), 'Address regex PR1 matches "PR14UD" in address');
assert(!addrRegexPr1.test('10 High Road, Preston, PR10 2AB'), 'Address regex PR1 does NOT match "PR10 2AB" in address');
assert(!addrRegexPr1.test('15 Main St, Leyland, PR11 3CD'), 'Address regex PR1 does NOT match "PR11 3CD" in address');
assert(!addrRegexPr1.test('Flat 4, PR22 9ZZ'), 'Address regex PR1 does NOT match "PR22 9ZZ"');

console.log('\n=== SUITE 6: ADDRESS SCHEMA VALIDATION (ZOD) ===');
import { addressSchema } from '@laundelle/validations';

const validAddress = {
  label: 'Home',
  street: '12 Fishergate Hill',
  city: 'Preston',
  postcode: 'PR1 4UD'
};

const resValid = addressSchema.safeParse(validAddress);
assert(resValid.success, 'Valid address with PR1 4UD passes addressSchema');

const invalidPostcodeAddress = {
  ...validAddress,
  postcode: 'INVALID_POSTCODE_123'
};
const resInvalid = addressSchema.safeParse(invalidPostcodeAddress);
assert(!resInvalid.success, 'Invalid postcode fails addressSchema validation');

console.log('\n=== SUITE 7: MULTI-PLANT ROUTING SIMULATION ===');
interface MockPlant {
  id: string;
  name: string;
  service_pincodes: string[];
}

const plants: MockPlant[] = [
  { id: 'plant-preston-central', name: 'Preston Central Hub', service_pincodes: ['PR1', 'PR2'] },
  { id: 'plant-leyland', name: 'Leyland Hub', service_pincodes: ['PR10', 'PR25', 'PR26'] },
  { id: 'plant-manchester', name: 'Manchester Central', service_pincodes: ['M1', 'M2', 'M3'] }
];

function routeOrderToPlant(customerPostcode: string, plantList: MockPlant[]): MockPlant | null {
  for (const plant of plantList) {
    if (isPostcodeInServiceArea(customerPostcode, plant.service_pincodes)) {
      return plant;
    }
  }
  return null;
}

assert(routeOrderToPlant('PR1 4UD', plants)?.id === 'plant-preston-central', 'PR1 4UD correctly routes to Preston Central');
assert(routeOrderToPlant('PR2 3BH', plants)?.id === 'plant-preston-central', 'PR2 3BH correctly routes to Preston Central');
assert(routeOrderToPlant('PR10 2AB', plants)?.id === 'plant-leyland', 'PR10 2AB correctly routes to Leyland (NOT Preston Central)');
assert(routeOrderToPlant('PR25 1AA', plants)?.id === 'plant-leyland', 'PR25 1AA correctly routes to Leyland');
assert(routeOrderToPlant('M1 4AB', plants)?.id === 'plant-manchester', 'M1 4AB correctly routes to Manchester Central');
assert(routeOrderToPlant('PR11 2CD', plants) === null, 'PR11 2CD is unserviced and returns null (NEVER fallback to Plant A)');
assert(routeOrderToPlant('PR22 9ZZ', plants) === null, 'PR22 9ZZ is unserviced and returns null (NEVER fallback to Plant A)');
assert(routeOrderToPlant('SW1A 1AA', plants) === null, 'SW1A 1AA is unserviced and returns null (NEVER fallback to Plant A)');

console.log(`\n======================================================`);
console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
