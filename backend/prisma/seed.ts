import { PrismaClient, Role, ComplaintStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for CampusFix...');

  // 1. Idempotent cleanup: child tables first
  console.log('Cleaning existing records...');
  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "upvotes", "feedback", "complaint_images", "status_history", "complaints", "categories", "users", "departments" RESTART IDENTITY CASCADE;`);
  } catch (err) {
    console.log('Truncate cascade fallback to individual deleteMany...');
    await prisma.upvote.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.complaintImage.deleteMany();
    await prisma.statusHistory.deleteMany();
    await prisma.complaint.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
  }

  // Reset the custom ticket sequence
  try {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE IF EXISTS complaint_ticket_seq RESTART WITH 1;`);
  } catch (seqErr) {
    console.warn('Could not reset complaint_ticket_seq (sequence might not exist yet):', seqErr);
  }

  // Pre-hash demo passwords
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);
  const studentPasswordHash = await bcrypt.hash('Student@123', 10);

  // 2. Insert 6 Departments
  console.log('Creating departments...');
  const deptData = [
    { name: 'IT Services', email: 'it.helpdesk@campusfix.edu', description: 'Campus networks, lab computers, projectors, smart boards, and digital systems.' },
    { name: 'Facilities & Maintenance', email: 'facilities@campusfix.edu', description: 'Civil infrastructure, electrical wiring, plumbing, HVAC, and campus furniture.' },
    { name: 'Housekeeping', email: 'housekeeping@campusfix.edu', description: 'Campus cleanliness, sanitation, washroom hygiene, and waste management.' },
    { name: 'Transport', email: 'transport@campusfix.edu', description: 'University bus fleet scheduling, route tracking, and vehicle maintenance.' },
    { name: 'Hostel & Mess', email: 'hostel.admin@campusfix.edu', description: 'Hostel room allocations, mess food quality, water coolers, and dining halls.' },
    { name: 'Safety & Security', email: 'security@campusfix.edu', description: '24/7 campus surveillance, perimeter security, emergency response, and gate passes.' },
  ];

  const depts: Record<string, any> = {};
  for (const d of deptData) {
    depts[d.name] = await prisma.department.create({ data: d });
  }

  // 3. Insert 12 Categories (Exact names, SLAs, icons from Section 9.4)
  console.log('Creating categories...');
  const catData = [
    { name: 'Wi-Fi & Network', departmentId: depts['IT Services'].id, slaHours: 24, icon: 'wifi', description: 'Wi-Fi connectivity, speed issues, DNS problems, portal login errors' },
    { name: 'Computer Lab & Projectors', departmentId: depts['IT Services'].id, slaHours: 48, icon: 'monitor', description: 'Faulty lab PCs, projector HDMI issues, audio peripherals, software crashes' },
    { name: 'Electrical', departmentId: depts['Facilities & Maintenance'].id, slaHours: 24, icon: 'zap', description: 'Power sockets, ceiling fans, tube lights, trip switches, voltage fluctuations' },
    { name: 'Plumbing & Water', departmentId: depts['Facilities & Maintenance'].id, slaHours: 24, icon: 'droplets', description: 'Leaking taps, broken flush valves, water cooler filter choking, pipeline leaks' },
    { name: 'Furniture & Infrastructure', departmentId: depts['Facilities & Maintenance'].id, slaHours: 72, icon: 'armchair', description: 'Broken classroom benches, damaged podiums, cracked window panes, door locks' },
    { name: 'Classroom Facilities', departmentId: depts['Facilities & Maintenance'].id, slaHours: 48, icon: 'school', description: 'Air conditioner cooling, whiteboard replacement, public address speakers' },
    { name: 'Cleanliness', departmentId: depts['Housekeeping'].id, slaHours: 24, icon: 'sparkles', description: 'Corridor litter, overflowing dustbins, uncleaned spillages in common areas' },
    { name: 'Washrooms', departmentId: depts['Housekeeping'].id, slaHours: 12, icon: 'bath', description: 'Washroom hygiene, foul odor, handwash soap dispenser refills, floor scrubbing' },
    { name: 'Bus & Transport', departmentId: depts['Transport'].id, slaHours: 48, icon: 'bus', description: 'Bus delays, route alterations, AC not functioning on route, driver conduct' },
    { name: 'Hostel Rooms', departmentId: depts['Hostel & Mess'].id, slaHours: 48, icon: 'bed', description: 'Hostel bed repairs, cupboard hinge broken, balcony netting, room lock issues' },
    { name: 'Mess & Food Quality', departmentId: depts['Hostel & Mess'].id, slaHours: 24, icon: 'utensils', description: 'Under cooked food, hygiene in dining hall, insect contamination, drinking water' },
    { name: 'Safety & Security', departmentId: depts['Safety & Security'].id, slaHours: 4, icon: 'shield-alert', description: 'Broken street lamps at night, unauthorized entry, trespassers, elevator emergency' },
  ];

  const categories: Record<string, any> = {};
  for (const c of catData) {
    categories[c.name] = await prisma.category.create({ data: c });
  }

  // 4. Create Users (Demo accounts + extra staff + 10 Indian students)
  console.log('Creating users...');
  // 5 core demo accounts
  const demoAdmin = await prisma.user.create({
    data: { name: 'Campus Admin', email: 'admin@campusfix.edu', passwordHash: adminPasswordHash, role: Role.ADMIN },
  });

  const itStaff = await prisma.user.create({
    data: { name: 'Karthik Rao (IT)', email: 'it.staff@campusfix.edu', passwordHash: staffPasswordHash, role: Role.STAFF, departmentId: depts['IT Services'].id },
  });

  const facilitiesStaff = await prisma.user.create({
    data: { name: 'Mahesh Patil (Facilities)', email: 'facilities.staff@campusfix.edu', passwordHash: staffPasswordHash, role: Role.STAFF, departmentId: depts['Facilities & Maintenance'].id },
  });

  const housekeepingStaff = await prisma.user.create({
    data: { name: 'Sunita Sharma (Housekeeping)', email: 'housekeeping.staff@campusfix.edu', passwordHash: staffPasswordHash, role: Role.STAFF, departmentId: depts['Housekeeping'].id },
  });

  const demoStudent = await prisma.user.create({
    data: { name: 'Aditya Kulkarni', email: 'student@campusfix.edu', passwordHash: studentPasswordHash, role: Role.STUDENT },
  });

  // Remaining 3 department staff (Transport, Hostel & Mess, Safety & Security)
  const transportStaff = await prisma.user.create({
    data: { name: 'Suresh Kumar (Transport)', email: 'transport.staff@campusfix.edu', passwordHash: staffPasswordHash, role: Role.STAFF, departmentId: depts['Transport'].id },
  });

  const hostelStaff = await prisma.user.create({
    data: { name: 'Ramesh Gowda (Hostel)', email: 'hostel.staff@campusfix.edu', passwordHash: staffPasswordHash, role: Role.STAFF, departmentId: depts['Hostel & Mess'].id },
  });

  const securityStaff = await prisma.user.create({
    data: { name: 'Insp. R. Murthy (Security)', email: 'security.staff@campusfix.edu', passwordHash: staffPasswordHash, role: Role.STAFF, departmentId: depts['Safety & Security'].id },
  });

  const staffByDeptId: Record<number, any> = {
    [depts['IT Services'].id]: itStaff,
    [depts['Facilities & Maintenance'].id]: facilitiesStaff,
    [depts['Housekeeping'].id]: housekeepingStaff,
    [depts['Transport'].id]: transportStaff,
    [depts['Hostel & Mess'].id]: hostelStaff,
    [depts['Safety & Security'].id]: securityStaff,
  };

  // 10 students with realistic Indian names
  const studentNames = [
    { name: 'Aarav Sharma', email: 'aarav@campusfix.edu' },
    { name: 'Priya Patel', email: 'priya@campusfix.edu' },
    { name: 'Rohan Verma', email: 'rohan@campusfix.edu' },
    { name: 'Ananya Rao', email: 'ananya@campusfix.edu' },
    { name: 'Karthik Iyer', email: 'karthik.iyer@campusfix.edu' },
    { name: 'Sneha Reddy', email: 'sneha@campusfix.edu' },
    { name: 'Vikram Singh', email: 'vikram@campusfix.edu' },
    { name: 'Divya Nair', email: 'divya@campusfix.edu' },
    { name: 'Rahul Joshi', email: 'rahul.j@campusfix.edu' },
    { name: 'Pooja Hegde', email: 'pooja.h@campusfix.edu' },
  ];

  const students = [demoStudent];
  for (const s of studentNames) {
    const student = await prisma.user.create({
      data: { name: s.name, email: s.email, passwordHash: studentPasswordHash, role: Role.STUDENT },
    });
    students.push(student);
  }

  // 5. Seed 60 Complaints
  console.log('Seeding 60 realistic complaints across 30 days...');
  const now = new Date();

  // Helper for dates in the past
  const daysAgo = (days: number, hoursOffset = 0) => {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000 + hoursOffset * 60 * 60 * 1000);
    return d;
  };

  // 60 Complaint definitions
  // Distribution: 15 SUBMITTED (~25%), 18 IN_PROGRESS (~30%), 21 RESOLVED (~35%), 6 REJECTED (~10%)
  // Wi-Fi cluster in Block C: 6 complaints
  // ~8 open overdue complaints
  interface ComplaintSeedDef {
    title: string;
    description: string;
    location: string;
    categoryName: string;
    priority: Priority;
    status: ComplaintStatus;
    daysAgo: number;
    hoursOffset: number;
    studentIdx: number;
    isAnonymous?: boolean;
    aiCategoryName?: string;
    aiPriority?: Priority;
    aiConfidence?: number;
    aiReason?: string;
    resolutionHours?: number; // for RESOLVED
    rejectReason?: string; // for REJECTED
    isBlockCCluster?: boolean;
    upvotesCount: number;
    feedbackRating?: number;
    feedbackComment?: string;
  }

  const complaintDefs: ComplaintSeedDef[] = [
    // --- 6 Wi-Fi Cluster Complaints in Block C (Demo highlight!) ---
    {
      title: 'Wi-Fi connection drops repeatedly on Block C 2nd floor',
      description: 'The REVA-Student Wi-Fi signal keeps dropping every 5 minutes in Block C Room 204. Unable to submit our online lab assignment.',
      location: 'Block C, Room 204',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 2,
      hoursOffset: 4,
      studentIdx: 0,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.95,
      aiReason: 'Network connectivity disruption affecting academic submissions on Block C second floor.',
      upvotesCount: 12,
      isBlockCCluster: true,
    },
    {
      title: 'No Wi-Fi connectivity in Block C Room 201 during lectures',
      description: 'Wi-Fi shows connected but says no internet access for all laptops in Room 201. Access point light is blinking red.',
      location: 'Block C, Room 201',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.HIGH,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 1,
      hoursOffset: 2,
      studentIdx: 1,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.94,
      aiReason: 'Router hardware malfunction causing complete internet blackout in classroom.',
      upvotesCount: 9,
      isBlockCCluster: true,
    },
    {
      title: 'Block C 3rd floor corridor Wi-Fi router dead',
      description: 'The ceiling mounted wireless router outside Room 305 seems completely powered off. Zero coverage in the entire corridor.',
      location: 'Block C, 3rd Floor Corridor',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 3,
      hoursOffset: 1,
      studentIdx: 2,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.93,
      aiReason: 'Ceiling AP unpowered affecting corridor coverage in Block C.',
      upvotesCount: 8,
      isBlockCCluster: true,
    },
    {
      title: 'Severe packet loss and slow internet in Block C Reading Hall',
      description: 'Wi-Fi speed is less than 0.2 Mbps in the Block C ground floor reading hall. Websites timeout continuously.',
      location: 'Block C, Ground Floor Reading Hall',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 1,
      hoursOffset: 6,
      studentIdx: 3,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.89,
      aiReason: 'Severe bandwidth congestion or throttling in study hall.',
      upvotesCount: 7,
      isBlockCCluster: true,
    },
    {
      title: 'Wi-Fi portal authentication fails in Block C faculty cabins',
      description: 'Captive portal login page does not load on phone or laptop in Block C west wing. Stuck on DNS lookup.',
      location: 'Block C, West Wing 1st Floor',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 6,
      hoursOffset: 3,
      studentIdx: 4,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.91,
      aiReason: 'Captive portal DNS resolution failure in Block C.',
      resolutionHours: 14,
      feedbackRating: 4,
      feedbackComment: 'Portal reset resolved the issue within the morning.',
      upvotesCount: 4,
      isBlockCCluster: true,
    },
    {
      title: 'Cannot connect to Eduroam or Campus Wi-Fi near Block C lift',
      description: 'Signal strength is 1 bar and fails to handshake near the Block C elevator lobby on 2nd floor.',
      location: 'Block C, Lift Lobby 2nd Floor',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.LOW,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 2,
      hoursOffset: 8,
      studentIdx: 5,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.LOW,
      aiConfidence: 0.88,
      aiReason: 'Weak Wi-Fi coverage blindspot near concrete elevator core.',
      upvotesCount: 5,
      isBlockCCluster: true,
    },

    // --- OVERDUE OPEN COMPLAINTS (~8 overdue complaints) ---
    {
      title: 'Washroom 3rd floor taps running dirty water',
      description: 'The taps in 3rd floor boys washroom are dispensing muddy brown water since yesterday morning. Completely unusable.',
      location: 'Block A, 3rd Floor Washroom',
      categoryName: 'Washrooms',
      priority: Priority.HIGH,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 3, // SLA is 12h -> due 2.5 days ago! (OVERDUE)
      hoursOffset: 0,
      studentIdx: 6,
      aiCategoryName: 'Washrooms',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.92,
      aiReason: 'Contaminated water supply in student washroom violating hygiene standards.',
      upvotesCount: 11,
    },
    {
      title: 'Washroom flush valves broken and leaking continuously',
      description: 'Two flush tanks in the Science Block ladies restroom are stuck open and water is flooding the floor.',
      location: 'Science Block, 1st Floor Washroom',
      categoryName: 'Washrooms',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 2, // SLA is 12h -> due 36h ago! (OVERDUE)
      hoursOffset: 0,
      studentIdx: 7,
      aiCategoryName: 'Washrooms',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.90,
      aiReason: 'Active flooding from malfunctioning flush mechanisms.',
      upvotesCount: 9,
    },
    {
      title: 'Overhead projector bulb burnt out in Seminar Hall 2',
      description: 'The projector turns off automatically after 20 seconds with overheating error. Major presentation scheduled.',
      location: 'Administrative Block, Seminar Hall 2',
      categoryName: 'Computer Lab & Projectors',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 5, // SLA 48h -> due 3 days ago! (OVERDUE)
      hoursOffset: 2,
      studentIdx: 8,
      aiCategoryName: 'Computer Lab & Projectors',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.94,
      aiReason: 'Hardware lamp failure disrupting university seminar hall.',
      upvotesCount: 6,
    },
    {
      title: 'Exposed wire sparking from switchboard near water cooler',
      description: 'A loose electrical wire is sparking intermittently next to the cold water dispenser on Ground Floor.',
      location: 'Mechanical Block, Ground Floor',
      categoryName: 'Electrical',
      priority: Priority.CRITICAL,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 3, // SLA 24h -> due 2 days ago! (OVERDUE)
      hoursOffset: 1,
      studentIdx: 9,
      aiCategoryName: 'Safety & Security', // AI slight mismatch demo (classified safety vs electrical)
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.97,
      aiReason: 'Life safety hazard: electrical arcing in close proximity to water source.',
      upvotesCount: 15,
    },
    {
      title: 'Garbage bins overflowing near cafeteria entrance',
      description: 'Wet waste and food plates have accumulated outside the mess entrance and foul smell is spreading.',
      location: 'Main Canteen, Outer Courtyard',
      categoryName: 'Cleanliness',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 3, // SLA 24h -> due 2 days ago! (OVERDUE)
      hoursOffset: 4,
      studentIdx: 10,
      aiCategoryName: 'Cleanliness',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.93,
      aiReason: 'Sanitation hazard from uncollected food waste in dining zone.',
      upvotesCount: 8,
    },
    {
      title: 'Submersible water pump tripping main circuit breaker',
      description: 'Water supply to Hostel Block B is halted because pump trips the breaker immediately upon starting.',
      location: 'Boys Hostel B, Pump Room',
      categoryName: 'Plumbing & Water',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 4, // SLA 24h -> due 3 days ago! (OVERDUE)
      hoursOffset: 0,
      studentIdx: 0,
      aiCategoryName: 'Plumbing & Water',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.91,
      aiReason: 'Motor electrical fault cutting domestic water supply to residential hostel.',
      upvotesCount: 14,
    },
    {
      title: 'Route 7 Bus delayed by 45 minutes without prior notice',
      description: 'The Yelahanka route bus did not arrive at Kogilu Cross on time, leaving 30 students stranded in rain.',
      location: 'Bus Route 7 (Yelahanka)',
      categoryName: 'Bus & Transport',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 4, // SLA 48h -> due 2 days ago! (OVERDUE)
      hoursOffset: 3,
      studentIdx: 1,
      aiCategoryName: 'Bus & Transport',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.95,
      aiReason: 'Fleet scheduling lapse stranding student commuters.',
      upvotesCount: 10,
    },
    {
      title: 'Hostel mess dinner served uncooked chicken and sour curd',
      description: 'Multiple students complained of stomach ache after yesterday dinner. Food quality inspection required immediately.',
      location: 'Hostel Mess Hall 1',
      categoryName: 'Mess & Food Quality',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 3, // SLA 24h -> due 2 days ago! (OVERDUE)
      hoursOffset: 2,
      studentIdx: 2,
      aiCategoryName: 'Mess & Food Quality',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.96,
      aiReason: 'Food poisoning risk from undercooked poultry and spoiled dairy products.',
      upvotesCount: 16,
    },

    // --- OTHER SUBMITTED COMPLAINTS (~7 more to make 15 total submitted) ---
    {
      title: 'Main library air conditioner blowing warm air',
      description: 'The central AC on library 2nd floor silent study room is not cooling at all. Temperature is uncomfortable.',
      location: 'Central Library, 2nd Floor',
      categoryName: 'Classroom Facilities',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 0,
      hoursOffset: 3,
      studentIdx: 3,
      aiCategoryName: 'Classroom Facilities',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.91,
      aiReason: 'HVAC cooling degradation in large common study space.',
      upvotesCount: 5,
    },
    {
      title: 'Broken desk benches in Room 102 Lecture Hall',
      description: 'Three wooden desk rows have loose screws and shaky planks that snag students backpacks.',
      location: 'Block A, Room 102',
      categoryName: 'Furniture & Infrastructure',
      priority: Priority.LOW,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 1,
      hoursOffset: 5,
      studentIdx: 4,
      aiCategoryName: 'Furniture & Infrastructure',
      aiPriority: Priority.LOW,
      aiConfidence: 0.88,
      aiReason: 'Classroom furniture physical wear requiring carpentry maintenance.',
      upvotesCount: 2,
    },
    {
      title: 'Ceiling plaster peeling in Hostel B 1st floor corridor',
      description: 'Small flakes of damp concrete fell from the ceiling near room 112 after yesterday heavy rain.',
      location: 'Boys Hostel B, Room 112',
      categoryName: 'Hostel Rooms',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 1,
      hoursOffset: 4,
      studentIdx: 5,
      aiCategoryName: 'Hostel Rooms',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.85,
      aiReason: 'Moisture seepage causing structural surface flaking in hostel corridor.',
      upvotesCount: 4,
    },
    {
      title: 'Streetlight out along South Gate walkway',
      description: 'Two lampposts along the walkway between Girls Hostel and Gate 3 are completely dark after 7 PM.',
      location: 'Campus Walkway, Near Gate 3',
      categoryName: 'Safety & Security',
      priority: Priority.HIGH,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 0,
      hoursOffset: 2,
      studentIdx: 6,
      aiCategoryName: 'Safety & Security',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.96,
      aiReason: 'Inadequate illumination posing personal security vulnerability at night.',
      upvotesCount: 9,
    },
    {
      title: 'Computer Lab 4 PC-12 keyboard missing essential keys',
      description: 'Spacebar and enter keys are snapped off on desktop 12 in CSE lab. Cannot write coding assignments.',
      location: 'CSE Lab 4, Desktop 12',
      categoryName: 'Computer Lab & Projectors',
      priority: Priority.LOW,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 1,
      hoursOffset: 1,
      studentIdx: 7,
      aiCategoryName: 'Computer Lab & Projectors',
      aiPriority: Priority.LOW,
      aiConfidence: 0.90,
      aiReason: 'Damaged peripheral hardware preventing academic lab usage.',
      upvotesCount: 1,
    },
    {
      title: 'Campus shuttle bus tire pressure noticeably low',
      description: 'Shuttle vehicle KA-04-E-1234 wobbles heavily around turns and left rear tire appears deflated.',
      location: 'Main Parking Lot 2',
      categoryName: 'Bus & Transport',
      priority: Priority.HIGH,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 0,
      hoursOffset: 4,
      studentIdx: 8,
      aiCategoryName: 'Bus & Transport',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.92,
      aiReason: 'Vehicular roadworthiness safety concern regarding passenger shuttle tire.',
      upvotesCount: 3,
    },
    {
      title: 'No liquid soap or sanitizer dispensers filled in Block B',
      description: 'All three soap dispensers in Block B ground floor restrooms have been empty since Monday morning.',
      location: 'Block B, Ground Floor Washroom',
      categoryName: 'Washrooms',
      priority: Priority.LOW,
      status: ComplaintStatus.SUBMITTED,
      daysAgo: 0,
      hoursOffset: 5,
      studentIdx: 9,
      aiCategoryName: 'Cleanliness', // AI mismatch demo
      aiPriority: Priority.LOW,
      aiConfidence: 0.81,
      aiReason: 'Sanitation consumable replenishment request.',
      upvotesCount: 2,
    },

    // --- OTHER IN_PROGRESS COMPLAINTS (~10 more to make 18 total in progress) ---
    {
      title: 'Central server room air conditioner making loud grinding noise',
      description: 'Heavy metallic grinding noise from outdoor condenser unit of IT server room. Risk of bearing failure.',
      location: 'IT Services Center, Server Room 1',
      categoryName: 'Electrical',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 2,
      hoursOffset: 5,
      studentIdx: 10,
      aiCategoryName: 'Electrical',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.93,
      aiReason: 'Mechanical failure of critical IT server cooling hardware.',
      upvotesCount: 3,
    },
    {
      title: 'Audio amplifier buzzing loudly during auditorium lectures',
      description: 'High pitched 50Hz hum coming through speakers whenever wireless microphones are engaged in Main Audi.',
      location: 'University Auditorium',
      categoryName: 'Computer Lab & Projectors',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 3,
      hoursOffset: 2,
      studentIdx: 0,
      aiCategoryName: 'Computer Lab & Projectors',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.87,
      aiReason: 'Acoustic grounding loop or audio amplifier malfunction in auditorium.',
      upvotesCount: 4,
    },
    {
      title: 'Broken window latch allowing rain inside classroom 304',
      description: 'The aluminum window latch in 304 is broken and heavy wind blows rain directly onto front row benches.',
      location: 'Block A, Room 304',
      categoryName: 'Furniture & Infrastructure',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 2,
      hoursOffset: 6,
      studentIdx: 1,
      aiCategoryName: 'Furniture & Infrastructure',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.89,
      aiReason: 'Building envelope defect allowing rainwater ingress into classroom.',
      upvotesCount: 2,
    },
    {
      title: 'Corridor dustbins removed and not replaced after painting',
      description: 'Students are dumping paper cups in corners because waste bins were removed last week during wall painting.',
      location: 'Block C, 1st Floor Corridor',
      categoryName: 'Cleanliness',
      priority: Priority.LOW,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 1,
      hoursOffset: 3,
      studentIdx: 2,
      aiCategoryName: 'Cleanliness',
      aiPriority: Priority.LOW,
      aiConfidence: 0.94,
      aiReason: 'Missing waste disposal amenities encouraging informal littering.',
      upvotesCount: 3,
    },
    {
      title: 'Hostel geyser not heating water in 2nd floor bathroom',
      description: 'Commercial 100L geyser power indicator is green but water remains ice cold early mornings.',
      location: 'Girls Hostel A, 2nd Floor Washroom',
      categoryName: 'Electrical',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 1,
      hoursOffset: 8,
      studentIdx: 3,
      aiCategoryName: 'Electrical',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.90,
      aiReason: 'Heating coil failure in hostel domestic hot water system.',
      upvotesCount: 7,
    },
    {
      title: 'Water fountain filter indicator red and water tastes chlorine heavy',
      description: 'Drinking water dispenser near CSE dept entrance shows filter replacement warning LED and water tastes strange.',
      location: 'Block B, Dept of CSE Entrance',
      categoryName: 'Plumbing & Water',
      priority: Priority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 1,
      hoursOffset: 4,
      studentIdx: 4,
      aiCategoryName: 'Plumbing & Water',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.93,
      aiReason: 'Expired water purification filter cartridge impacting student potable water.',
      upvotesCount: 8,
    },
    {
      title: 'Bus Route 12 driver rash driving and skipping stop',
      description: 'Driver skipped the Hebbal flyover designated pickup point despite 6 students waiting with valid passes.',
      location: 'Bus Route 12 (Hebbal)',
      categoryName: 'Bus & Transport',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 2,
      hoursOffset: 1,
      studentIdx: 5,
      aiCategoryName: 'Bus & Transport',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.91,
      aiReason: 'Transport service route compliance breach.',
      upvotesCount: 6,
    },
    {
      title: 'Elevator in Academic Block B stuck between 2nd and 3rd floor',
      description: 'Lift doors fail to open cleanly and elevator jerks violently when reaching floor 3. Urgent maintenance needed.',
      location: 'Academic Block B, Lift 2',
      categoryName: 'Safety & Security',
      priority: Priority.CRITICAL,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 0,
      hoursOffset: 1,
      studentIdx: 6,
      aiCategoryName: 'Safety & Security',
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.98,
      aiReason: 'Critical vertical transport safety hazard with passenger entrapment danger.',
      upvotesCount: 13,
    },
    {
      title: 'Hostel mess drinking glasses chipped and dirty',
      description: 'Steel tumblers in the mess are greasy and several have sharp bent rims capable of cutting lips.',
      location: 'Hostel Mess Hall 2',
      categoryName: 'Mess & Food Quality',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 1,
      hoursOffset: 7,
      studentIdx: 7,
      aiCategoryName: 'Mess & Food Quality',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.88,
      aiReason: 'Dishwashing sanitation and utensil safety defect in student mess.',
      upvotesCount: 5,
    },
    {
      title: 'Classroom smart podium touch screen unresponsive to stylus',
      description: 'The digital teaching podium in Room 205 has touch calibration off by 4 inches. Faculty unable to deliver slides.',
      location: 'Block A, Room 205',
      categoryName: 'Computer Lab & Projectors',
      priority: Priority.LOW,
      status: ComplaintStatus.IN_PROGRESS,
      daysAgo: 2,
      hoursOffset: 3,
      studentIdx: 8,
      aiCategoryName: 'Computer Lab & Projectors',
      aiPriority: Priority.LOW,
      aiConfidence: 0.89,
      aiReason: 'Interactive display hardware digitizer calibration failure.',
      upvotesCount: 2,
    },

    // --- 21 RESOLVED COMPLAINTS (~35% of total, realistic resolution times) ---
    // IT faster (4-24h), Facilities longer (24-96h)
    {
      title: 'Wi-Fi gateway DHCP IP exhaustion in Library Ground Floor',
      description: 'Students unable to acquire local IP address when library gets crowded during afternoon study hours.',
      location: 'Central Library, Ground Floor',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.HIGH,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 15,
      hoursOffset: 2,
      studentIdx: 9,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.94,
      aiReason: 'DHCP scope pool exhaustion on campus wireless VLAN.',
      resolutionHours: 6, // IT is fast!
      feedbackRating: 5,
      feedbackComment: 'Subnet pool expanded, connects instantly now. Great work!',
      upvotesCount: 5,
    },
    {
      title: 'Core switch rebooting continuously in CSE department server room',
      description: 'Intermittent LAN disconnection across all 4 computer laboratories in department wing.',
      location: 'Block B, 2nd Floor Server Room',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.CRITICAL,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 20,
      hoursOffset: 1,
      studentIdx: 10,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.96,
      aiReason: 'Network core switch power redundancy hardware fault.',
      resolutionHours: 4,
      feedbackRating: 5,
      feedbackComment: 'Replaced faulty redundant PSU within 4 hours. No downtime since.',
      upvotesCount: 7,
    },
    {
      title: 'Projector ceiling bracket loosened in Room 301',
      description: 'The projector is tilted at 25 degrees and wobbles when the ceiling fan is switched on.',
      location: 'Block A, Room 301',
      categoryName: 'Computer Lab & Projectors',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 18,
      hoursOffset: 3,
      studentIdx: 0,
      aiCategoryName: 'Computer Lab & Projectors',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.89,
      aiReason: 'Physical mount hardware loosening posing dropped equipment hazard.',
      resolutionHours: 12,
      feedbackRating: 4,
      feedbackComment: 'Bracket tightened and re-aligned with whiteboard cleanly.',
      upvotesCount: 2,
    },
    {
      title: 'Computer Lab 2 all network cables detached from wall switch',
      description: 'Wall patch panel had loose RJ45 jacks causing 14 systems to show network unplugged.',
      location: 'CSE Lab 2, Systems 1-14',
      categoryName: 'Computer Lab & Projectors',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 14,
      hoursOffset: 5,
      studentIdx: 1,
      aiCategoryName: 'Computer Lab & Projectors',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.92,
      aiReason: 'Structured cabling patch panel physical disconnect.',
      resolutionHours: 8,
      feedbackRating: 5,
      feedbackComment: 'Technician re-crimped all connectors neatly with cable ties.',
      upvotesCount: 3,
    },
    {
      title: 'Main auditorium stage lighting dimmer pack tripped',
      description: 'Warm spotlight circuit on stage left is unresponsive ahead of annual cultural rehearsals.',
      location: 'University Auditorium, Main Stage',
      categoryName: 'Electrical',
      priority: Priority.HIGH,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 22,
      hoursOffset: 2,
      studentIdx: 2,
      aiCategoryName: 'Electrical',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.91,
      aiReason: 'Stage lighting DMX dimmer circuit breaker overload.',
      resolutionHours: 32, // Facilities takes ~32h
      feedbackRating: 4,
      feedbackComment: 'Dimmer triac replaced and load rebalanced across phases.',
      upvotesCount: 4,
    },
    {
      title: 'Bathroom door lock jammed in Girls Hostel Block A',
      description: 'Student had to be assisted out when the brass mortise latch failed to retract on room 208 bath.',
      location: 'Girls Hostel A, Room 208',
      categoryName: 'Hostel Rooms',
      priority: Priority.HIGH,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 25,
      hoursOffset: 0,
      studentIdx: 3,
      aiCategoryName: 'Hostel Rooms',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.95,
      aiReason: 'Mechanical door lock mechanism failure causing entrapment risk.',
      resolutionHours: 28,
      feedbackRating: 4,
      feedbackComment: 'Brand new cylinder lock installed by hostel warden team.',
      upvotesCount: 6,
    },
    {
      title: 'Major water pipe burst in front of Central Cafeteria',
      description: 'Underground PVC line ruptured and clean water is gushing into the pavement garden.',
      location: 'Main Cafeteria Outer Garden',
      categoryName: 'Plumbing & Water',
      priority: Priority.CRITICAL,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 27,
      hoursOffset: 4,
      studentIdx: 4,
      aiCategoryName: 'Plumbing & Water',
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.97,
      aiReason: 'High pressure mainline distribution pipe rupture.',
      resolutionHours: 48,
      feedbackRating: 3,
      feedbackComment: 'Took two days to dig and patch, but solved properly now.',
      upvotesCount: 11,
    },
    {
      title: 'Foul drainage backflow in ground floor gents washroom',
      description: 'Floor trap drain is clogged with hair and paper towels causing greywater to pool on tiles.',
      location: 'Block C, Ground Floor Washroom',
      categoryName: 'Washrooms',
      priority: Priority.HIGH,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 12,
      hoursOffset: 2,
      studentIdx: 5,
      aiCategoryName: 'Washrooms',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.94,
      aiReason: 'Severe wastewater drain blockage creating biological hazard.',
      resolutionHours: 10,
      feedbackRating: 4,
      feedbackComment: 'Plumber used high-pressure snake rod and sanitized floor.',
      upvotesCount: 8,
    },
    {
      title: 'Corridor lights flickering in MBA Block 2nd floor',
      description: 'Three 36W LED tube lights are strobing rapidly, triggering headaches during evening classes.',
      location: 'MBA Block, 2nd Floor Corridor',
      categoryName: 'Electrical',
      priority: Priority.LOW,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 16,
      hoursOffset: 3,
      studentIdx: 6,
      aiCategoryName: 'Electrical',
      aiPriority: Priority.LOW,
      aiConfidence: 0.89,
      aiReason: 'Failing LED driver ballasts causing optical flicker.',
      resolutionHours: 42,
      feedbackRating: 5,
      feedbackComment: 'Drivers replaced with brand new Philips units.',
      upvotesCount: 1,
    },
    {
      title: 'Classroom 402 whiteboard heavily scratched and stained',
      description: 'Marker ink cannot be erased from the central whiteboard section making math equations illegible.',
      location: 'Block A, Room 402',
      categoryName: 'Classroom Facilities',
      priority: Priority.LOW,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 19,
      hoursOffset: 1,
      studentIdx: 7,
      aiCategoryName: 'Furniture & Infrastructure', // AI mismatch demo
      aiPriority: Priority.LOW,
      aiConfidence: 0.83,
      aiReason: 'Classroom instructional fixture surface degradation.',
      resolutionHours: 56,
      feedbackRating: 4,
      feedbackComment: 'Board resurfaced with ceramic white sheet.',
      upvotesCount: 2,
    },
    {
      title: 'Campus bus route 3 broke down near Hebbal junction',
      description: 'Radiator hose snapped during morning commute. Replacement bus arrived after 35 minutes.',
      location: 'Bus Route 3 (Hebbal)',
      categoryName: 'Bus & Transport',
      priority: Priority.HIGH,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 24,
      hoursOffset: 0,
      studentIdx: 8,
      aiCategoryName: 'Bus & Transport',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.95,
      aiReason: 'Engine cooling system mechanical breakdown during passenger service.',
      resolutionHours: 24,
      feedbackRating: 3,
      feedbackComment: 'Bus was towed and repaired. Hope preventive checks are done.',
      upvotesCount: 5,
    },
    {
      title: 'Mess evening snacks samosa found stale with fungus spots',
      description: 'Several students reported mold on the potato filling in yesterday evening mess tea snacks.',
      location: 'Hostel Mess Hall 1',
      categoryName: 'Mess & Food Quality',
      priority: Priority.CRITICAL,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 26,
      hoursOffset: 1,
      studentIdx: 9,
      aiCategoryName: 'Mess & Food Quality',
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.98,
      aiReason: 'Severe microbiological food safety contamination in student dining facility.',
      resolutionHours: 18,
      feedbackRating: 4,
      feedbackComment: 'Catering vendor fined and fresh oil/prep protocol instituted.',
      upvotesCount: 14,
    },
    {
      title: 'Fallen tree branch obstructing pedestrian path near Oval Ground',
      description: 'Heavy eucalyptus branch cracked during thunderstorm and blocked student walkway to gym.',
      location: 'Campus Walkway, Near Oval Ground',
      categoryName: 'Safety & Security',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 11,
      hoursOffset: 2,
      studentIdx: 10,
      aiCategoryName: 'Safety & Security',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.93,
      aiReason: 'Storm debris obstructing campus thoroughfare.',
      resolutionHours: 6,
      feedbackRating: 5,
      feedbackComment: 'Gardening team sawed and cleared branch within hours.',
      upvotesCount: 3,
    },
    {
      title: 'Broken window pane in Hostel B common TV room',
      description: 'Cricket ball broke outer window glass pane. Shards were lying on the indoor rug.',
      location: 'Boys Hostel B, Ground Floor TV Room',
      categoryName: 'Hostel Rooms',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 28,
      hoursOffset: 4,
      studentIdx: 0,
      aiCategoryName: 'Hostel Rooms',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.90,
      aiReason: 'Shattered glass hazard in high-traffic student recreational lounge.',
      resolutionHours: 64,
      feedbackRating: 3,
      feedbackComment: 'Glass replaced, but shards took two days to be vacuumed.',
      upvotesCount: 4,
    },
    {
      title: 'Water cooler dispensing warm water in CSE department',
      description: 'Compressor cooling unit not turning on despite continuous power supply in main hallway.',
      location: 'Block B, 1st Floor Corridor',
      categoryName: 'Plumbing & Water',
      priority: Priority.LOW,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 13,
      hoursOffset: 1,
      studentIdx: 1,
      aiCategoryName: 'Plumbing & Water',
      aiPriority: Priority.LOW,
      aiConfidence: 0.91,
      aiReason: 'Refrigeration compressor failure on drinking water cooler.',
      resolutionHours: 36,
      feedbackRating: 4,
      feedbackComment: 'Freon gas refilled and cold water restored.',
      upvotesCount: 3,
    },
    {
      title: 'Graffiti sprayed on newly painted library exterior wall',
      description: 'Aerosol spray paint vandalism found on the eastern heritage brick wall of the library.',
      location: 'Central Library, East Wall',
      categoryName: 'Cleanliness',
      priority: Priority.LOW,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 23,
      hoursOffset: 3,
      studentIdx: 2,
      aiCategoryName: 'Cleanliness',
      aiPriority: Priority.LOW,
      aiConfidence: 0.88,
      aiReason: 'Surface defacement requiring specialized paint removal.',
      resolutionHours: 48,
      upvotesCount: 1,
    },
    {
      title: 'Emergency exit push bar jammed on 4th floor Block A',
      description: 'The fire exit panic door will not open even with hard push, completely blocking emergency escape route.',
      location: 'Block A, 4th Floor Fire Exit',
      categoryName: 'Safety & Security',
      priority: Priority.CRITICAL,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 9,
      hoursOffset: 1,
      studentIdx: 3,
      aiCategoryName: 'Safety & Security',
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.99,
      aiReason: 'Non-compliant fire safety escape route with jammed egress door.',
      resolutionHours: 3, // Urgent safety resolved in 3h
      feedbackRating: 5,
      feedbackComment: 'Security arrived with locksmith immediately. Essential fix!',
      upvotesCount: 10,
    },
    {
      title: 'Hostel mess drinking water container found without lid',
      description: 'Large steel water tank left exposed to dust and flies next to the plate return counter.',
      location: 'Hostel Mess Hall 2',
      categoryName: 'Mess & Food Quality',
      priority: Priority.HIGH,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 17,
      hoursOffset: 2,
      studentIdx: 4,
      aiCategoryName: 'Mess & Food Quality',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.92,
      aiReason: 'Open drinking water reservoir hygiene violation.',
      resolutionHours: 5,
      feedbackRating: 4,
      feedbackComment: 'Stainless steel cover fitted with tamper-proof latch.',
      upvotesCount: 6,
    },
    {
      title: 'Classroom 204 air conditioner remote missing',
      description: 'Cannot adjust temperature or fan speed in 204; AC stuck at 18 degrees Celsius freezing students.',
      location: 'Block A, Room 204',
      categoryName: 'Classroom Facilities',
      priority: Priority.LOW,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 21,
      hoursOffset: 4,
      studentIdx: 5,
      aiCategoryName: 'Classroom Facilities',
      aiPriority: Priority.LOW,
      aiConfidence: 0.86,
      aiReason: 'Missing HVAC interface accessory causing excessive cooling.',
      resolutionHours: 24,
      feedbackRating: 5,
      feedbackComment: 'Wall mounted bracket and new universal remote installed.',
      upvotesCount: 1,
    },
    {
      title: 'Pothole at campus north gate causing bus scraping',
      description: 'Deep 6 inch pothole right at speed bump entry causing vehicle underbody scrape on low floor buses.',
      location: 'Campus North Gate Entry',
      categoryName: 'Furniture & Infrastructure',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 29,
      hoursOffset: 2,
      studentIdx: 6,
      aiCategoryName: 'Furniture & Infrastructure',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.91,
      aiReason: 'Asphalt road surface depression impacting vehicular traffic.',
      resolutionHours: 72,
      feedbackRating: 4,
      feedbackComment: 'Cold mix asphalt patching completed over the weekend.',
      upvotesCount: 5,
    },
    {
      title: 'Student ID card barcode scanner broken at library entrance turnstile',
      description: 'Manual register entry required because red laser reader on turnstile 1 fails to beep.',
      location: 'Central Library, Entry Turnstile 1',
      categoryName: 'Computer Lab & Projectors',
      priority: Priority.MEDIUM,
      status: ComplaintStatus.RESOLVED,
      daysAgo: 8,
      hoursOffset: 2,
      studentIdx: 7,
      aiCategoryName: 'Computer Lab & Projectors',
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.93,
      aiReason: 'Optical scanner hardware fault slowing automated library access.',
      resolutionHours: 16,
      feedbackRating: 5,
      feedbackComment: 'USB scanner swapped with backup unit. Fast turnaround.',
      upvotesCount: 3,
    },

    // --- 6 REJECTED COMPLAINTS (~10% of total) ---
    {
      title: 'Request to install gaming consoles in hostel study room',
      description: 'We want PlayStation 5 in the hostel quiet room for recreation during exam semester breaks.',
      location: 'Boys Hostel B, Study Room',
      categoryName: 'Hostel Rooms',
      priority: Priority.LOW,
      status: ComplaintStatus.REJECTED,
      daysAgo: 10,
      hoursOffset: 1,
      studentIdx: 8,
      rejectReason: 'Ineligible complaint: Hostel quiet rooms are designated solely for academic silence. Recreational gaming facilities cannot be approved in study halls.',
      upvotesCount: 0,
    },
    {
      title: 'Complaint about strict hostel 9 PM curfew timings',
      description: 'Warden does not allow entry past 9:15 PM without parental SMS. Please remove curfew permanently.',
      location: 'Girls Hostel A, Gate',
      categoryName: 'Safety & Security',
      priority: Priority.LOW,
      status: ComplaintStatus.REJECTED,
      daysAgo: 14,
      hoursOffset: 4,
      studentIdx: 9,
      rejectReason: 'Out of scope: Campus curfew regulations are framed by the University Disciplinary Committee and cannot be altered via the maintenance ticketing portal.',
      upvotesCount: 1,
    },
    {
      title: 'Duplicate ticket: Wi-Fi dead in Block C room 204',
      description: 'Submitting again because my roommate already submitted but wifi is still not working for me.',
      location: 'Block C, Room 204',
      categoryName: 'Wi-Fi & Network',
      priority: Priority.HIGH,
      status: ComplaintStatus.REJECTED,
      daysAgo: 2,
      hoursOffset: 1,
      studentIdx: 10,
      aiCategoryName: 'Wi-Fi & Network',
      aiPriority: Priority.HIGH,
      aiConfidence: 0.96,
      aiReason: 'Duplicate ticket matching existing active investigation for Block C 204.',
      rejectReason: 'Duplicate complaint: Merged with active ticket CMP-2026-000001. Please use the "Me Too" upvote feature to follow progress.',
      upvotesCount: 2,
      isBlockCCluster: true,
    },
    {
      title: 'Canteen should serve complimentary ice cream every Friday',
      description: 'Private colleges provide free desserts on weekends. University should subsidize ice cream.',
      location: 'Main Canteen',
      categoryName: 'Mess & Food Quality',
      priority: Priority.LOW,
      status: ComplaintStatus.REJECTED,
      daysAgo: 16,
      hoursOffset: 3,
      studentIdx: 0,
      rejectReason: 'Invalid grievance: Menu pricing and subsidies are determined by university student council tenders.',
      upvotesCount: 1,
    },
    {
      title: 'Request to repaint college buses in sports sports red color',
      description: 'The current yellow color looks too traditional. Red or blue racing livery would look much cooler.',
      location: 'Transport Office',
      categoryName: 'Bus & Transport',
      priority: Priority.LOW,
      status: ComplaintStatus.REJECTED,
      daysAgo: 21,
      hoursOffset: 5,
      studentIdx: 1,
      rejectReason: 'Rejected: School and university bus liveries are legally mandated as Golden Yellow by state motor vehicle transport laws.',
      upvotesCount: 0,
    },
    {
      title: 'Professor conducts surprise pop quizzes on Monday mornings',
      description: 'Surprise quizzes cause excessive stress and should be banned by facilities management.',
      location: 'Block A, Room 302',
      categoryName: 'Classroom Facilities',
      priority: Priority.LOW,
      status: ComplaintStatus.REJECTED,
      daysAgo: 7,
      hoursOffset: 2,
      studentIdx: 2,
      rejectReason: 'Non-grievance: Academic assessment policies must be addressed directly to the Dean of Academics.',
      upvotesCount: 0,
    },
  ];

  console.log(`Inserting ${complaintDefs.length} complaints with relationships and audit trails...`);

  let countSubmitted = 0;
  let countInProgress = 0;
  let countResolved = 0;
  let countRejected = 0;
  let countOverdue = 0;

  for (let i = 0; i < complaintDefs.length; i++) {
    const c = complaintDefs[i];
    const category = categories[c.categoryName];
    const departmentId = category.departmentId;
    const studentUser = students[c.studentIdx % students.length];
    const staffUser = staffByDeptId[departmentId];

    const createdAt = daysAgo(c.daysAgo, c.hoursOffset);
    const slaHours = category.slaHours;
    const dueAt = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);

    let resolvedAt: Date | null = null;
    let assignedToId: number | null = null;

    if (c.status === ComplaintStatus.IN_PROGRESS) {
      assignedToId = staffUser.id;
      countInProgress++;
      if (dueAt < now) countOverdue++;
    } else if (c.status === ComplaintStatus.SUBMITTED) {
      countSubmitted++;
      if (dueAt < now) countOverdue++;
    } else if (c.status === ComplaintStatus.RESOLVED) {
      assignedToId = staffUser.id;
      const hoursToResolve = c.resolutionHours || Math.floor(Math.random() * (slaHours - 4)) + 4;
      resolvedAt = new Date(createdAt.getTime() + hoursToResolve * 60 * 60 * 1000);
      countResolved++;
    } else if (c.status === ComplaintStatus.REJECTED) {
      countRejected++;
    }

    // Create complaint
    const complaint = await prisma.complaint.create({
      data: {
        title: c.title,
        description: c.description,
        location: c.location,
        priority: c.priority,
        status: c.status,
        isAnonymous: c.isAnonymous || false,
        categoryId: category.id,
        departmentId: departmentId,
        createdById: studentUser.id,
        assignedToId: assignedToId,
        aiCategoryName: c.aiCategoryName || (Math.random() < 0.8 ? category.name : null),
        aiPriority: c.aiPriority || (Math.random() < 0.77 ? c.priority : Priority.MEDIUM),
        aiConfidence: c.aiConfidence || (Math.random() * 0.15 + 0.82),
        aiReason: c.aiReason || `Automated routing to ${category.name} based on reported issue keywords and semantic classification.`,
        dueAt: dueAt,
        resolvedAt: resolvedAt,
        createdAt: createdAt,
        updatedAt: resolvedAt || createdAt,
      },
    });

    // Create consistent Status History audit trail (oldest first)
    // 1. Initial submission
    await prisma.statusHistory.create({
      data: {
        complaintId: complaint.id,
        fromStatus: null,
        toStatus: ComplaintStatus.SUBMITTED,
        note: 'Complaint submitted by student via campus portal.',
        changedById: studentUser.id,
        createdAt: createdAt,
      },
    });

    if (c.status === ComplaintStatus.IN_PROGRESS) {
      const assignedTime = new Date(createdAt.getTime() + 45 * 60 * 1000); // 45 mins later
      await prisma.statusHistory.create({
        data: {
          complaintId: complaint.id,
          fromStatus: ComplaintStatus.SUBMITTED,
          toStatus: ComplaintStatus.IN_PROGRESS,
          note: `Assigned to ${staffUser.name}. Preliminary inspection scheduled.`,
          changedById: staffUser.id,
          createdAt: assignedTime,
        },
      });
    } else if (c.status === ComplaintStatus.RESOLVED) {
      const assignedTime = new Date(createdAt.getTime() + 30 * 60 * 1000);
      await prisma.statusHistory.create({
        data: {
          complaintId: complaint.id,
          fromStatus: ComplaintStatus.SUBMITTED,
          toStatus: ComplaintStatus.IN_PROGRESS,
          note: `Assigned to ${staffUser.name}. Field technician dispatched.`,
          changedById: staffUser.id,
          createdAt: assignedTime,
        },
      });
      await prisma.statusHistory.create({
        data: {
          complaintId: complaint.id,
          fromStatus: ComplaintStatus.IN_PROGRESS,
          toStatus: ComplaintStatus.RESOLVED,
          note: `Issue resolved and inspected on site. Service restored in compliance with departmental SLA.`,
          changedById: staffUser.id,
          createdAt: resolvedAt!,
        },
      });

      // Feedback for ~70% of resolved complaints
      if (c.feedbackRating) {
        await prisma.feedback.create({
          data: {
            complaintId: complaint.id,
            userId: studentUser.id,
            rating: c.feedbackRating,
            comment: c.feedbackComment || 'Thank you for the quick resolution!',
            createdAt: new Date(resolvedAt!.getTime() + 2 * 60 * 60 * 1000),
          },
        });
      }
    } else if (c.status === ComplaintStatus.REJECTED) {
      const rejectTime = new Date(createdAt.getTime() + 60 * 60 * 1000);
      await prisma.statusHistory.create({
        data: {
          complaintId: complaint.id,
          fromStatus: ComplaintStatus.SUBMITTED,
          toStatus: ComplaintStatus.REJECTED,
          note: c.rejectReason || 'Complaint rejected after departmental review.',
          changedById: staffUser.id,
          createdAt: rejectTime,
        },
      });
    }

    // Upvotes from students (excluding author)
    if (c.upvotesCount > 0) {
      const candidateVoters = students.filter((s) => s.id !== studentUser.id);
      const votersToUse = candidateVoters.slice(0, Math.min(c.upvotesCount, candidateVoters.length));
      for (const voter of votersToUse) {
        try {
          await prisma.upvote.create({
            data: {
              complaintId: complaint.id,
              userId: voter.id,
              createdAt: new Date(createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000),
            },
          });
        } catch (e) {
          // ignore duplicate upvote if any
        }
      }
    }
  }

  // 6. Print Verification Counts
  const [totalDepts, totalCats, totalUsers, totalComplaints, totalHistories, totalFeedbacks, totalUpvotes] = await Promise.all([
    prisma.department.count(),
    prisma.category.count(),
    prisma.user.count(),
    prisma.complaint.count(),
    prisma.statusHistory.count(),
    prisma.feedback.count(),
    prisma.upvote.count(),
  ]);

  console.log('\n======================================================');
  console.log('✅ CampusFix Seed Complete! Database Metrics:');
  console.log('======================================================');
  console.log(`Departments:       ${totalDepts}`);
  console.log(`Categories:        ${totalCats}`);
  console.log(`Users:             ${totalUsers} (1 Admin, 6 Staff, 11 Students)`);
  console.log(`Complaints:        ${totalComplaints}`);
  console.log(`  - SUBMITTED:     ${countSubmitted}`);
  console.log(`  - IN_PROGRESS:   ${countInProgress}`);
  console.log(`  - RESOLVED:      ${countResolved}`);
  console.log(`  - REJECTED:      ${countRejected}`);
  console.log(`  - Overdue Open:  ${countOverdue}`);
  console.log(`Status History:    ${totalHistories}`);
  console.log(`Feedback Records:  ${totalFeedbacks}`);
  console.log(`Upvotes Cast:      ${totalUpvotes}`);
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
