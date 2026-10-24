import type {
  Category,
  ComplaintStatus,
  Department,
  Priority,
  StatusHistoryEntry,
  User,
} from "@/types";

export interface MockUser extends User {
  password: string;
  departmentId: number | null;
}

export interface MockImage {
  id: number;
  url: string;
  path: string;
}

export interface MockFeedback {
  rating: number;
  comment: string | null;
  createdAt: string;
  userId: number;
}

export interface MockComplaint {
  id: number;
  ticketCode: string;
  title: string;
  description: string;
  location: string;
  priority: Priority;
  status: ComplaintStatus;
  isAnonymous: boolean;
  categoryId: number;
  departmentId: number;
  createdById: number;
  assignedToId: number | null;
  aiCategoryName: string | null;
  aiPriority: Priority | null;
  aiConfidence: number | null;
  aiReason: string | null;
  dueAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: MockImage[];
  history: StatusHistoryEntry[];
  feedback: MockFeedback | null;
}

export interface MockUpvote {
  complaintId: number;
  userId: number;
}

export const DEPARTMENTS: Department[] = [
  {
    id: 1,
    name: "IT Services",
    email: "it@campusfix.edu",
    description: "Campus network, labs, projectors and software access.",
  },
  {
    id: 2,
    name: "Facilities & Maintenance",
    email: "facilities@campusfix.edu",
    description: "Electrical, plumbing, furniture and classroom infrastructure.",
  },
  {
    id: 3,
    name: "Housekeeping",
    email: "housekeeping@campusfix.edu",
    description: "Cleanliness, washrooms and waste management.",
  },
  {
    id: 4,
    name: "Transport",
    email: "transport@campusfix.edu",
    description: "College buses, routes and parking.",
  },
  {
    id: 5,
    name: "Hostel & Mess",
    email: "hostel@campusfix.edu",
    description: "Hostel rooms, mess and food quality.",
  },
  {
    id: 6,
    name: "Safety & Security",
    email: "security@campusfix.edu",
    description: "Campus security, access and emergency response.",
  },
];

export const CATEGORIES: Category[] = [
  {
    id: 1,
    name: "Wi-Fi & Network",
    description: "Campus Wi-Fi, LAN and connectivity outages.",
    icon: "wifi",
    slaHours: 24,
    department: { id: 1, name: "IT Services" },
  },
  {
    id: 2,
    name: "Computer Lab & Projectors",
    description: "Lab PCs, projectors and classroom AV.",
    icon: "monitor",
    slaHours: 48,
    department: { id: 1, name: "IT Services" },
  },
  {
    id: 3,
    name: "Electrical",
    description: "Fans, lights, switches, power sockets and outages.",
    icon: "zap",
    slaHours: 24,
    department: { id: 2, name: "Facilities & Maintenance" },
  },
  {
    id: 4,
    name: "Plumbing & Water",
    description: "Leaks, taps, pipes and water supply.",
    icon: "droplets",
    slaHours: 24,
    department: { id: 2, name: "Facilities & Maintenance" },
  },
  {
    id: 5,
    name: "Furniture & Infrastructure",
    description: "Broken chairs, desks, doors and fittings.",
    icon: "armchair",
    slaHours: 72,
    department: { id: 2, name: "Facilities & Maintenance" },
  },
  {
    id: 6,
    name: "Classroom Facilities",
    description: "Boards, AC, seating and classroom fixtures.",
    icon: "school",
    slaHours: 48,
    department: { id: 2, name: "Facilities & Maintenance" },
  },
  {
    id: 7,
    name: "Cleanliness",
    description: "Garbage, dust and general campus cleanliness.",
    icon: "sparkles",
    slaHours: 24,
    department: { id: 3, name: "Housekeeping" },
  },
  {
    id: 8,
    name: "Washrooms",
    description: "Restroom cleanliness, supplies and fittings.",
    icon: "bath",
    slaHours: 12,
    department: { id: 3, name: "Housekeeping" },
  },
  {
    id: 9,
    name: "Bus & Transport",
    description: "College bus delays, routes and parking.",
    icon: "bus",
    slaHours: 48,
    department: { id: 4, name: "Transport" },
  },
  {
    id: 10,
    name: "Hostel Rooms",
    description: "Hostel room fittings, beds and maintenance.",
    icon: "bed",
    slaHours: 48,
    department: { id: 5, name: "Hostel & Mess" },
  },
  {
    id: 11,
    name: "Mess & Food Quality",
    description: "Mess menu, food quality and canteen hygiene.",
    icon: "utensils",
    slaHours: 24,
    department: { id: 5, name: "Hostel & Mess" },
  },
  {
    id: 12,
    name: "Safety & Security",
    description: "Safety hazards, access control and security incidents.",
    icon: "shield-alert",
    slaHours: 4,
    department: { id: 6, name: "Safety & Security" },
  },
];

