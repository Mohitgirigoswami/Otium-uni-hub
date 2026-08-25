import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Otium University Hub database...");

  // Clean existing tables in order
  await prisma.attendanceRecord.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.semesterCGPA.deleteMany();
  await prisma.rideShareBooking.deleteMany();
  await prisma.rideShare.deleteMany();
  await prisma.lostAndFoundItem.deleteMany();
  await prisma.marketplaceItem.deleteMany();
  await prisma.taskGig.deleteMany();
  await prisma.incognitoPost.deleteMany();
  await prisma.incognitoProfile.deleteMany();
  await prisma.printOrder.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      id: "usr_aarav_sharma",
      name: "Aarav Sharma",
      email: "aarav.sharma@uni.edu",
      department: "Computer Science & Engineering",
      year: 3,
      phone: "+91 98765 43210",
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      incognitoProfile: {
        create: {
          handle: "CyberHawk_99",
          avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=CyberHawk_99",
        },
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      id: "usr_priya_patel",
      name: "Priya Patel",
      email: "priya.patel@uni.edu",
      department: "Design & Interaction",
      year: 4,
      phone: "+91 98111 22334",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      incognitoProfile: {
        create: {
          handle: "PixelSorceress",
          avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=PixelSorceress",
        },
      },
    },
  });

  const user3 = await prisma.user.create({
    data: {
      id: "usr_rohan_verma",
      name: "Rohan Verma",
      email: "rohan.v@uni.edu",
      department: "Mechanical Engineering",
      year: 2,
      phone: "+91 97234 56789",
      image: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      incognitoProfile: {
        create: {
          handle: "TurboMech_07",
          avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=TurboMech_07",
        },
      },
    },
  });

  const user4 = await prisma.user.create({
    data: {
      id: "usr_sneha_reddy",
      name: "Sneha Reddy",
      email: "sneha.reddy@uni.edu",
      department: "Biotechnology & Data",
      year: 3,
      phone: "+91 96543 21098",
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      incognitoProfile: {
        create: {
          handle: "BioQuantum",
          avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=BioQuantum",
        },
      },
    },
  });

  // Seed Task Gigs (Assignments & Projects Hub)
  await prisma.taskGig.createMany({
    data: [
      {
        title: "Build Distributed Key-Value Store in Go",
        description: "Need help implementing Raft consensus algorithm and gRPC interfaces for the CSE 402 final project. Must have unit tests.",
        budget: 450000, // ₹4,500.00
        category: "CODING",
        status: "OPEN",
        posterId: user2.id,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Figma UI/UX Mockups for Campus Hackathon",
        description: "Looking for a UI designer to craft 8 mobile screens for an AI nutrition tracking app before Saturday demo pitch.",
        budget: 250000, // ₹2,500.00
        category: "DESIGN",
        status: "OPEN",
        posterId: user3.id,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Thermodynamics Lab Report 4 Data Analysis",
        description: "Format MATLAB charts, compute thermal efficiency tables, and draft discussion section for Brayton cycle experiment.",
        budget: 120000, // ₹1,200.00
        category: "ASSIGNMENT",
        status: "ASSIGNED",
        posterId: user1.id,
        assignedToId: user3.id,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        title: "Research Paper Summary: CRISPR Gene Drives",
        description: "Produce a 5-page synthesis comparing three recent Nature publications on ethical governance of gene editing.",
        budget: 180000, // ₹1,800.00
        category: "RESEARCH",
        status: "COMPLETED",
        posterId: user4.id,
        assignedToId: user1.id,
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // Seed Attendance Subjects for Aarav
  const sub1 = await prisma.subject.create({
    data: {
      userId: user1.id,
      name: "Distributed Systems",
      code: "CSE-402",
      totalClasses: 32,
      attendedClasses: 21, // 65.6% -> DANGER: needs 12 consecutive classes
    },
  });

  const sub2 = await prisma.subject.create({
    data: {
      userId: user1.id,
      name: "Database Engineering",
      code: "CSE-305",
      totalClasses: 40,
      attendedClasses: 36, // 90% -> SAFE: can bunk 8 classes
    },
  });

  const sub3 = await prisma.subject.create({
    data: {
      userId: user1.id,
      name: "Computer Networks & Security",
      code: "CSE-310",
      totalClasses: 28,
      attendedClasses: 20, // 71.4% -> DANGER: needs 4 consecutive classes
    },
  });

  const sub4 = await prisma.subject.create({
    data: {
      userId: user1.id,
      name: "Machine Learning & AI",
      code: "CSE-450",
      totalClasses: 35,
      attendedClasses: 31, // 88.6% -> SAFE: can bunk 6 classes
    },
  });

  // Seed CGPA Semesters
  await prisma.semesterCGPA.createMany({
    data: [
      {
        userId: user1.id,
        semester: 1,
        gpa: 8.8,
        totalCredits: 22,
        courses: JSON.stringify([
          { id: "1", name: "Engineering Math I", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "2", name: "Physics for Computing", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "3", name: "Problem Solving with C", credits: 4, gradePoint: 10, gradeLabel: "O" },
          { id: "4", name: "Basic Electrical Engg", credits: 3, gradePoint: 8, gradeLabel: "A" },
          { id: "5", name: "Communication Skills", credits: 3, gradePoint: 8, gradeLabel: "A" },
          { id: "6", name: "Computing Workshop", credits: 4, gradePoint: 9, gradeLabel: "A+" },
        ]),
      },
      {
        userId: user1.id,
        semester: 2,
        gpa: 9.1,
        totalCredits: 24,
        courses: JSON.stringify([
          { id: "1", name: "Data Structures & Algorithms", credits: 4, gradePoint: 10, gradeLabel: "O" },
          { id: "2", name: "Engineering Math II", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "3", name: "Digital Logic Design", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "4", name: "Object Oriented Java", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "5", name: "Environmental Science", credits: 2, gradePoint: 8, gradeLabel: "A" },
          { id: "6", name: "Data Structures Lab", credits: 6, gradePoint: 10, gradeLabel: "O" },
        ]),
      },
      {
        userId: user1.id,
        semester: 3,
        gpa: 8.95,
        totalCredits: 23,
        courses: JSON.stringify([
          { id: "1", name: "Design & Analysis of Algorithms", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "2", name: "Computer Architecture", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "3", name: "Discrete Mathematics", credits: 4, gradePoint: 9, gradeLabel: "A+" },
          { id: "4", name: "Theory of Computation", credits: 4, gradePoint: 8, gradeLabel: "A" },
          { id: "5", name: "Algorithms Lab", credits: 4, gradePoint: 10, gradeLabel: "O" },
          { id: "6", name: "Microprocessor Lab", credits: 3, gradePoint: 9, gradeLabel: "A+" },
        ]),
      },
    ],
  });

  // Seed Lost and Found Items
  await prisma.lostAndFoundItem.createMany({
    data: [
      {
        finderId: user2.id,
        title: "Sony WH-1000XM4 Noise Cancelling Headphones",
        description: "Found in Central Library 2nd Floor Silent Zone, Table 14. Left in black protective case.",
        locationFound: "Central Library 2nd Floor",
        dateFound: new Date(Date.now() - 4 * 60 * 60 * 1000),
        imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80",
        category: "ELECTRONICS",
        status: "UNCLAIMED",
      },
      {
        finderId: user3.id,
        title: "Casio fx-991EX Scientific Calculator",
        description: "Found in Mechanical Dept Workshop Bench #3 after morning session.",
        locationFound: "Mechanical Dept Workshop",
        dateFound: new Date(Date.now() - 12 * 60 * 60 * 1000),
        imageUrl: "https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?w=600&auto=format&fit=crop&q=80",
        category: "ELECTRONICS",
        status: "UNCLAIMED",
      },
      {
        finderId: user4.id,
        title: "Official Student ID Card & Gym Key",
        description: "Found near Campus Cafeteria outdoor seating area.",
        locationFound: "Campus Cafeteria",
        dateFound: new Date(Date.now() - 24 * 60 * 60 * 1000),
        imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
        category: "ID_CARD",
        status: "CLAIMED",
        claimNotes: "Returned to student in Block B Hostel.",
      },
    ],
  });

  // Seed Ride Shares (Auto-sorted by closest departure)
  const departure1 = new Date(Date.now() + 4 * 60 * 60 * 1000); // in 4 hours
  const departure2 = new Date(Date.now() + 18 * 60 * 60 * 1000); // tomorrow morning
  const departure3 = new Date(Date.now() + 28 * 60 * 60 * 1000); // tomorrow evening

  const ride1 = await prisma.rideShare.create({
    data: {
      hostId: user1.id,
      origin: "Hostel Block 4 Gate",
      destination: "Kempegowda International Airport (BLR)",
      departureTime: departure1,
      availableSeats: 2,
      totalSeats: 4,
      splitCostEstimate: 35000, // ₹350.00 / seat
      cabProvider: "Uber XL",
      status: "OPEN",
    },
  });

  await prisma.rideShareBooking.create({
    data: {
      rideId: ride1.id,
      passengerId: user4.id,
      seatsBooked: 1,
    },
  });

  await prisma.rideShare.create({
    data: {
      hostId: user3.id,
      origin: "Campus Main Gate",
      destination: "Central Railway Junction (SBC)",
      departureTime: departure2,
      availableSeats: 3,
      totalSeats: 4,
      splitCostEstimate: 12000, // ₹120.00 / seat
      cabProvider: "BluSmart EV",
      status: "OPEN",
    },
  });

  await prisma.rideShare.create({
    data: {
      hostId: user2.id,
      origin: "Girls Hostel Complex",
      destination: "Nexus Mall & IMAX Cinemas",
      departureTime: departure3,
      availableSeats: 1,
      totalSeats: 3,
      splitCostEstimate: 8000, // ₹80.00 / seat
      cabProvider: "Auto Split",
      status: "OPEN",
    },
  });

  // Seed Incognito Wall Posts
  const profile1 = await prisma.incognitoProfile.findUnique({ where: { userId: user1.id } });
  const profile2 = await prisma.incognitoProfile.findUnique({ where: { userId: user2.id } });
  const profile3 = await prisma.incognitoProfile.findUnique({ where: { userId: user3.id } });
  const profile4 = await prisma.incognitoProfile.findUnique({ where: { userId: user4.id } });

  if (profile1 && profile2 && profile3 && profile4) {
    await prisma.incognitoPost.createMany({
      data: [
        {
          profileId: profile2.id,
          content: "Pro-tip for freshers: Prof. Iyer in Algorithms always repeats questions from the 2022 midterm on Quiz 2. Thank me later! 📚✨",
          feedType: "ADVICE",
          likesCount: 42,
        },
        {
          profileId: profile3.id,
          content: "Whoever keeps leaving their unwashed protein shakers on Table 3 in the gym: the entire campus is formally requesting you to stop. 💀🤢",
          feedType: "MEME",
          likesCount: 88,
        },
        {
          profileId: profile4.id,
          content: "Hot take: The new 3rd floor library seating with bean bags is the best thing the college administration has done in 4 years. ☕💯",
          feedType: "GENERAL",
          likesCount: 31,
        },
        {
          profileId: profile1.id,
          content: "Confession: I accidentally answered an entire DSP exam using Laplace transforms instead of Z-transforms, somehow got an A-, and now I fear my professor thinks I am a genius. 🤫😂",
          feedType: "CONFESSION",
          likesCount: 119,
        },
      ],
    });
  }

  // Seed Marketplace Items (strictly stored in Paise)
  await prisma.marketplaceItem.createMany({
    data: [
      {
        sellerId: user2.id,
        title: "Calculus: Early Transcendentals (James Stewart 9th Ed)",
        description: "Hardcover, mint condition with no markings or highlights. Essential for 1st/2nd year engineering mathematics.",
        price: 85000, // ₹850.00
        category: "BOOKS_NOTES",
        condition: "LIKE_NEW",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
        ]),
        status: "AVAILABLE",
      },
      {
        sellerId: user3.id,
        title: "Hero Sprint 21-Speed Mountain Gear Bicycle",
        description: "6 months old, includes combination lock, front LED headlight, and rear carrier. Perfect for cross-campus commute.",
        price: 420000, // ₹4,200.00
        category: "CYCLES_TRANSPORT",
        condition: "GOOD",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80",
        ]),
        status: "AVAILABLE",
      },
      {
        sellerId: user4.id,
        title: "Arduino & Raspberry Pi IoT Sensors Mega Starter Kit",
        description: "Includes Uno R3, ESP32, OLED displays, ultrasonic sensors, stepper motors, and 100+ jumper wires in plastic organizer box.",
        price: 190000, // ₹1,900.00
        category: "ELECTRONICS",
        condition: "BRAND_NEW",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600&auto=format&fit=crop&q=80",
        ]),
        status: "AVAILABLE",
      },
      {
        sellerId: user1.id,
        title: "Ergonomic Mesh Desk Chair for Hostel Room",
        description: "Adjustable lumbar support, pneumatic height lift, smooth rolling casters. Clean and sturdy.",
        price: 150000, // ₹1,500.00
        category: "FURNITURE",
        condition: "GOOD",
        images: JSON.stringify([
          "https://images.unsplash.com/photo-1580481077197-724f114c000e?w=600&auto=format&fit=crop&q=80",
        ]),
        status: "AVAILABLE",
      },
    ],
  });

  // Seed Print Orders
  await prisma.printOrder.create({
    data: {
      userId: user1.id,
      fileName: "CSE402_Distributed_Algorithms_Syllabus.pdf",
      pageCount: 14,
      printType: "BW_DOUBLE",
      deliveryLocation: "Hostel Block 4, Room 312",
      expectedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000),
      totalCost: 2100, // 14 * 150 = 2100 paise (₹21.00)
      status: "PRINTING",
    },
  });

  console.log("✅ Otium database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
