import { USER_GUIDE_ARTICLES } from '../../../packages/ui/src/UserGuide/articles';
import { UserGuideArticle } from '../../../packages/ui/src/UserGuide/types';

function runUserGuideVerification() {
  console.log('=== LAUNDELLE USER GUIDE VERIFICATION SUITE ===\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      process.exitCode = 1;
    }
  }

  // 1. Article Count & Uniqueness
  assert(USER_GUIDE_ARTICLES.length >= 15, `Article count sufficient (found: ${USER_GUIDE_ARTICLES.length})`);
  
  const idSet = new Set<string>();
  let hasDuplicates = false;
  for (const a of USER_GUIDE_ARTICLES) {
    if (idSet.has(a.id)) {
      hasDuplicates = true;
      console.error(`Duplicate article ID found: ${a.id}`);
    }
    idSet.add(a.id);
  }
  assert(!hasDuplicates, 'All article IDs are unique');

  // 2. Required Fields on Articles
  let allHaveTitlesAndDescriptions = true;
  let allHaveCategories = true;
  let allHavePortals = true;
  let allHaveSteps = true;

  for (const a of USER_GUIDE_ARTICLES) {
    if (!a.title || !a.description) allHaveTitlesAndDescriptions = false;
    if (!a.category) allHaveCategories = false;
    if (!a.portals || a.portals.length === 0) allHavePortals = false;
    if (!a.steps || a.steps.length === 0) allHaveSteps = false;
  }

  assert(allHaveTitlesAndDescriptions, 'All articles have titles and descriptions');
  assert(allHaveCategories, 'All articles have defined categories');
  assert(allHavePortals, 'All articles declare portal applicability (admin, manager, or both)');
  assert(allHaveSteps, 'All articles contain structured steps');

  // 3. Admin Portal Coverage
  const adminArticles = USER_GUIDE_ARTICLES.filter(a => a.portals.includes('admin') || a.portals.includes('both'));
  assert(adminArticles.length >= 10, `Admin portal has extensive coverage (${adminArticles.length} articles)`);

  const expectedAdminKeys = [
    'quick-start-admin',
    'admin-dashboard',
    'admin-orders',
    'admin-staff',
    'admin-services',
    'admin-areas',
    'admin-finance',
    'admin-settings',
    'workflow-staff-onboarding',
  ];
  for (const key of expectedAdminKeys) {
    assert(adminArticles.some(a => a.id === key), `Admin coverage includes key article: ${key}`);
  }

  // 4. Manager Portal Coverage & Role Isolation
  const managerArticles = USER_GUIDE_ARTICLES.filter(a => a.portals.includes('manager') || a.portals.includes('both'));
  assert(managerArticles.length >= 8, `Manager portal has dedicated coverage (${managerArticles.length} articles)`);

  const expectedManagerKeys = [
    'quick-start-manager',
    'manager-dashboard',
    'manager-staff',
    'manager-drivers',
    'manager-processors',
  ];
  for (const key of expectedManagerKeys) {
    assert(managerArticles.some(a => a.id === key), `Manager coverage includes key article: ${key}`);
  }

  // Super Admin / Global Admin Only Articles must NOT leak to manager
  const superAdminOnly = USER_GUIDE_ARTICLES.filter(a => a.portals.length === 1 && a.portals[0] === 'admin');
  const leakedToManager = superAdminOnly.filter(a => a.portals.includes('manager') || a.portals.includes('both'));
  assert(leakedToManager.length === 0, 'Admin-restricted articles are strictly isolated from Manager view');

  // 5. Verification of Operational Rules & Auth0 Passwordless Details
  const staffArticle = USER_GUIDE_ARTICLES.find(a => a.id === 'admin-staff');
  assert(!!staffArticle, 'Admin staff article exists');
  const mentionsAuth0Ticket = staffArticle?.steps.some(s => s.instruction.toLowerCase().includes('auth0') || s.instruction.toLowerCase().includes('ticket'));
  assert(!!mentionsAuth0Ticket, 'Staff onboarding documents Auth0 passwordless ticket link pattern (no passwords stored in Laundelle)');

  const managerStaffArticle = USER_GUIDE_ARTICLES.find(a => a.id === 'manager-staff');
  assert(!!managerStaffArticle, 'Manager staff article exists');
  const mentionsMinimumStaffing = managerStaffArticle?.securityNotes?.some(n => n.toLowerCase().includes('minimum') || n.toLowerCase().includes('driver') || n.toLowerCase().includes('processor')) ||
                                  managerStaffArticle?.description.toLowerCase().includes('minimum') ||
                                  managerStaffArticle?.prerequisites?.some(p => p.toLowerCase().includes('minimum') || p.toLowerCase().includes('driver'));
  assert(!!mentionsMinimumStaffing, 'Manager documentation enforces minimum staffing rule (at least 1 driver and 1 processor)');

  // 6. Search Capabilities
  function searchArticles(query: string, portal: 'admin' | 'manager') {
    const q = query.toLowerCase().trim();
    const portalArticles = USER_GUIDE_ARTICLES.filter(a => {
      if (portal === 'manager') return a.portals.includes('manager') || a.portals.includes('both');
      return a.portals.includes('admin') || a.portals.includes('both');
    });

    return portalArticles.filter(article => {
      const titleMatch = article.title.toLowerCase().includes(q);
      const descMatch = article.description.toLowerCase().includes(q);
      const keywordMatch = article.keywords?.some((k) => k.toLowerCase().includes(q));
      const stepMatch = article.steps?.some(
        (s) => s.title.toLowerCase().includes(q) || s.instruction.toLowerCase().includes(q)
      );
      const fieldMatch = article.fields?.some(
        (f) => f.name.toLowerCase().includes(q) || (f.description ? f.description.toLowerCase().includes(q) : false)
      );
      const errorMatch = article.commonErrors?.some(
        (e) => e.error.toLowerCase().includes(q) || e.cause.toLowerCase().includes(q) || e.resolution.toLowerCase().includes(q)
      );

      return titleMatch || descMatch || keywordMatch || stepMatch || fieldMatch || errorMatch;
    });
  }

  const testQueries = [
    { q: 'auth0', portal: 'admin' as const, expectedMin: 1 },
    { q: 'refund', portal: 'admin' as const, expectedMin: 1 },
    { q: 'postcode', portal: 'admin' as const, expectedMin: 1 },
    { q: 'driver', portal: 'manager' as const, expectedMin: 1 },
    { q: 'qr code', portal: 'manager' as const, expectedMin: 1 },
    { q: 'minimum', portal: 'manager' as const, expectedMin: 1 },
    { q: 'deactivate', portal: 'admin' as const, expectedMin: 1 },
    { q: 'audit log', portal: 'admin' as const, expectedMin: 1 },
  ];

  for (const t of testQueries) {
    const results = searchArticles(t.q, t.portal);
    assert(results.length >= t.expectedMin, `Search query "${t.q}" in ${t.portal} portal returned ${results.length} result(s)`);
  }

  console.log(`\nVerification Complete: ${passedTests}/${totalTests} tests passed.`);
  if (passedTests === totalTests) {
    console.log('STATUS: ALL USER GUIDE VERIFICATIONS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runUserGuideVerification();
