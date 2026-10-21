import { UserGuideArticle } from './types';

export const USER_GUIDE_ARTICLES: UserGuideArticle[] = [
  // =========================================================================
  // 1. GETTING STARTED
  // =========================================================================
  {
    id: 'quick-start-admin',
    title: 'Super Admin & Administrator Quick-Start Guide',
    description: 'Essential orientation for Administrators: understanding global visibility, role privileges, and daily management tasks.',
    category: 'Getting Started',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'dashboard',
    keywords: ['admin', 'super admin', 'quickstart', 'getting started', 'roles', 'permissions', 'navigation', 'overview'],
    badge: 'Essential',
    iconName: 'LayoutDashboard',
    purpose: 'Provides high-level system administrators with a comprehensive roadmap of the LAUNDELLE Admin Portal, explaining privilege boundaries, global oversight capabilities, and essential daily administrative workflows.',
    accessRequirements: 'Role required: Super Administrator (super_admin) or Administrator (admin). Authenticated via Auth0 and validated against the MongoDB users collection.',
    navigationPath: 'Admin Portal (http://localhost:3002 or admin.laundelle.co.uk) -> Login with authorized Admin credentials -> Landing Dashboard.',
    prerequisites: [
      'Active administrator account provisioned by a Super Admin.',
      'Auth0 enterprise login credentials with verified email address.',
      'Active session token stored in secure HttpOnly host-cookie.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Authenticate into the Admin Portal',
        instruction: 'Navigate to the Admin Portal URL and click "Sign in with Auth0". Enter your enterprise email and password. Upon successful verification, your account role will be validated from the MongoDB database.',
        tip: 'If your account has not yet been designated as an admin by a Super Admin, access will be blocked with an explicit unauthorized role message.'
      },
      {
        stepNumber: 2,
        title: 'Review the Operational KPI Topbar & Location Selector',
        instruction: 'Use the topbar dropdown to switch between "All Locations" or filter by a specific production plant (e.g. South West Central, City Core). Toggle date filters between Today, 7 Days, 30 Days, or Custom Date Range to adjust metrics dynamically.'
      },
      {
        stepNumber: 3,
        title: 'Inspect Live System Alerts',
        instruction: 'Check the persistent notification banner at the top of the dashboard for critical alerts: delayed orders, unresolved customer complaints, or driver route bottlenecks.'
      },
      {
        stepNumber: 4,
        title: 'Navigate Through Management Modules',
        instruction: 'Use the left sidebar to navigate across Orders, Customers CRM, Staff Accounts, Services & Pricing, Areas & Slots, Finance, and Settings.'
      }
    ],
    actions: [
      {
        button: 'Location Filter',
        style: 'neutral',
        effect: 'Filters all dashboard metrics and order statistics to a single selected plant facility.',
        whenToUse: 'When investigating performance anomalies in a specific regional facility.'
      },
      {
        button: 'Global Search (Cmd/Ctrl + K)',
        style: 'primary',
        effect: 'Opens the instantaneous cross-system search modal.',
        whenToUse: 'To quickly find an order by ID (ORD-...), customer by name or email, staff member, or bag QR code.'
      }
    ],
    successVerification: 'You are viewing the multi-plant Admin Dashboard with live metrics reflecting actual order and revenue data.',
    commonErrors: [
      {
        error: 'Access Restricted: Account has role "customer" or "manager"',
        cause: 'The logged-in Auth0 account does not possess administrator privileges in MongoDB.',
        resolution: 'Request a Super Administrator to elevate your role in the Staff Accounts module.'
      }
    ],
    securityNotes: [
      'Standard Administrators cannot create or delete Super Administrator accounts.',
      'Every administrative action is immutably recorded in the SHA-256 tamper-evident audit log.'
    ],
    relatedArticleIds: ['admin-dashboard', 'admin-staff', 'admin-settings', 'troubleshooting-auth-rbac']
  },

  {
    id: 'quick-start-manager',
    title: 'Plant Operations Manager Quick-Start Guide',
    description: 'Orientation for Plant Managers: plant isolation, queue monitoring, driver and processor staffing, and dispatch rules.',
    category: 'Getting Started',
    portals: ['manager', 'admin'],
    roles: ['manager', 'super_admin'],
    relatedTab: 'dashboard',
    keywords: ['manager', 'plant manager', 'operations', 'plant isolation', 'staffing banner', 'driver', 'processor', 'shift'],
    badge: 'Essential',
    iconName: 'Building2',
    purpose: 'Guides newly appointed Plant Operations Managers on managing their designated laundry processing facility, explaining plant isolation boundaries, queue stages, and minimum staffing rules.',
    accessRequirements: 'Role required: Plant Manager (manager or plant_manager) with an assigned plantId.',
    navigationPath: 'Operations Portal -> /manager or Admin Portal in Manager Mode.',
    prerequisites: [
      'Assigned plant facility in MongoDB (plantId linkage).',
      'At least 1 registered Driver and 1 registered Processor for the plant (mandatory for active operation).'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Sign in to the Operations Portal',
        instruction: 'Visit /manager and sign in. The system automatically scopes your session to your assigned plant facility.'
      },
      {
        stepNumber: 2,
        title: 'Verify Minimum Staffing Requirements',
        instruction: 'Look at the persistent yellow Staffing Warning Banner at the top of your workspace. If your plant has 0 active drivers or 0 active processors, click "Add Driver" or "Add Processor" immediately to bring the plant into compliant status.',
        caution: 'Plants without minimum staffing cannot be assigned automated pickup or processing workloads.'
      },
      {
        stepNumber: 3,
        title: 'Review Plant Queue Stages',
        instruction: 'Monitor the 5 internal processing stages: Intake/Sorting -> Washing -> Drying -> Ironing/Pressing -> Quality Control & Packing.'
      },
      {
        stepNumber: 4,
        title: 'Coordinate Outbound Dispatches',
        instruction: 'Once orders reach the "ready_for_delivery" status, assign them to on-duty plant drivers in the Orders or Drivers tab.'
      }
    ],
    actions: [
      {
        button: 'Add Driver (Banner Shortcut)',
        style: 'primary',
        effect: 'Opens the Staff Team creation modal pre-selected to the Driver role with plant auto-bound.',
        whenToUse: 'When the plant lacks active courier drivers.'
      },
      {
        button: 'Add Processor (Banner Shortcut)',
        style: 'primary',
        effect: 'Opens the Staff Team creation modal pre-selected to the Processor role with workstation selection.',
        whenToUse: 'When the facility lacks processing operators.'
      }
    ],
    successVerification: 'The Staffing Warning Banner turns green or dismisses, and the plant pipeline displays active orders in your queue.',
    commonErrors: [
      {
        error: 'Plant Isolation Violation: Access denied',
        cause: 'Attempting to inspect or modify staff, orders, or vehicles belonging to a different plant.',
        resolution: 'Managers are restricted strictly to their assigned facility. Contact a Super Admin if cross-plant re-assignment is required.'
      }
    ],
    securityNotes: [
      'Plant Managers CANNOT create other Plant Managers or Administrators.',
      'All data queries are automatically isolated by plantId at both the API client and database middleware layers.'
    ],
    relatedArticleIds: ['manager-dashboard', 'manager-staff', 'manager-drivers', 'manager-processors']
  },

  // =========================================================================
  // 2. CORE OPERATIONS
  // =========================================================================
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard & Multi-Plant Overview',
    description: 'Comprehensive guide to the operational dashboard: KPIs, revenue cards, live delivery tracking, alerts, and quick actions.',
    category: 'Core Operations',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'dashboard',
    keywords: ['dashboard', 'kpi', 'revenue', 'order volume', 'live tracking', 'alerts banner', 'location filter'],
    badge: 'Daily Use',
    iconName: 'LayoutDashboard',
    purpose: 'Serves as the executive flight deck for the entire LAUNDELLE laundry operation, consolidating real-time order progression, financial performance, delivery punctuality, and operational bottlenecks across all plants.',
    accessRequirements: 'Super Administrator or Administrator.',
    navigationPath: 'Left Sidebar -> "Dashboard" (topmost icon).',
    prerequisites: ['Active Admin session.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Review Key Metric KPI Tiles',
        instruction: 'Inspect the primary statistics: Total Revenue (£), Total Orders Placed, Active Orders in Processing, and Average Delivery SLA Punctuality.'
      },
      {
        stepNumber: 2,
        title: 'Filter by Location or Date Period',
        instruction: 'Use the topbar dropdowns to filter metrics by plant location or date intervals (Today, 7D, 30D, Custom Range).'
      },
      {
        stepNumber: 3,
        title: 'Analyze Order Flow Status Distribution',
        instruction: 'Review the visual order pipeline bar showing orders in Placed, Collected, In-Plant, Out for Delivery, and Delivered stages.'
      },
      {
        stepNumber: 4,
        title: 'Investigate Critical Alerts',
        instruction: 'Click on any notification badge in the Critical Alerts panel to navigate directly to problematic orders or delayed routes.'
      }
    ],
    tableInfo: {
      columns: ['Metric', 'Current Period', 'Previous Period', 'Delta (%)', 'Health Status'],
      filters: ['Location Selector', 'Date Range Selector (Today, 7D, 30D, Custom)'],
      sortAndSearch: 'Filterable by location; aggregated automatically from backend order collections.',
      rowActions: ['Click metric card to drill down into corresponding Orders or Finance view.']
    },
    successVerification: 'All dashboard tiles reflect up-to-date order throughput and revenue calculations with timestamps.',
    securityNotes: ['Financial totals are calculated using verified Stripe transaction data and confirmed cash-on-delivery logs.'],
    relatedArticleIds: ['admin-orders', 'admin-reports', 'admin-finance']
  },

  {
    id: 'admin-orders',
    title: 'Orders Workspace, Filters & Lifecycle Management',
    description: 'Complete instructions for viewing, filtering, overriding statuses, assigning drivers, generating QR bag tags, and cancelling orders.',
    category: 'Core Operations',
    portals: ['admin', 'manager'],
    roles: ['super_admin', 'admin', 'manager'],
    relatedTab: 'orders',
    keywords: ['orders', 'order management', 'lifecycle', 'driver assignment', 'plant assignment', 'qr code', 'bag label', 'cancellation', 'status override'],
    badge: 'Core Feature',
    iconName: 'ShoppingBag',
    purpose: 'Enables administrators and plant managers to supervise, trace, and manage every laundry order through its end-to-end lifecycle, from online customer checkout to final door-to-door delivery.',
    accessRequirements: 'Admin (all orders across all plants) or Plant Manager (orders filtered to assigned plant).',
    navigationPath: 'Sidebar -> "Orders".',
    prerequisites: ['Orders placed by customers or back-office staff.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Locate and Filter Orders',
        instruction: 'Search by Order ID (ORD-...), Customer Full Name, Delivery Postcode, or Bag QR Code using the search bar. Filter by Status (Placed, Collected, At Plant, Processing, Ready, Out for Delivery, Delivered, Cancelled) or assigned Plant.'
      },
      {
        stepNumber: 2,
        title: 'Inspect Order Details & Line Items',
        instruction: 'Click on any order row to open the Order Detail Drawer. Review customer details, pickup address, laundry bags, individual garments, customer preferences (e.g. scent-free, delicate wash), and total price.'
      },
      {
        stepNumber: 3,
        title: 'Assign or Reassign Driver',
        instruction: 'In the Driver column or within the Order Drawer, click "Assign Driver". Select an available on-duty driver from the dropdown list. The driver receives a real-time push notification on their mobile operations app.'
      },
      {
        stepNumber: 4,
        title: 'Generate & Print QR Bag Label',
        instruction: 'Click the "QR Label" action button to preview the high-contrast bag label with the unique QR code, bag ID, customer name, and plant code. Click "Print" to send to the thermal tag printer.'
      },
      {
        stepNumber: 5,
        title: 'Execute Status Override (Super Admin & Manager)',
        instruction: 'If physical operations require manual progression (e.g., driver mobile malfunction), click "Override Status". Select the target status and provide a mandatory audit justification note.',
        caution: 'Status overrides bypass automated OTP checks and are logged with the acting manager ID in the audit log.'
      }
    ],
    fields: [
      { name: 'Search Query', required: false, format: 'String', description: 'Searches Order ID (ORD-XXXX), customer name, address, or bag QR code.' },
      { name: 'Status Filter', required: false, format: 'Dropdown', description: 'Filters table by exact operational stage.' },
      { name: 'Plant Filter', required: false, format: 'Dropdown', description: 'Filters orders assigned to specific plant facility (Admin only).' },
      { name: 'Assigned Driver', required: false, format: 'Dropdown', description: 'Assigns driver from plant fleet.' },
      { name: 'Override Reason', required: true, format: 'String (min 5 chars)', description: 'Mandatory justification for manual status overrides.' }
    ],
    statuses: [
      { status: 'order_placed', label: 'Order Placed', meaning: 'Customer completed checkout; awaiting pickup slot driver assignment.', allowedTransitions: ['collected', 'cancelled'] },
      { status: 'collected', label: 'Collected', meaning: 'Driver verified collection OTP at customer door and loaded laundry bags.', allowedTransitions: ['at_plant', 'cancelled'] },
      { status: 'at_plant', label: 'At Plant', meaning: 'Bags arrived at facility and scanned in at the intake sorting station.', allowedTransitions: ['processing', 'cancelled'] },
      { status: 'processing', label: 'Processing', meaning: 'Garments undergoing washing, drying, or specialist dry-cleaning.', allowedTransitions: ['ready_for_delivery'] },
      { status: 'ready_for_delivery', label: 'Ready for Delivery', meaning: 'Quality check passed; packed into clean delivery bags with tags.', allowedTransitions: ['out_for_delivery'] },
      { status: 'out_for_delivery', label: 'Out for Delivery', meaning: 'Dispatched with delivery driver for delivery slot.', allowedTransitions: ['delivered', 'ready_for_delivery'] },
      { status: 'delivered', label: 'Delivered', meaning: 'Driver verified delivery OTP with customer; order fulfilled.', allowedTransitions: [] },
      { status: 'cancelled', label: 'Cancelled', meaning: 'Order voided prior to processing; refund triggered if paid.', allowedTransitions: [] }
    ],
    successVerification: 'Order status pill updates immediately with the new stage color and updates in real-time across customer and mobile apps.',
    commonErrors: [
      {
        error: 'Cannot assign driver: Driver belongs to different plant',
        cause: 'Attempting to assign a driver from Plant B to an order assigned to Plant A.',
        resolution: 'Select a driver registered under the matching plant, or reassign the order plant first.'
      }
    ],
    securityNotes: ['Manual order cancellations and refunds require explicit manager or admin role privileges.'],
    relatedArticleIds: ['workflow-order-lifecycle', 'manager-orders', 'admin-finance']
  },

  {
    id: 'admin-customers',
    title: 'Customer Accounts & Relationship Management (CRM)',
    description: 'Managing registered customer profiles, lifetime order history, saved pickup addresses, wallet credits, and support history.',
    category: 'Core Operations',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'customers',
    keywords: ['customers', 'crm', 'profiles', 'order history', 'addresses', 'wallet', 'credits', 'support notes'],
    badge: 'CRM',
    iconName: 'Users',
    purpose: 'Provides full visibility into registered customer accounts, allowing support teams to inspect past orders, review delivery addresses, adjust wallet store credits, and assist with account inquiries.',
    accessRequirements: 'Super Administrator or Administrator.',
    navigationPath: 'Admin Portal -> Sidebar -> "Customers".',
    prerequisites: ['Customer account created via public website checkout or registration.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Search & Locate Customer Profile',
        instruction: 'Type customer full name, email address, or telephone number into the customer search bar. Results filter in real time.'
      },
      {
        stepNumber: 2,
        title: 'Review Account History & Lifetime Value',
        instruction: 'Inspect the customer summary drawer showing total orders placed, aggregate spend (£), default plant catchment, and registration date.'
      },
      {
        stepNumber: 3,
        title: 'Inspect Saved Pickup & Delivery Addresses',
        instruction: 'Review saved residential and office addresses with access notes (e.g. "Buzz flat 4B", "Leave with concierge").'
      },
      {
        stepNumber: 4,
        title: 'Issue Wallet Store Credit',
        instruction: 'Click "Adjust Wallet Balance" to grant promotional store credit or goodwill service credit for future laundry orders.'
      }
    ],
    actions: [
      { button: 'Adjust Wallet Balance', style: 'primary', effect: 'Modifies customer store credit balance.', whenToUse: 'When issuing customer goodwill compensation.' },
      { button: 'View Order History', style: 'neutral', effect: 'Filters orders workspace to this customer\'s orders.', whenToUse: 'When answering customer service inquiries.' }
    ],
    successVerification: 'Customer drawer displays updated credit balance and audit record is recorded in the system audit log.',
    securityNotes: ['Customer PII is strictly protected under UK GDPR regulations; access is restricted to verified administrators.'],
    relatedArticleIds: ['admin-orders', 'admin-finance', 'admin-complaints']
  },

  {
    id: 'manager-dashboard',
    title: 'Plant Manager Dashboard, Load Meter & Staffing Alerts',
    description: 'Guide to the plant-isolated operations dashboard: throughput stats, bottleneck tracking, open exceptions, and minimum staffing compliance.',
    category: 'Core Operations',
    portals: ['manager', 'admin'],
    roles: ['manager', 'super_admin'],
    relatedTab: 'dashboard',
    keywords: ['manager dashboard', 'plant throughput', 'load meter', 'capacity', 'exceptions', 'staffing warning', 'sorting', 'washing'],
    badge: 'Plant Operations',
    iconName: 'Activity',
    purpose: 'Provides Plant Operations Managers with real-time operational visibility into their facility, tracking bag intake throughput, washing and drying machine load, open delivery exceptions, and staff readiness.',
    accessRequirements: 'Plant Manager or Super Administrator.',
    navigationPath: 'Operations Portal -> /manager -> "Dashboard".',
    prerequisites: ['Assigned plant facility.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Check Plant Staffing Health',
        instruction: 'Inspect the top warning banner. Ensure that active driver count >= 1 and active processor count >= 1. If deficient, add staff immediately to restore automated order flow.'
      },
      {
        stepNumber: 2,
        title: 'Monitor Queue Workstations',
        instruction: 'Click between "Overview", "Exceptions", "Capacity", "Fleet", and "Inventory" tabs to inspect bottlenecks at specific washing, drying, or pressing stations.'
      },
      {
        stepNumber: 3,
        title: 'Resolve Operational Exceptions',
        instruction: 'In the Exceptions tab, review any flagged orders (e.g., driver could not access customer building, damaged zipper on intake). Choose an action: "Reassign Driver", "Reschedule Slot", or "Mark Investigating".'
      }
    ],
    actions: [
      {
        button: 'Resolve Exception',
        style: 'primary',
        effect: 'Updates exception record with resolution notes and closes the alert.',
        whenToUse: 'After an operational obstacle has been addressed.'
      }
    ],
    successVerification: 'Exception count decrements to 0 and plant capacity load meter displays balanced utilization (<85%).',
    securityNotes: ['Data displayed is strictly scoped to the manager’s authorized plant; zero cross-plant data leakage.'],
    relatedArticleIds: ['quick-start-manager', 'manager-staff', 'manager-incidents']
  },

  // =========================================================================
  // 3. STAFF & PLANTS
  // =========================================================================
  {
    id: 'admin-staff',
    title: 'Staff Accounts, Role Provisioning & Auth0 Onboarding',
    description: 'Detailed instructions for provisioning Plant Managers, Administrators, Drivers, and Processors with secure Auth0 invitations.',
    category: 'Staff & Plants',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'staff',
    keywords: ['staff', 'provisioning', 'plant manager', 'driver', 'processor', 'auth0', 'invitation ticket', 'roles', 'deactivation', 'session revocation'],
    badge: 'Security Critical',
    iconName: 'UserCheck',
    purpose: 'Allows Super Administrators and Administrators to recruit, configure, onboard, and manage operational personnel across all plants, integrating directly with Auth0 enterprise identity management.',
    accessRequirements: 'Super Administrator (full access to create all roles including Managers) or Administrator (view all, manage drivers/processors).',
    navigationPath: 'Sidebar -> "Staff Accounts".',
    prerequisites: ['Active Super Admin or Admin session.', 'Target plant must exist before assigning Plant Managers or subordinate staff.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Open Staff Provisioning Modal',
        instruction: 'Click the "+ Add Staff Member" button at the top right of the Staff Accounts page.'
      },
      {
        stepNumber: 2,
        title: 'Select Role & Enter Staff Information',
        instruction: 'Choose role: "Plant Manager", "Driver", or "Processor". Fill in Full Name, Email Address, and Phone Number.'
      },
      {
        stepNumber: 3,
        title: 'Assign Plant Facility',
        instruction: 'For Plant Managers, select the primary plant facility from the Plant dropdown. For Drivers and Processors, select their reporting Manager or direct Plant assignment.'
      },
      {
        stepNumber: 4,
        title: 'Execute Provisioning & Capture Onboarding Ticket',
        instruction: 'Click "Provision Staff Member". The backend creates the Auth0 user record, generates a password reset invitation ticket URL, and inserts the user in MongoDB. Copy the ticket URL or allow Auth0 to deliver the automated welcome email.',
        tip: 'LAUNDELLE never generates, stores, or handles plaintext passwords. Staff set their own secure credentials directly on Auth0.'
      },
      {
        stepNumber: 5,
        title: 'Suspend / Deactivate Staff Member',
        instruction: 'To revoke access for a departing staff member, locate their row and click "Suspend Account". The backend immediately marks is_active: false, blocks the Auth0 user, and revokes all active server-side sessions across DB _id, publicId, and auth0UserId.',
        caution: 'Deactivation is immediate: all mobile and portal sessions for that user will be rejected on their very next API request.'
      }
    ],
    fields: [
      { name: 'Full Name', required: true, format: 'String (min 2 chars)', description: 'Legal name of staff member.' },
      { name: 'Email Address', required: true, format: 'Email', description: 'Work or personal email used for Auth0 identity login.' },
      { name: 'Phone Number', required: true, format: 'E.164 (+44...)', description: 'Mobile contact for operational and dispatch alerts.' },
      { name: 'Role', required: true, format: 'Dropdown', description: 'manager | driver | processor | admin.' },
      { name: 'Plant Assignment', required: true, format: 'Dropdown', description: 'Associated production facility.' },
      { name: 'Vehicle Type (Drivers)', required: false, format: 'Dropdown', description: 'Van | Electric Van | Motorbike | Bicycle.' },
      { name: 'Vehicle Registration (Drivers)', required: false, format: 'String', description: 'UK vehicle registration mark (e.g. LN68 ABC).' },
      { name: 'Workstation (Processors)', required: false, format: 'Dropdown', description: 'Sorting | Washing | Drying | Ironing | QC & Packing.' }
    ],
    actions: [
      { button: '+ Add Staff Member', style: 'primary', effect: 'Opens provisioning modal.', whenToUse: 'When hiring new operational staff.' },
      { button: 'Copy Invite Link', style: 'secondary', effect: 'Copies Auth0 ticket URL to clipboard.', whenToUse: 'To send onboarding link via SMS or internal chat.' },
      { button: 'Suspend Account', style: 'danger', effect: 'Blocks Auth0 user and revokes all active sessions.', whenToUse: 'Disciplinary or termination event.' },
      { button: 'Activate Account', style: 'neutral', effect: 'Unblocks Auth0 user and restores active status.', whenToUse: 'Reinstating staff member.' }
    ],
    tableInfo: {
      columns: ['Employee #', 'Full Name', 'Role & Badge', 'Plant Facility', 'Contact Details', 'Status', 'Actions'],
      filters: ['Role Filter (All, Managers, Drivers, Processors, Admins)', 'Status Filter (All, Active, Suspended)', 'Plant Filter'],
      sortAndSearch: 'Instant text search across employee ID, name, email, and vehicle reg.',
      rowActions: ['Edit Staff Details', 'Toggle Active/Suspended', 'View Assigned Orders/Shifts']
    },
    successVerification: 'New staff member appears in the table with an active status badge and an "EMP-XXXX" canonical identifier.',
    commonErrors: [
      {
        error: 'Email already registered in Auth0 or MongoDB',
        cause: 'A user account with this email address already exists in the system.',
        resolution: 'Search existing accounts or use a unique work email.'
      },
      {
        error: 'Cannot suspend driver with X active assigned orders',
        cause: 'Drivers with deliveries currently in transit cannot be suspended until orders are completed or reassigned.',
        resolution: 'Reassign active orders in the Orders workspace, then retry suspension.'
      }
    ],
    securityNotes: [
      'Auth0 blocks take effect instantaneously.',
      'Active session tokens are denied access via the server-side session revocation denylist.'
    ],
    relatedArticleIds: ['workflow-staff-onboarding', 'workflow-staff-deactivation', 'manager-staff']
  },

  {
    id: 'manager-staff',
    title: 'Plant Staff Team (Drivers & Processors Provisioning)',
    description: 'Instructions for Plant Managers to provision, manage, and schedule facility processors and delivery drivers within their authorized plant.',
    category: 'Staff & Plants',
    portals: ['manager', 'admin'],
    roles: ['manager', 'super_admin'],
    relatedTab: 'staff',
    keywords: ['manager staff', 'staff team', 'plant driver', 'plant processor', 'minimum staffing', 'onboarding ticket'],
    badge: 'Plant Operations',
    iconName: 'Users',
    purpose: 'Allows Plant Operations Managers to recruit and maintain their plant workforce (Drivers and Processors only), ensuring adequate shift coverage for pickup, cleaning, and delivery pipelines.',
    accessRequirements: 'Plant Operations Manager.',
    navigationPath: 'Operations Portal -> /manager -> Sidebar -> "Staff Team".',
    prerequisites: [
      'Plant Manager credentials with linked plant facility.',
      'Continuous minimum staffing requirement: Every operating facility must maintain at least 1 active Driver and at least 1 active Processor on shift.'
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Review Staff Team Roster',
        instruction: 'Inspect the list of drivers and processors currently assigned to your plant. Check their shift availability and active order count.'
      },
      {
        stepNumber: 2,
        title: 'Add New Driver or Processor',
        instruction: 'Click "+ Add Driver" or "+ Add Processor". The modal automatically locks the plant assignment to your authorized plant.'
      },
      {
        stepNumber: 3,
        title: 'Assign Delivery Postcodes (Drivers)',
        instruction: 'Select outward postcodes (e.g. SW1, SW3) that this driver will service, chosen from the plant\'s designated catchment area.'
      },
      {
        stepNumber: 4,
        title: 'Assign Processing Station (Processors)',
        instruction: 'Designate the operator\'s primary station: Washing, Drying, Ironing, or Quality Check & Packing.'
      },
      {
        stepNumber: 5,
        title: 'Share Onboarding Link',
        instruction: 'Copy the generated Auth0 invitation URL and provide it to the staff member to complete their account setup.'
      }
    ],
    actions: [
      { button: '+ Add Driver', style: 'primary', effect: 'Opens driver creation modal.', whenToUse: 'To expand courier fleet.' },
      { button: '+ Add Processor', style: 'primary', effect: 'Opens processor creation modal.', whenToUse: 'To staff processing shifts.' }
    ],
    successVerification: 'The new staff member appears in your Plant Staff Team table with their assigned shift and vehicle/station.',
    securityNotes: [
      'Continuous Minimum Staffing Rule: Every active facility must maintain at least 1 active Driver and at least 1 active Processor. If staffing drops below this threshold, an amber warning banner is displayed across all manager views with direct action buttons.',
      'Plant Managers CANNOT see or modify staff from other plants.',
      'Plant Managers CANNOT create Managers or Administrators.'
    ],
    relatedArticleIds: ['quick-start-manager', 'admin-staff', 'manager-drivers', 'manager-processors']
  },

  {
    id: 'manager-drivers',
    title: 'Driver Dispatch, Van Routes & Real-Time Tracking',
    description: 'Managing assigned plant couriers, inspecting live driver availability, tracking pickup/delivery stops, and enforcing OTP verification.',
    category: 'Core Operations',
    portals: ['manager'],
    roles: ['manager'],
    relatedTab: 'drivers',
    keywords: ['driver', 'courier', 'dispatch', 'routes', 'fleet', 'otp', 'collection otp', 'delivery otp', 'vehicle', 'van', 'tracking'],
    badge: 'Plant Operations',
    iconName: 'Truck',
    purpose: 'Allows Plant Operations Managers to supervise couriers assigned to their facility, inspect active pickup and delivery itineraries, reassign stops during vehicle breakdowns, and ensure Collection and Delivery OTP compliance.',
    accessRequirements: 'Plant Operations Manager (restricted to drivers linked to the manager\'s plant).',
    navigationPath: 'Operations Portal -> /manager -> Sidebar -> "Drivers".',
    prerequisites: ['At least 1 active driver provisioned for the facility (continuous minimum staffing rule).'],
    steps: [
      {
        stepNumber: 1,
        title: 'Review Active Driver Roster',
        instruction: 'Inspect driver cards showing live status (On Duty, En Route, Idle, Off Duty), linked vehicle registration, assigned outward postcode sectors, and today\'s completed versus pending stops.'
      },
      {
        stepNumber: 2,
        title: 'Track Route Execution & ETA',
        instruction: 'Click on any active driver to view their current stop list, customer addresses, scheduled time slot windows, and real-time transit status.'
      },
      {
        stepNumber: 3,
        title: 'Reassign Orders during Emergencies',
        instruction: 'If a vehicle experiences a breakdown or a driver is delayed, select the affected stops and click "Reassign Orders" to transfer them to an available standby driver from the same plant.'
      },
      {
        stepNumber: 4,
        title: 'Audit OTP Verification Compliance',
        instruction: 'Confirm that completed pickups display a verified Collection OTP badge and completed drop-offs display a verified Delivery OTP badge, confirming unbroken chain of custody.'
      }
    ],
    actions: [
      { button: 'Reassign Orders', style: 'warning', effect: 'Transfers designated order stops to another active plant driver.', whenToUse: 'When a courier is delayed or vehicle has mechanical issues.' },
      { button: '+ Add Driver', style: 'primary', effect: 'Opens driver provisioning modal with current plant pre-selected.', whenToUse: 'To expand courier capacity.' }
    ],
    successVerification: 'Drivers tab displays live vehicle telemetry, and orders transition to "out_for_delivery" and "delivered" in real time.',
    securityNotes: ['Plant isolation ensures managers cannot view or reassign drivers belonging to other regional plants.'],
    relatedArticleIds: ['manager-staff', 'workflow-order-lifecycle', 'quick-start-manager']
  },

  {
    id: 'manager-processors',
    title: 'Plant Sorting, Intake & Processing Stations',
    description: 'Coordinating facility intake dock check-in, bag QR scanning, station queues (Washing, Drying, Ironing, Packing), and quality control.',
    category: 'Core Operations',
    portals: ['manager'],
    roles: ['manager'],
    relatedTab: 'processors',
    keywords: ['processor', 'sorting', 'washing', 'drying', 'ironing', 'packing', 'qc', 'qr scan', 'intake dock', 'stations'],
    badge: 'Plant Operations',
    iconName: 'Package',
    purpose: 'Empowers Plant Managers to monitor internal laundry workflow across physical workstations, balance staffing between sorting, washing, pressing, and packaging, and eliminate turnaround bottlenecks.',
    accessRequirements: 'Plant Operations Manager.',
    navigationPath: 'Operations Portal -> /manager -> Sidebar -> "Processors".',
    prerequisites: ['At least 1 active processor provisioned for the facility (continuous minimum staffing rule).'],
    steps: [
      {
        stepNumber: 1,
        title: 'Inspect Workstation Distribution',
        instruction: 'Review the processor dashboard showing live personnel assigned across Sorting/Tagging, Washing Machines, Tumbler Dryers, Ironing/Pressing, and Final QC & Packing.'
      },
      {
        stepNumber: 2,
        title: 'Monitor Dock Intake & Bag QR Scanning',
        instruction: 'Ensure couriers unloading laundry bags at the dock are processed immediately using the processor QR scanner module to transition order status to "at_plant".'
      },
      {
        stepNumber: 3,
        title: 'Dynamic Station Load Balancing',
        instruction: 'If orders accumulate at the Ironing station, reassign an available processor from Sorting to Ironing to preserve next-day delivery commitments.'
      },
      {
        stepNumber: 4,
        title: 'Quality Check & Packaging Verification',
        instruction: 'Before bagging and sealing, verify that garments match order notes, stain treatments were executed, and the QR bag tag is scanned to mark "ready_for_delivery".'
      }
    ],
    actions: [
      { button: 'Reassign Station', style: 'primary', effect: 'Updates the processor\'s active workstation queue.', whenToUse: 'To eliminate station processing bottlenecks.' },
      { button: '+ Add Processor', style: 'primary', effect: 'Opens processor onboarding modal locked to current plant.', whenToUse: 'To staff processing shifts.' }
    ],
    successVerification: 'Orders progress through laundry workflow stages (Sorting -> Washing -> Ironing -> Packed) with operator ID recorded in audit trail.',
    securityNotes: ['Processors have scoped access strictly to QR scanning and order station updates; they cannot access administrative settings.'],
    relatedArticleIds: ['manager-staff', 'workflow-order-lifecycle', 'quick-start-manager']
  },

  {
    id: 'admin-areas',
    title: 'Plants, Service Areas & Capacity Time Slots',
    description: 'Guide to configuring production plants, physical facility addresses, outward postcode catchments, and time slot quotas.',
    category: 'Staff & Plants',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'areas',
    keywords: ['plants', 'postcodes', 'catchment', 'slots', 'capacity', 'time slots', 'operating hours', 'areas'],
    badge: 'Core Configuration',
    iconName: 'Map',
    purpose: 'Empowers administrators to configure physical laundry processing plants, delineate geographical service areas by outward postcodes, and regulate order capacity through customer pickup and delivery time slots.',
    accessRequirements: 'Super Administrator or Administrator (full write); Plant Manager (read-only slot schedule view).',
    navigationPath: 'Sidebar -> "Areas & Slots".',
    prerequisites: ['Target facility address details.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Create or Edit a Production Plant',
        instruction: 'In the "Plants & Locations" subtab, click "+ Add Plant". Enter Plant Name (e.g. "Battersea Central Facility"), Plant Code (e.g. "PLT-BAT-01"), Physical Address, and Operating Status (ACTIVE / INACTIVE).'
      },
      {
        stepNumber: 2,
        title: 'Assign Plant Catchment Postcodes',
        instruction: 'Using the Postcode Multi-Select dropdown, select all outward UK postcode prefixes (e.g. SW1, SW3, SW11, W1, EC1) serviced by this plant. The customer-facing portal uses this mapping to confirm service availability.'
      },
      {
        stepNumber: 3,
        title: 'Assign Designated Plant Manager',
        instruction: 'Select a provisioned Plant Manager from the Manager dropdown to assign them legal and operational stewardship over the plant.'
      },
      {
        stepNumber: 4,
        title: 'Configure Pickup & Delivery Time Slots',
        instruction: 'Switch to the "Time Slots" subtab. Click "+ Add Time Slot". Specify Start Time (e.g. 08:00), End Time (e.g. 12:00), Slot Type (Pickup, Delivery, or Both), Plant Association, and Maximum Capacity (number of simultaneous orders supported).'
      }
    ],
    fields: [
      { name: 'Plant Name', required: true, format: 'String', description: 'Official operational name of the laundry plant.' },
      { name: 'Plant Code', required: true, format: 'String (PLT-XXX-01)', description: 'Unique facility identifier code.' },
      { name: 'Physical Address', required: true, format: 'String', description: 'Commercial plant address for courier check-in.' },
      { name: 'Covered Postcodes', required: true, format: 'Multi-select (UK Outward)', description: 'List of serviced postcode prefixes.' },
      { name: 'Assigned Manager', required: false, format: 'Dropdown', description: 'Plant Manager responsible for this location.' },
      { name: 'Slot Window', required: true, format: 'HH:MM - HH:MM', description: 'Operating window for pickup/delivery.' },
      { name: 'Max Capacity', required: true, format: 'Integer (e.g. 15)', description: 'Maximum customer bookings allowed in this window.' }
    ],
    actions: [
      { button: '+ Add Plant', style: 'primary', effect: 'Opens new plant modal.', whenToUse: 'When opening a new facility.' },
      { button: '+ Add Time Slot', style: 'primary', effect: 'Opens slot creation modal.', whenToUse: 'When adding dispatch windows.' }
    ],
    successVerification: 'The new plant appears in the plant cards list, and customers entering matching postcodes on the customer website can successfully book orders.',
    securityNotes: ['Postcode mapping changes update customer routing immediately; avoid removing postcodes with orders in flight.'],
    relatedArticleIds: ['workflow-plant-postcode', 'admin-orders']
  },

  // =========================================================================
  // 4. CATALOG & PRICING
  // =========================================================================
  {
    id: 'admin-services',
    title: 'Services & Pricing Catalog Management',
    description: 'Instructions for adding laundry services, updating unit prices, configuring turn-around times, and uploading Cloudinary photos.',
    category: 'Catalog & Pricing',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'services',
    keywords: ['services', 'pricing', 'catalog', 'dry cleaning', 'wash and fold', 'ironing', 'cloudinary', 'image upload'],
    badge: 'Catalog',
    iconName: 'Sparkles',
    purpose: 'Allows administrators to maintain the live catalog of laundry, dry-cleaning, ironing, and specialist services presented to customers on the customer web portal and mobile app.',
    accessRequirements: 'Super Administrator or Administrator.',
    navigationPath: 'Sidebar -> "Services & Pricing".',
    prerequisites: ['High-resolution service photograph (JPEG/PNG/WEBP).'],
    steps: [
      {
        stepNumber: 1,
        title: 'Review Existing Service Offerings',
        instruction: 'Inspect the catalog grid organized by categories: Wash + Dry + Fold, Dry Cleaning, Ironing & Pressing, and Bulky / Bedding.'
      },
      {
        stepNumber: 2,
        title: 'Add New Service Item',
        instruction: 'Click "+ Add Service". Fill in Service Name, Description, Category, Base Price (£), and Estimated Turnaround Time (hours/days).'
      },
      {
        stepNumber: 3,
        title: 'Upload or Update Service Image',
        instruction: 'Drag and drop an image file into the upload zone, or click to browse. The image is optimized client-side and saved to Cloudinary, ensuring identical appearance on both Admin and Customer portals.'
      },
      {
        stepNumber: 4,
        title: 'Toggle Active Availability',
        instruction: 'Use the Active toggle switch to temporarily hide seasonal or out-of-stock services without deleting catalog history.'
      }
    ],
    fields: [
      { name: 'Service Name', required: true, format: 'String', description: 'Customer-facing service title.' },
      { name: 'Category', required: true, format: 'Dropdown', description: 'Wash & Fold | Dry Clean | Ironing | Bulky Items.' },
      { name: 'Base Price (£)', required: true, format: 'Decimal (e.g. 14.50)', description: 'Unit cost per item or per kg.' },
      { name: 'Turnaround Time', required: true, format: 'String (e.g. 24h, 48h)', description: 'Expected SLA duration.' },
      { name: 'Service Image', required: false, format: 'File (PNG/JPG)', description: 'Catalog image rendered on customer storefront.' }
    ],
    actions: [
      { button: '+ Add Service', style: 'primary', effect: 'Opens service editor modal.', whenToUse: 'When introducing a new laundry service.' },
      { button: 'Save Service', style: 'primary', effect: 'Persists updates to MongoDB.', whenToUse: 'To confirm service modifications.' }
    ],
    successVerification: 'The service immediately updates in the Admin catalog grid and displays on the public customer booking page.',
    securityNotes: ['Image uploads are validated for valid MIME types and stripped of executable payloads.'],
    relatedArticleIds: ['admin-coupons', 'admin-orders']
  },

  {
    id: 'admin-coupons',
    title: 'Promotional Coupons & Custom Surcharges',
    description: 'Guide to configuring discount vouchers, minimum order thresholds, and operational surcharges (delivery, emergency, stain treatment).',
    category: 'Catalog & Pricing',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'coupons_charges',
    keywords: ['coupons', 'discounts', 'promo codes', 'charges', 'surcharges', 'delivery fee', 'stain treatment', 'free delivery threshold'],
    badge: 'Revenue Settings',
    iconName: 'Tag',
    purpose: 'Enables administrators to establish marketing discount campaigns and manage operational surcharges such as standard delivery fees, free delivery thresholds, small order fees, and specialized garment care fees.',
    accessRequirements: 'Super Administrator or Administrator.',
    navigationPath: 'Sidebar -> "Coupons & Charges".',
    prerequisites: ['Campaign dates and promotional budget.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Configure Global Fee Structure',
        instruction: 'In the "Pricing & Surcharges" subtab, configure the Delivery Fee (£), Free Delivery Threshold (£), Small Order Surcharge (£), and VAT Tax Rate (%). Click "Save Charges" to apply globally.'
      },
      {
        stepNumber: 2,
        title: 'Create a Discount Promo Code',
        instruction: 'Switch to the "Coupons" subtab and click "+ Add Coupon". Enter the Code (e.g. LAUNDELLE20), Discount Type (Percentage or Fixed Amount), Value (e.g. 20% or £5.00), and Minimum Order Amount.'
      },
      {
        stepNumber: 3,
        title: 'Set Expiry and Usage Safeguards',
        instruction: 'Optionally set an Expiry Date and Max Total Usages. The backend enforces unique redemption checks per customer order to prevent duplicate coupon abuse.'
      }
    ],
    fields: [
      { name: 'Coupon Code', required: true, format: 'Alphanumeric uppercase', description: 'Promo code entered by customer at checkout.' },
      { name: 'Discount Type', required: true, format: 'percentage | fixed', description: 'Percentage off total or flat £ deduction.' },
      { name: 'Discount Value', required: true, format: 'Number', description: 'Value (e.g. 15 for 15% or 5 for £5).' },
      { name: 'Min Order Amount', required: true, format: 'Currency (£)', description: 'Minimum basket subtotal required.' },
      { name: 'Usage Limit', required: false, format: 'Integer', description: 'Total redemptions allowed before expiration.' }
    ],
    successVerification: 'Coupon code displays in active coupons table and applies successfully on the customer checkout drawer.',
    securityNotes: ['Coupon redemptions are protected by unique compound database indexes on (orderId, code) to prevent race conditions.'],
    relatedArticleIds: ['admin-finance', 'admin-services']
  },

  // =========================================================================
  // 5. FINANCE & AUDITING
  // =========================================================================
  {
    id: 'admin-finance',
    title: 'Finance, Payments, Refunds & COD Reconciliations',
    description: 'Instructions for tracking Stripe transactions, approving refunds, managing wallet credits, and reconciling driver cash collections.',
    category: 'Finance & Revenue',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'finance',
    keywords: ['finance', 'payments', 'stripe', 'refunds', 'wallet credits', 'cod', 'cash on delivery', 'adjustments'],
    badge: 'Financial Audit',
    iconName: 'DollarSign',
    purpose: 'Provides comprehensive financial accounting oversight across all payment gateways (Stripe cards, Apple Pay, Google Pay) and Cash on Delivery (COD) collections, facilitating customer refunds and ledger audits.',
    accessRequirements: 'Super Administrator (full refund approval) or Administrator (view and queue refunds).',
    navigationPath: 'Sidebar -> "Finance & Refunds".',
    prerequisites: ['Stripe webhook integration active.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Review Live Revenue Transactions',
        instruction: 'Inspect the "Orders & Payments" subtab for real-time Stripe checkout confirmations, payment intent IDs, and card brand metadata.'
      },
      {
        stepNumber: 2,
        title: 'Process Customer Refund',
        instruction: 'In the "Refunds" subtab, select the target Order ID. Enter Refund Amount (full or partial) and choose a mandatory Refund Reason (Damaged Item, Missed Delivery, Customer Cancellation). Click "Issue Refund via Stripe".'
      },
      {
        stepNumber: 3,
        title: 'Reconcile Cash on Delivery (COD)',
        instruction: 'Switch to the "COD Reconciliation" subtab. Cross-reference cash amounts turned in by delivery drivers against orders marked as paid in cash. Click "Reconcile Handover" to close the driver cash ledger.'
      }
    ],
    actions: [
      { button: 'Issue Refund via Stripe', style: 'danger', effect: 'Executes Stripe refund API call and updates MongoDB order record.', whenToUse: 'When compensating customer for damaged or cancelled order.' },
      { button: 'Grant Customer Credit', style: 'secondary', effect: 'Credits customer account wallet for future orders.', whenToUse: 'Minor service apology.' },
      { button: 'Reconcile Handover', style: 'primary', effect: 'Marks cash as collected and safely deposited into bank ledger.', whenToUse: 'End of driver shift.' }
    ],
    successVerification: 'Stripe refund ID is recorded on the order, and the order payment status updates to "Refunded" or "Partially Refunded".',
    securityNotes: ['Every refund transaction requires mandatory reason logging and is verified against the original Stripe payment intent.'],
    relatedArticleIds: ['admin-orders', 'admin-complaints']
  },

  {
    id: 'admin-settings',
    title: 'System Settings, Legal Configuration & Tamper-Evident Audit Log',
    description: 'Complete documentation of system-wide business details, automated dispatch policies, session security, and the cryptographic audit trail.',
    category: 'System & Audit',
    portals: ['admin'],
    roles: ['super_admin'],
    relatedTab: 'settings',
    keywords: ['settings', 'audit log', 'sha-256', 'tamper evident', 'session security', 'business profile', 'policies', 'super admin'],
    badge: 'Super Admin Only',
    iconName: 'Settings',
    purpose: 'Allows Super Administrators to configure global business details, define operational automation rules, configure session security parameters, and review the immutable SHA-256 hash-chained audit log.',
    accessRequirements: 'Super Administrator ONLY.',
    navigationPath: 'Sidebar -> "Settings & Audit".',
    prerequisites: ['Super Admin session token.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Configure Business & Legal Profile',
        instruction: 'Under "General Settings", update Trading Name, Company Registration Number, VAT ID, Official Support Email, and Customer Support Phone.'
      },
      {
        stepNumber: 2,
        title: 'Configure Operational Policies',
        instruction: 'Toggle automated dispatch rules: "Auto-Assign Drivers", "Auto-Balance Plant Capacity", "Strict Garment Tagging", and "Bottleneck Alert Threshold".'
      },
      {
        stepNumber: 3,
        title: 'Inspect Cryptographic Audit Log',
        instruction: 'Switch to the "Audit Log" subtab. Review chronological administrative events: staff provisioning, account suspensions, order overrides, and coupon changes. Each record contains actorId, timestamp, action, and verified cryptographic hash chains.',
        tip: 'The SHA-256 hash chains guarantee that no audit log entry can be modified, deleted, or backdated.'
      }
    ],
    successVerification: 'Audit log displays green "Chain Verified" badges and system settings reflect saved parameters across all portals.',
    securityNotes: ['Audit log records are immutable and read-only; no user role possesses permissions to edit or purge audit entries.'],
    relatedArticleIds: ['admin-staff', 'troubleshooting-auth-rbac']
  },

  {
    id: 'admin-reports',
    title: 'Operational Analytics & Business Intelligence Reports',
    description: 'Accessing company revenue reports, plant turnaround performance, driver SLA metrics, and CSV export tools.',
    category: 'System & Audit',
    portals: ['admin'],
    roles: ['super_admin', 'admin'],
    relatedTab: 'reports',
    keywords: ['reports', 'analytics', 'revenue', 'turnaround', 'driver sla', 'kpi', 'export', 'csv'],
    badge: 'Analytics',
    iconName: 'BarChart3',
    purpose: 'Generates business intelligence summaries for executive and operational decision-making, tracking order volumes, turnaround efficiency, courier punctuality, and facility revenue.',
    accessRequirements: 'Super Administrator or Administrator.',
    navigationPath: 'Admin Portal -> Sidebar -> "Reports & Analytics".',
    prerequisites: ['Active Admin session.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Select Reporting Date Range',
        instruction: 'Choose from quick presets (Today, Yesterday, Last 7 Days, This Month) or set a custom Start and End Date range.'
      },
      {
        stepNumber: 2,
        title: 'Filter by Production Facility',
        instruction: 'Compare performance across all plants simultaneously, or isolate a single plant (e.g. South West Central) to identify regional trends.'
      },
      {
        stepNumber: 3,
        title: 'Analyze Key Operational Metrics',
        instruction: 'Review Total Orders, Gross Revenue (£), Average Turnaround SLA (hours from pickup to ready), Courier First-Time Delivery Success Rate, and Customer Rating Average.'
      },
      {
        stepNumber: 4,
        title: 'Export Transactional Data to CSV',
        instruction: 'Click "Export CSV" to generate a raw spreadsheet of orders within the selected filter window for external accounting.'
      }
    ],
    actions: [
      { button: 'Export CSV', style: 'primary', effect: 'Downloads compiled analytics report.', whenToUse: 'When conducting monthly financial reconciliations.' }
    ],
    successVerification: 'CSV file downloads to your local device and on-screen charts render with the selected date parameters.',
    securityNotes: ['Reports contain aggregated revenue figures and are restricted to Administrator and Super Administrator roles.'],
    relatedArticleIds: ['admin-dashboard', 'admin-finance']
  },

  {
    id: 'manager-settings',
    title: 'Plant Facility Profile & Operating Hours',
    description: 'Instructions for Plant Managers to review physical plant details, emergency supervisor contacts, and facility operating parameters.',
    category: 'System & Audit',
    portals: ['manager'],
    roles: ['manager'],
    relatedTab: 'settings',
    keywords: ['manager settings', 'plant profile', 'operating hours', 'emergency contact', 'facility rules'],
    badge: 'Plant Operations',
    iconName: 'Settings',
    purpose: 'Allows Plant Managers to review their authorized facility details, maintain emergency staff contacts, and review operational scheduling boundaries.',
    accessRequirements: 'Plant Operations Manager.',
    navigationPath: 'Operations Portal -> /manager -> Sidebar -> "Settings".',
    prerequisites: ['Plant Manager credentials.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Review Plant Facility Details',
        instruction: 'Check plant official address, facility access codes, and driver dock instructions.'
      },
      {
        stepNumber: 2,
        title: 'Review Assigned Outward Postcodes',
        instruction: 'Review the list of postcode prefixes assigned to your facility by company administrators.'
      },
      {
        stepNumber: 3,
        title: 'Update Emergency Dispatch Contacts',
        instruction: 'Keep on-duty manager phone numbers current so couriers on late evening delivery runs can reach immediate supervisory support.'
      }
    ],
    successVerification: 'Plant facility profile updates immediately and displays to assigned couriers.',
    securityNotes: ['Plant Managers cannot modify global company tax rates or Stripe credentials.'],
    relatedArticleIds: ['quick-start-manager', 'admin-settings']
  },

  // =========================================================================
  // 6. EXCEPTIONS & COMPLAINTS
  // =========================================================================
  {
    id: 'admin-complaints',
    title: 'Complaints Hub & Customer Support Incidents',
    description: 'Guide to logging, investigating, and resolving customer complaints regarding garment damage, missed pickups, or missing laundry.',
    category: 'Exceptions & Complaints',
    portals: ['admin', 'manager'],
    roles: ['super_admin', 'admin', 'manager'],
    relatedTab: 'complaints',
    keywords: ['complaints', 'incidents', 'damaged garment', 'lost item', 'late delivery', 'compensation', 'investigation'],
    badge: 'Support',
    iconName: 'AlertOctagon',
    purpose: 'Centrally organizes customer service complaints and plant operational incident tickets, coordinating investigation, driver inquiries, photo evidence review, and customer compensation resolution.',
    accessRequirements: 'Admin or Plant Manager (plant-specific incidents).',
    navigationPath: 'Sidebar -> "Complaints Hub" (or "Incidents & Issues").',
    prerequisites: ['Customer complaint reported via support or mobile app.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Review Incoming Incident Tickets',
        instruction: 'Filter tickets by Severity (Critical, High, Medium, Low) and Type (Damaged Garment, Lost Item, Late Delivery, Missing Bag).'
      },
      {
        stepNumber: 2,
        title: 'Examine Photographic Evidence',
        instruction: 'Open the incident record to inspect uploaded intake photos taken by the driver at pickup or by the processor at the sorting station.'
      },
      {
        stepNumber: 3,
        title: 'Add Internal Investigation Notes',
        instruction: 'Log interview notes with the courier or plant processor. Timeline entries are timestamped with your staff ID.'
      },
      {
        stepNumber: 4,
        title: 'Resolve Ticket & Issue Compensation',
        instruction: 'Click "Resolve Incident". Enter final resolution findings and optionally award customer wallet credits or approve a Stripe refund.'
      }
    ],
    statuses: [
      { status: 'open', label: 'Open', meaning: 'New ticket awaiting triage.' },
      { status: 'investigating', label: 'Investigating', meaning: 'Manager is reviewing intake photos or interviewing staff.' },
      { status: 'resolved', label: 'Resolved', meaning: 'Resolution approved and customer notified.' },
      { status: 'closed', label: 'Closed', meaning: 'Case finalized and archived.' }
    ],
    successVerification: 'Ticket status displays green "Resolved" indicator and customer notification is dispatched.',
    securityNotes: ['Customer compensation above £50 requires Administrator authorization.'],
    relatedArticleIds: ['admin-finance', 'admin-orders']
  },

  // =========================================================================
  // 7. END-TO-END WORKFLOWS
  // =========================================================================
  {
    id: 'workflow-staff-onboarding',
    title: 'Workflow: Provisioning & Onboarding Staff with Auth0',
    description: 'Step-by-step end-to-end workflow: from recruiting a new staff member to generating invitation tickets and first login.',
    category: 'End-to-End Workflows',
    portals: ['admin', 'manager'],
    roles: ['super_admin', 'admin', 'manager'],
    relatedTab: 'staff',
    keywords: ['workflow', 'onboarding', 'auth0', 'password setup', 'ticket', 'provisioning flow', 'step by step'],
    badge: 'Workflow',
    iconName: 'UserCheck',
    purpose: 'Documents the complete lifecycle of adding a new employee (Plant Manager, Driver, or Processor) to the LAUNDELLE platform using modern Auth0 passwordless-ticket onboarding.',
    accessRequirements: 'Super Admin (for Managers) or Plant Manager (for Drivers/Processors).',
    navigationPath: 'Admin/Manager Portal -> Staff -> "+ Add Staff Member".',
    prerequisites: ['Verified employee legal name, email, phone, and plant facility.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Initiate Provisioning in Portal',
        instruction: 'Open the Staff page and click "+ Add Staff Member". Enter full name, corporate email address, and mobile phone.'
      },
      {
        stepNumber: 2,
        title: 'Assign Organizational Boundaries',
        instruction: 'Select the plant facility. If provisioning a Driver, assign their delivery vehicle registration. If provisioning a Processor, assign their primary workstation station.'
      },
      {
        stepNumber: 3,
        title: 'Execute Backend Auth0 Account Generation',
        instruction: 'Click "Provision Staff Member". The backend calls the Auth0 Management API, creates the user account in Auth0, and requests a secure password-reset invitation ticket link.'
      },
      {
        stepNumber: 4,
        title: 'Deliver Invitation Ticket',
        instruction: 'The ticket URL is displayed on-screen. Copy this link and share it securely with the employee, or let Auth0 deliver the automated invitation email directly to their inbox.'
      },
      {
        stepNumber: 5,
        title: 'Staff Member Sets Password on Auth0',
        instruction: 'The staff member clicks the link, which directs them securely to Auth0\'s hosted page. They define their password compliant with enterprise password policies.'
      },
      {
        stepNumber: 6,
        title: 'First Login & Portal Verification',
        instruction: 'The staff member signs in to the portal or mobile app. The system reconciles their role from MongoDB and routes them to their authorized operational dashboard.'
      }
    ],
    successVerification: 'Employee record status changes from "Pending Setup" to "Active" upon initial successful authentication.',
    securityNotes: ['LAUNDELLE servers never see or store employee passwords; authentication is delegated exclusively to Auth0.'],
    relatedArticleIds: ['admin-staff', 'manager-staff', 'workflow-staff-deactivation']
  },

  {
    id: 'workflow-order-lifecycle',
    title: 'Workflow: Complete Order Lifecycle (Pickup, QR Bag Scan, Processing, Delivery)',
    description: 'End-to-end tracing of an order from customer web checkout through mobile courier pickup, plant QR intake, and final OTP delivery.',
    category: 'End-to-End Workflows',
    portals: ['admin', 'manager'],
    roles: ['super_admin', 'admin', 'manager'],
    relatedTab: 'orders',
    keywords: ['order lifecycle', 'pickup otp', 'delivery otp', 'qr bag scan', 'sorting', 'washing', 'qc', 'dispatch'],
    badge: 'Workflow',
    iconName: 'ShoppingBag',
    purpose: 'Comprehensive operational reference tracing every step an order takes through LAUNDELLE\'s physical and digital architecture.',
    accessRequirements: 'All administrative and managerial roles.',
    navigationPath: 'Cross-portal workflow.',
    prerequisites: ['Customer order placed on storefront.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Step 1: Order Placement & Routing',
        instruction: 'Customer enters outward postcode, selects laundry services, chooses pickup/delivery time slots, and checks out via Stripe. The backend assigns the order to the designated regional plant based on postcode catchment.'
      },
      {
        stepNumber: 2,
        title: 'Step 2: Courier Pickup & Collection OTP',
        instruction: 'The driver arrives at the customer residence, collects the laundry bags, and asks the customer for their 4-digit Collection OTP generated on their customer portal. Upon entering the valid OTP in the mobile app, order status transitions to "collected".'
      },
      {
        stepNumber: 3,
        title: 'Step 3: Plant Intake & QR Bag Scan',
        instruction: 'The driver unloads bags at the plant intake dock. The facility sorting processor scans the unique bag QR code using the processor scanner module. The order status transitions to "at_plant".'
      },
      {
        stepNumber: 4,
        title: 'Step 4: Machine Processing & Quality Check',
        instruction: 'Garments undergo washing, tumble drying, and pressing. Processors update queue progress. Once inspected for stain removal and cleanliness, the order is packed and marked "ready_for_delivery".'
      },
      {
        stepNumber: 5,
        title: 'Step 5: Delivery Dispatch & Delivery OTP Verification',
        instruction: 'The order is loaded onto the outbound delivery van (status: "out_for_delivery"). At the customer door, the driver requests the Delivery OTP. Upon OTP verification, status transitions to "delivered".'
      }
    ],
    successVerification: 'Order status displays green "Delivered" badge in both Admin and Customer portals with delivery timestamp.',
    securityNotes: ['Dual OTP verification (Collection OTP + Delivery OTP) eliminates fraudulent delivery claims and ensures chain of custody.'],
    relatedArticleIds: ['admin-orders', 'manager-orders', 'admin-complaints']
  },

  {
    id: 'workflow-staff-deactivation',
    title: 'Workflow: Emergency Staff Suspension & Session Revocation',
    description: 'Critical security protocol: suspending a compromised or departed staff member and immediately revoking all active server-side sessions.',
    category: 'End-to-End Workflows',
    portals: ['admin'],
    roles: ['super_admin'],
    relatedTab: 'staff',
    keywords: ['deactivation', 'suspension', 'session revocation', 'emergency security', 'auth0 block', 'token invalidation'],
    badge: 'Security Critical',
    iconName: 'Shield',
    purpose: 'Details the exact emergency security procedure executed when a staff account is compromised or employment terminates, ensuring zero unauthorized access.',
    accessRequirements: 'Super Administrator.',
    navigationPath: 'Admin Portal -> Staff Accounts -> Locate Staff Member -> Click "Suspend Account".',
    prerequisites: ['Active Super Admin session.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Locate Staff Account in Staff Module',
        instruction: 'Search for the employee by name, email, or employee number in the Staff Accounts table.'
      },
      {
        stepNumber: 2,
        title: 'Trigger Account Suspension',
        instruction: 'Click the "Suspend Account" button on their row. Provide a mandatory security reason (e.g., "Employment terminated").'
      },
      {
        stepNumber: 3,
        title: 'Immediate Database State Update',
        instruction: 'The backend immediately marks is_active: false and status: "suspended" in the MongoDB users collection. Privileged endpoints immediately reject requests via resolveLaundelleUser.'
      },
      {
        stepNumber: 4,
        title: 'Atomic Multi-Identifier Session Invalidation',
        instruction: 'SessionService.revokeAllUserSessions executes across the user\'s MongoDB internal _id, canonical publicId, and auth0UserId, marking all active sessions as revoked.'
      },
      {
        stepNumber: 5,
        title: 'Auth0 Identity Blocking',
        instruction: 'The backend calls Auth0 Management API to block the user identity, preventing any future token acquisition.'
      }
    ],
    successVerification: 'Staff row displays red "Suspended" pill. Any attempt by the suspended user to call API endpoints returns HTTP 403 Forbidden.',
    securityNotes: ['Session revocation is atomic and synchronous; does not rely on token expiry timers.'],
    relatedArticleIds: ['admin-staff', 'troubleshooting-auth-rbac']
  },

  // =========================================================================
  // 8. TROUBLESHOOTING
  // =========================================================================
  {
    id: 'troubleshooting-auth-rbac',
    title: 'Troubleshooting: Authorization, Plant Isolation & Sign-In Errors',
    description: 'Diagnosing and resolving portal access issues: 403 Forbidden errors, role mismatch, plant isolation blocks, and Auth0 sync warnings.',
    category: 'Troubleshooting',
    portals: ['admin', 'manager'],
    roles: ['super_admin', 'admin', 'manager'],
    keywords: ['troubleshooting', 'error', '403 forbidden', 'access denied', 'plant isolation error', 'role mismatch', 'auth0 error'],
    badge: 'Help & Recovery',
    iconName: 'AlertTriangle',
    purpose: 'Provides actionable troubleshooting steps for resolving authentication failures, permission denials, and plant boundary errors encountered by portal users.',
    accessRequirements: 'All portal users.',
    navigationPath: 'Reference guide.',
    prerequisites: ['Error message or HTTP status code.'],
    steps: [
      {
        stepNumber: 1,
        title: 'Diagnose "403 Forbidden: Account is deactivated or suspended"',
        instruction: 'Cause: The staff member\'s account has is_active set to false in MongoDB. Resolution: Contact a Super Administrator to inspect the Staff Accounts table and click "Activate Account".'
      },
      {
        stepNumber: 2,
        title: 'Diagnose "Plant Isolation Violation: Access Denied"',
        instruction: 'Cause: A Plant Manager is attempting to query or modify orders, staff, or settings belonging to another plant facility. Resolution: Plant Managers are restricted to their assigned plant. Super Admins can reassign plant ownership in the Areas & Slots module if reassignment is warranted.'
      },
      {
        stepNumber: 3,
        title: 'Diagnose "Role Mismatch: Account has role customer"',
        instruction: 'Cause: An Auth0 user registered via the public customer website is attempting to access the Admin or Operations portal. Resolution: Customer accounts cannot access staff portals. Staff accounts must be provisioned in the Staff Accounts module.'
      },
      {
        stepNumber: 4,
        title: 'Diagnose "Session Expired / Idle Timeout"',
        instruction: 'Cause: User was inactive longer than the configured session idle limit (default: 30 minutes). Resolution: Click "Sign in again" to refresh your session.'
      }
    ],
    commonErrors: [
      {
        error: 'HTTP 401 Unauthorized',
        cause: 'Access token expired or revoked.',
        resolution: 'The client will attempt automated single-flight refresh. If refresh token is expired, sign in again.'
      },
      {
        error: 'HTTP 403 CSRF_VALIDATION_FAILED',
        cause: 'State-changing cookie request lacked matching x-csrf-token header or origin mismatch.',
        resolution: 'Refresh the browser window to obtain a fresh anti-CSRF token.'
      }
    ],
    successVerification: 'Successful re-authentication and restoration of authorized dashboard access.',
    securityNotes: ['Role and plant boundary restrictions are enforced strictly on the backend and cannot be bypassed from browser consoles.'],
    relatedArticleIds: ['quick-start-admin', 'quick-start-manager', 'admin-staff']
  }
];