const created = "2026-07-01T08:00:00.000Z";

export const USERS: MockUser[] = [
  {
    id: 1,
    name: "Dr. Priya Sharma",
    email: "admin@campusfix.edu",
    password: "Admin@123",
    role: "ADMIN",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 2,
    name: "Ravi Krishnan",
    email: "it.staff@campusfix.edu",
    password: "Staff@123",
    role: "STAFF",
    department: { id: 1, name: "IT Services" },
    departmentId: 1,
    isActive: true,
    createdAt: created,
  },
  {
    id: 3,
    name: "Meera Nair",
    email: "facilities.staff@campusfix.edu",
    password: "Staff@123",
    role: "STAFF",
    department: { id: 2, name: "Facilities & Maintenance" },
    departmentId: 2,
    isActive: true,
    createdAt: created,
  },
  {
    id: 4,
    name: "Suresh Patil",
    email: "housekeeping.staff@campusfix.edu",
    password: "Staff@123",
    role: "STAFF",
    department: { id: 3, name: "Housekeeping" },
    departmentId: 3,
    isActive: true,
    createdAt: created,
  },
  {
    id: 5,
    name: "Imran Khan",
    email: "transport.staff@campusfix.edu",
    password: "Staff@123",
    role: "STAFF",
    department: { id: 4, name: "Transport" },
    departmentId: 4,
    isActive: true,
    createdAt: created,
  },
  {
    id: 6,
    name: "Divya Shetty",
    email: "hostel.staff@campusfix.edu",
    password: "Staff@123",
    role: "STAFF",
    department: { id: 5, name: "Hostel & Mess" },
    departmentId: 5,
    isActive: true,
    createdAt: created,
  },
  {
    id: 7,
    name: "Arjun Menon",
    email: "safety.staff@campusfix.edu",
    password: "Staff@123",
    role: "STAFF",
    department: { id: 6, name: "Safety & Security" },
    departmentId: 6,
    isActive: true,
    createdAt: created,
  },
  {
    id: 8,
    name: "Ananya Rao",
    email: "student@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 9,
    name: "Rohan Iyer",
    email: "rohan.iyer@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 10,
    name: "Kavya Reddy",
    email: "kavya.reddy@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 11,
    name: "Aditya Sharma",
    email: "aditya.sharma@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 12,
    name: "Sneha Kulkarni",
    email: "sneha.kulkarni@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 13,
    name: "Nikhil Joshi",
    email: "nikhil.joshi@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 14,
    name: "Pooja Desai",
    email: "pooja.desai@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 15,
    name: "Varun Gupta",
    email: "varun.gupta@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 16,
    name: "Aisha Khan",
    email: "aisha.khan@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 17,
    name: "Karthik Rao",
    email: "karthik.rao@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
  {
    id: 18,
    name: "Neha Pillai",
    email: "neha.pillai@campusfix.edu",
    password: "Student@123",
    role: "STUDENT",
    department: null,
    departmentId: null,
    isActive: true,
    createdAt: created,
  },
];

const STAFF_BY_DEPT: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
};

const STUDENT_IDS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function imageFor(categoryId: number, seed: number): string {
  return `https://picsum.photos/seed/campusfix-${categoryId}-${seed}/800/480`;
}

const IMG = {
  library: imageFor(1, 11),
  fan: imageFor(3, 12),
  water: imageFor(4, 13),
  washroom: imageFor(8, 14),
  lab: imageFor(2, 15),
};

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function iso(date: Date): string {
  return date.toISOString();
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function ticketCode(id: number): string {
  return `CMP-2026-${String(id).padStart(6, "0")}`;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

function staffRef(userId: number): StatusHistoryEntry["changedBy"] {
  const user = USERS.find((u) => u.id === userId);
  if (!user) {
    return { id: userId, name: "Staff", role: "STAFF" };
  }
  return { id: user.id, name: user.name, role: user.role };
}

function buildHistory(
  idStart: number,
  createdAt: Date,
  status: ComplaintStatus,
  creatorId: number,
  staffId: number | null,
  assigned: boolean,
): StatusHistoryEntry[] {
  const creator = staffRef(creatorId);
  const history: StatusHistoryEntry[] = [
    {
      id: idStart,
      fromStatus: null,
      toStatus: "SUBMITTED",
      note: "Complaint submitted",
      changedBy: creator,
      createdAt: iso(createdAt),
    },
  ];
  if (status === "SUBMITTED") return history;

  const staff = staffRef(staffId ?? 2);
  const inProgressAt = addHours(createdAt, 4 + (idStart % 10));
  if (assigned) {
    history.push({
      id: idStart + 1,
      fromStatus: "SUBMITTED",
      toStatus: "IN_PROGRESS",
      note: `Assigned to ${staff.name}`,
      changedBy: staff,
      createdAt: iso(inProgressAt),
    });
  } else {
    history.push({
      id: idStart + 1,
      fromStatus: "SUBMITTED",
      toStatus: "IN_PROGRESS",
      note: "Picked up by department staff",
      changedBy: staff,
      createdAt: iso(inProgressAt),
    });
  }

  if (status === "IN_PROGRESS") return history;

  if (status === "RESOLVED") {
    history.push({
      id: idStart + 2,
      fromStatus: "IN_PROGRESS",
      toStatus: "RESOLVED",
      note: "Issue verified and resolved on site.",
      changedBy: staff,
      createdAt: iso(addHours(inProgressAt, 8 + (idStart % 20))),
    });
    return history;
  }

  history.push({
    id: idStart + 2,
    fromStatus: "IN_PROGRESS",
    toStatus: "REJECTED",
    note: "Could not reproduce after two site visits. Please reopen with more detail if it happens again.",
    changedBy: staff,
    createdAt: iso(addHours(inProgressAt, 6)),
  });
  return history;
}

interface SeedSpec {
  title: string;
  description: string;
  location: string;
  categoryId: number;
  priority: Priority;
  status: ComplaintStatus;
  hoursAgo: number;
  createdById: number;
  anonymous?: boolean;
  images?: string[];
  upvotes?: number[];
  aiMatch?: boolean;
  aiSkip?: boolean;
  overdue?: boolean;
  feedback?: { rating: number; comment: string | null };
}

const SHOWCASE: SeedSpec[] = [
  {
    title: "Wi-Fi not working on Block C 2nd floor",
    description:
      "wifi not working in Block C 2nd floor since morning, can't download assignments. The whole corridor is offline.",
    location: "Block C, 2nd Floor",
    categoryId: 1,
    priority: "HIGH",
    status: "IN_PROGRESS",
    hoursAgo: 18,
    createdById: 9,
    images: [IMG.library],
    upvotes: [8, 10, 11, 12, 14, 16],
    aiMatch: true,
  },
  {
    title: "Block C 2F Wi-Fi keeps dropping every few minutes",
    description:
      "The Wi-Fi on Block C second floor connects then drops every 2-3 minutes. Happening since yesterday evening.",
    location: "Block C, 2nd Floor",
    categoryId: 1,
    priority: "HIGH",
    status: "SUBMITTED",
    hoursAgo: 10,
    createdById: 10,
    upvotes: [9, 11, 13],
    aiMatch: true,
  },
  {
    title: "No internet near Block C Room 214",
    description:
      "Cannot get campus Wi-Fi near Room 214 on Block C 2nd floor. Shows connected but no internet.",
    location: "Block C, Room 214",
    categoryId: 1,
    priority: "HIGH",
    status: "IN_PROGRESS",
    hoursAgo: 30,
    createdById: 11,
    images: [IMG.library],
    upvotes: [8, 9, 12],
    aiMatch: true,
  },
  {
    title: "Block C 3rd floor Wi-Fi completely down",
    description:
      "Wi-Fi in Block C third floor corridor and nearby classrooms has been down since Monday. Classes cannot use online quizzes.",
    location: "Block C, 3rd Floor corridor",
    categoryId: 1,
    priority: "HIGH",
    status: "IN_PROGRESS",
    hoursAgo: 52,
    createdById: 13,
    upvotes: [8, 9, 10, 11, 15, 16, 17],
    aiMatch: true,
  },
  {
    title: "No Wi-Fi in Block C Room 312",
    description:
      "Room 312 in Block C has no campus Wi-Fi. Neighbouring rooms work. Need this before Friday lab.",
    location: "Block C, Room 312",
    categoryId: 1,
    priority: "HIGH",
    status: "SUBMITTED",
    hoursAgo: 20,
    createdById: 14,
    upvotes: [13, 15],
    aiMatch: true,
  },
  {
    title: "Access point blinking red in Block C",
    description:
      "The Wi-Fi access point above the Block C staircase is blinking red and nobody can connect on that landing.",
    location: "Block C, East staircase",
    categoryId: 1,
    priority: "HIGH",
    status: "IN_PROGRESS",
    hoursAgo: 40,
    createdById: 16,
    upvotes: [10, 15],
    aiMatch: true,
  },
  {
    title: "Ceiling fans not working in Block A Room 204",
    description:
      "Both ceiling fans in Block A Room 204 have been dead since last week. The room gets unusable after 11am.",
    location: "Block A, Room 204",
    categoryId: 3,
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    hoursAgo: 70,
    createdById: 8,
    images: [IMG.fan],
    upvotes: [9, 10, 12],
    aiMatch: true,
    overdue: true,
  },
  {
    title: "Fan making a loud grinding noise in Block A 118",
    description:
      "The fan in Block A Room 118 is making a grinding noise and slowing down. Feels unsafe to sit under it.",
    location: "Block A, Room 118",
    categoryId: 3,
    priority: "HIGH",
    status: "SUBMITTED",
    hoursAgo: 16,
    createdById: 17,
    images: [IMG.fan],
    upvotes: [8, 12],
    aiMatch: true,
  },
  {
    title: "No power to fans and lights in Block A corridor",
    description:
      "Half the Block A first-floor corridor has no power. Fans and tube lights are out since last night.",
    location: "Block A, 1st Floor corridor",
    categoryId: 3,
    priority: "HIGH",
    status: "IN_PROGRESS",
    hoursAgo: 28,
    createdById: 9,
    overdue: true,
    aiMatch: true,
  },
  {
    title: "Broken regulator, fan stuck on high in Block A 210",
    description:
      "Fan regulator is broken in Block A 210 so the fan is stuck on the highest speed. Very distracting during lectures.",
    location: "Block A, Room 210",
    categoryId: 3,
    priority: "LOW",
    status: "SUBMITTED",
    hoursAgo: 6,
    createdById: 18,
    aiMatch: true,
  },
  {
    title: "No water in Boys Hostel B since morning",
    description:
      "There has been no water in Boys Hostel B bathrooms and drinking points since 6am. Please send a plumber.",
    location: "Boys Hostel B, Ground Floor",
    categoryId: 4,
    priority: "HIGH",
    status: "IN_PROGRESS",
    hoursAgo: 9,
    createdById: 11,
    images: [IMG.water],
    upvotes: [8, 9, 13, 15, 17],
    aiMatch: true,
  },
  {
    title: "Water leaking from the ceiling in Hostel B 112",
    description:
      "Water is leaking from the ceiling near the window in Boys Hostel B Room 112. The bed and books got wet last night.",
    location: "Boys Hostel B, Room 112",
    categoryId: 10,
    priority: "HIGH",
    status: "SUBMITTED",
    hoursAgo: 12,
    createdById: 13,
    images: [IMG.water],
    upvotes: [11, 15],
    aiMatch: true,
  },
  {
    title: "Hostel B tap running continuously",
    description:
      "The washbasin tap in Hostel B room 112 will not close. Water has been running all night and the floor is wet.",
    location: "Boys Hostel B, Room 112",
    categoryId: 4,
    priority: "MEDIUM",
    status: "SUBMITTED",
    hoursAgo: 7,
    createdById: 15,
    aiMatch: true,
  },
  {
    title: "Sparks coming from the switchboard in Lab 3",
    description:
      "Sparks coming from the switchboard in CSE Lab 3 when we turned on the projector. Smells like burning plastic.",
    location: "CSE Lab 3",
    categoryId: 12,
    priority: "CRITICAL",
    status: "IN_PROGRESS",
    hoursAgo: 5,
    createdById: 8,
    images: [IMG.lab],
    upvotes: [9, 10, 11, 12],
    aiMatch: true,
  },
];

const FILLER_TITLES: { categoryId: number; title: string; description: string; location: string; priority: Priority }[] =
  [
    {
      categoryId: 2,
      title: "Projector in Auditorium shows a pink tint",
      description: "The auditorium projector has a heavy pink tint. Slides are hard to read from the back.",
      location: "Auditorium",
      priority: "MEDIUM",
    },
    {
      categoryId: 2,
      title: "CSE Lab 3 PCs will not boot",
      description: "Six PCs in CSE Lab 3 stay on a black screen after the logo. Lab session was cancelled.",
      location: "CSE Lab 3",
      priority: "HIGH",
    },
    {
      categoryId: 5,
      title: "Broken bench in Parking Lot 2",
      description: "The wooden bench near Parking Lot 2 has a cracked plank. Someone could get hurt.",
      location: "Parking Lot 2",
      priority: "LOW",
    },
    {
      categoryId: 6,
      title: "AC not cooling in Block A 204",
      description: "The AC in Block A Room 204 blows warm air. Afternoon classes are very uncomfortable.",
      location: "Block A, Room 204",
      priority: "MEDIUM",
    },
    {
      categoryId: 7,
      title: "Garbage piled behind Main Canteen",
      description: "Garbage bags have been sitting behind the main canteen since Sunday. Strong smell now.",
      location: "Main Canteen",
      priority: "HIGH",
    },
    {
      categoryId: 8,
      title: "Block A washroom has no soap or water",
      description: "The Block A ground-floor washroom has empty soap dispensers and almost no water in the taps.",
      location: "Block A, Ground Floor washroom",
      priority: "HIGH",
    },
    {
      categoryId: 8,
      title: "Library washroom lock is broken",
      description: "The lock on the first stall in the library washroom is broken. Please replace it.",
      location: "Central Library, Ground Floor",
      priority: "MEDIUM",
    },
    {
      categoryId: 9,
      title: "Bus Route 7 skipped the Yelahanka stop",
      description: "Route 7 did not stop at Yelahanka this morning. About 15 students were left behind.",
      location: "Bus Route 7 (Yelahanka)",
      priority: "HIGH",
    },
    {
      categoryId: 9,
      title: "College bus AC not working on Route 7",
      description: "The AC on the Route 7 evening bus has not worked all week. The ride is unbearable.",
      location: "Bus Route 7 (Yelahanka)",
      priority: "MEDIUM",
    },
    {
      categoryId: 11,
      title: "Hair found in the mess dal twice this week",
      description: "Found hair in the hostel mess dal on Tuesday and again today. Please check kitchen hygiene.",
      location: "Boys Hostel B, Mess",
      priority: "HIGH",
    },
    {
      categoryId: 11,
      title: "Main Canteen served stale samosas",
      description: "Samosas at the main canteen tasted stale at 4pm and a few students felt sick.",
      location: "Main Canteen",
      priority: "HIGH",
    },
    {
      categoryId: 7,
      title: "Dustbins overflowing near the Auditorium",
      description: "Dustbins outside the auditorium are overflowing and birds are tearing the bags.",
      location: "Auditorium",
      priority: "MEDIUM",
    },
    {
      categoryId: 5,
      title: "Classroom chair wobbles badly in Block C 210",
      description: "Most chairs in Block C 210 wobble. One already collapsed during a tutorial.",
      location: "Block C, Room 210",
      priority: "MEDIUM",
    },
    {
      categoryId: 6,
      title: "Whiteboard markers dry in almost every Block A room",
      description: "Please restock whiteboard markers in Block A. We have been using phone notes in class.",
      location: "Block A, Room 118",
      priority: "LOW",
    },
    {
      categoryId: 12,
      title: "Broken street light near Parking Lot 2",
      description: "The street light near Parking Lot 2 is out. The area is very dark after 7pm.",
      location: "Parking Lot 2",
      priority: "HIGH",
    },
    {
      categoryId: 4,
      title: "Drinking water cooler leaking in Block C",
      description: "The drinking water cooler on Block C 2nd floor is leaking and making a puddle.",
      location: "Block C, 2nd Floor",
      priority: "MEDIUM",
    },
    {
      categoryId: 10,
      title: "Hostel bed frame cracked in Girls Hostel A 305",
      description: "The bed frame in Girls Hostel A Room 305 is cracked on one side and sinks in the middle.",
      location: "Girls Hostel A, Room 305",
      priority: "MEDIUM",
    },
    {
      categoryId: 2,
      title: "HDMI port loose on the Auditorium podium",
      description: "The podium HDMI port in the auditorium is loose. Guest laptops keep disconnecting.",
      location: "Auditorium",
      priority: "LOW",
    },
    {
      categoryId: 3,
      title: "Tube light flickering in CSE Lab 3",
      description: "The middle row of tube lights in CSE Lab 3 flickers constantly and is giving people headaches.",
      location: "CSE Lab 3",
      priority: "MEDIUM",
    },
    {
      categoryId: 8,
      title: "Washroom drain clogged in Block C",
      description: "The Block C 3rd floor washroom drain is clogged and water is pooling on the floor.",
      location: "Block C, 3rd Floor washroom",
      priority: "HIGH",
    },
  ];

function buildComplaints(): { complaints: MockComplaint[]; upvotes: MockUpvote[] } {
  const rng = mulberry32(20261024);
  const complaints: MockComplaint[] = [];
  const upvotes: MockUpvote[] = [];
  let historyId = 1;
  let imageId = 1;

  const statuses: ComplaintStatus[] = [
    ...Array.from({ length: 15 }, () => "SUBMITTED" as const),
    ...Array.from({ length: 18 }, () => "IN_PROGRESS" as const),
    ...Array.from({ length: 21 }, () => "RESOLVED" as const),
    ...Array.from({ length: 6 }, () => "REJECTED" as const),
  ];

  const specs: SeedSpec[] = [...SHOWCASE];
  let statusIndex = SHOWCASE.length;
  FILLER_TITLES.forEach((item, i) => {
    const status = statuses[statusIndex] ?? "RESOLVED";
    statusIndex += 1;
    specs.push({
      ...item,
      status,
      hoursAgo: 6 + Math.floor(rng() * 700),
      createdById: pick(rng, STUDENT_IDS),
      anonymous: rng() < 0.08,
      aiMatch: rng() < 0.85,
      aiSkip: rng() < 0.2,
      overdue: status === "SUBMITTED" || status === "IN_PROGRESS" ? rng() < 0.18 : false,
      upvotes:
        status === "RESOLVED" || status === "REJECTED"
          ? []
          : STUDENT_IDS.filter(() => rng() < 0.25),
      feedback:
        status === "RESOLVED" && rng() < 0.7
          ? {
              rating: 3 + Math.floor(rng() * 3),
              comment: rng() < 0.5 ? "Resolved, thank you." : null,
            }
          : undefined,
      images: [imageFor(item.categoryId, 200 + i)],
    });
    void i;
  });

  while (specs.length < 60) {
    const item = pick(rng, FILLER_TITLES);
    const status = statuses[specs.length] ?? "RESOLVED";
    specs.push({
      title: `${item.title} (${specs.length + 1})`,
      description: item.description,
      location: item.location,
      categoryId: item.categoryId,
      priority: item.priority,
      status,
      hoursAgo: 8 + Math.floor(rng() * 680),
      createdById: pick(rng, STUDENT_IDS),
      aiMatch: rng() < 0.85,
      aiSkip: rng() < 0.2,
      overdue: (status === "SUBMITTED" || status === "IN_PROGRESS") && rng() < 0.2,
    });
  }

  specs.slice(0, 60).forEach((spec, index) => {
    const id = index + 1;
    const category = CATEGORIES.find((c) => c.id === spec.categoryId) ?? CATEGORIES[0];
    const createdAt = hoursAgo(spec.hoursAgo);
    let dueAt = addHours(createdAt, category.slaHours);
    if (spec.overdue && (spec.status === "SUBMITTED" || spec.status === "IN_PROGRESS")) {
      dueAt = hoursAgo(6 + (id % 20));
    }
    const assignedToId =
      spec.status === "SUBMITTED" ? null : (STAFF_BY_DEPT[category.department.id] ?? null);
    const resolvedAt =
      spec.status === "RESOLVED" ? addHours(createdAt, 6 + (id % 48)) : null;
    const aiCategoryName = spec.aiSkip
      ? null
      : spec.aiMatch
        ? category.name
        : pick(
            rng,
            CATEGORIES.filter((c) => c.id !== category.id),
          ).name;
    const aiPriority = spec.aiSkip ? null : spec.aiMatch ? spec.priority : pick(rng, ["LOW", "MEDIUM", "HIGH"] as Priority[]);

    const history = buildHistory(
      historyId,
      createdAt,
      spec.status,
      spec.createdById,
      assignedToId,
      Boolean(assignedToId),
    );
    historyId += history.length;

    const images = (spec.images ?? [imageFor(category.id, id)]).map((url) => {
      const row = { id: imageId, url, path: "" };
      imageId += 1;
      return row;
    });

    const complaint: MockComplaint = {
      id,
      ticketCode: ticketCode(id),
      title: spec.title,
      description: spec.description,
      location: spec.location,
      priority: spec.priority,
      status: spec.status,
      isAnonymous: Boolean(spec.anonymous),
      categoryId: category.id,
      departmentId: category.department.id,
      createdById: spec.createdById,
      assignedToId,
      aiCategoryName,
      aiPriority,
      aiConfidence: spec.aiSkip ? null : spec.aiMatch ? 0.86 + (id % 10) / 100 : 0.54,
      aiReason: spec.aiSkip
        ? null
        : spec.aiMatch
          ? `Looks like a ${category.name.toLowerCase()} issue based on the description and location.`
          : "Suggested using keyword matching.",
      dueAt: iso(dueAt),
      resolvedAt: resolvedAt ? iso(resolvedAt) : null,
      createdAt: iso(createdAt),
      updatedAt: iso(resolvedAt ?? addHours(createdAt, spec.status === "SUBMITTED" ? 0 : 5)),
      images,
      history,
      feedback:
        spec.status === "RESOLVED" && spec.feedback
          ? {
              rating: spec.feedback.rating,
              comment: spec.feedback.comment,
              createdAt: iso(addHours(resolvedAt ?? createdAt, 5)),
              userId: spec.createdById,
            }
          : spec.status === "RESOLVED" && !SHOWCASE.includes(spec) && id % 3 !== 0
            ? {
                rating: 4,
                comment: "Fixed faster than I expected.",
                createdAt: iso(addHours(resolvedAt ?? createdAt, 4)),
                userId: spec.createdById,
              }
            : null,
    };

    complaints.push(complaint);
    (spec.upvotes ?? []).forEach((userId) => {
      if (userId !== spec.createdById) {
        upvotes.push({ complaintId: id, userId });
      }
    });
  });

  return { complaints, upvotes };
}

const seeded = buildComplaints();

export interface MockStore {
  users: MockUser[];
  departments: Department[];
  categories: Category[];
  complaints: MockComplaint[];
  upvotes: MockUpvote[];
  nextUserId: number;
  nextComplaintId: number;
  nextImageId: number;
  nextHistoryId: number;
  nextDepartmentId: number;
  nextCategoryId: number;
}

export const store: MockStore = {
  users: USERS.map((user) => ({ ...user })),
  departments: DEPARTMENTS.map((dept) => ({ ...dept })),
  categories: CATEGORIES.map((category) => ({ ...category })),
  complaints: seeded.complaints,
  upvotes: seeded.upvotes,
  nextUserId: USERS.length + 1,
  nextComplaintId: seeded.complaints.length + 1,
  nextImageId: 40,
  nextHistoryId: 400,
  nextDepartmentId: DEPARTMENTS.length + 1,
  nextCategoryId: CATEGORIES.length + 1,
};

export function toPublicUser(user: MockUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

export function findCategory(id: number): Category | undefined {
  return store.categories.find((category) => category.id === id);
}

export function findDepartment(id: number): Department | undefined {
  return store.departments.find((department) => department.id === id);
}

export function findUser(id: number): MockUser | undefined {
  return store.users.find((user) => user.id === id);
}

export function staffInDepartment(departmentId: number): MockUser[] {
  return store.users.filter(
    (user) => user.role === "STAFF" && user.departmentId === departmentId && user.isActive,
  );
}
