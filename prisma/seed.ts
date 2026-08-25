import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Otium University Hub database on Supabase PostgreSQL...");

  // Clean existing tables safely
  try {
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
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
  } catch (e) {
    console.log("Cleanup note:", e);
  }

  // Create Users
  const user1 = await prisma.user.upsert({
    where: { id: "usr_aarav_sharma" },
    update: {},
    create: {
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

  const user2 = await prisma.user.upsert({
    where: { id: "usr_priya_patel" },
    update: {},
    create: {
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

  const user3 = await prisma.user.upsert({
    where: { id: "usr_rohan_verma" },
    update: {},
    create: {
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

  const user4 = await prisma.user.upsert({
    where: { id: "usr_sneha_reddy" },
    update: {},
    create: {
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

  // Seed Task Gigs
  await prisma.taskGig.create({
    data: {
      title: "Build Distributed Key-Value Store in Go",
      description: "Need help implementing Raft consensus algorithm and gRPC interfaces for the CSE 402 final project. Must have unit tests.",
      budget: 450000,
      category: "CODING",
      status: "OPEN",
      posterId: user2.id,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.taskGig.create({
    data: {
      title: "Figma UI/UX Mockups for Campus Hackathon",
      description: "Looking for a UI designer to craft 8 mobile screens for an AI nutrition tracking app before Saturday demo pitch.",
      budget: 250000,
      category: "DESIGN",
      status: "OPEN",
      posterId: user3.id,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.taskGig.create({
    data: {
      title: "Thermodynamics Lab Report 4 Data Analysis",
      description: "Format MATLAB charts, compute thermal efficiency tables, and draft discussion section for Brayton cycle experiment.",
      budget: 120000,
      category: "ASSIGNMENT",
      status: "ASSIGNED",
      posterId: user1.id,
      assignedToId: user3.id,
      deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed Subjects for Aarav
  await prisma.subject.create({
    data: {
      userId: user1.id,
      name: "Distributed Systems",
      code: "CSE-402",
      totalClasses: 32,
      attendedClasses: 21,
    },
  });

  await prisma.subject.create({
    data: {
      userId: user1.id,
      name: "Database Engineering",
      code: "CSE-305",
      totalClasses: 40,
      attendedClasses: 36,
    },
  });

  await prisma.subject.create({
    data: {
      userId: user1.id,
      name: "Computer Networks & Security",
      code: "CSE-310",
      totalClasses: 28,
      attendedClasses: 20,
    },
  });

  // Seed CGPA
  await prisma.semesterCGPA.create({
    data: {
      userId: user1.id,
      semester: 1,
      gpa: 8.8,
      totalCredits: 22,
      courses: JSON.stringify([
        { id: "1", name: "Engineering Math I", credits: 4, gradePoint: 9, gradeLabel: "A+" },
        { id: "2", name: "Physics for Computing", credits: 4, gradePoint: 9, gradeLabel: "A+" },
        { id: "3", name: "Problem Solving with C", credits: 4, gradePoint: 10, gradeLabel: "O" },
      ]),
    },
  });

  await prisma.semesterCGPA.create({
    data: {
      userId: user1.id,
      semester: 2,
      gpa: 9.1,
      totalCredits: 24,
      courses: JSON.stringify([
        { id: "1", name: "Data Structures & Algorithms", credits: 4, gradePoint: 10, gradeLabel: "O" },
        { id: "2", name: "Engineering Math II", credits: 4, gradePoint: 9, gradeLabel: "A+" },
      ]),
    },
  });

  // Seed Lost and Found
  await prisma.lostAndFoundItem.create({
    data: {
      finderId: user2.id,
      title: "Sony WH-1000XM4 Noise Cancelling Headphones",
      description: "Found in Central Library 2nd Floor Silent Zone, Table 14. Left in black protective case.",
      locationFound: "Central Library 2nd Floor",
      dateFound: new Date(Date.now() - 4 * 60 * 60 * 1000),
      imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80",
      category: "ELECTRONICS",
      status: "UNCLAIMED",
    },
  });

  await prisma.lostAndFoundItem.create({
    data: {
      finderId: user3.id,
      title: "Casio fx-991EX Scientific Calculator",
      description: "Found in Mechanical Dept Workshop Bench #3 after morning session.",
      locationFound: "Mechanical Dept Workshop",
      dateFound: new Date(Date.now() - 12 * 60 * 60 * 1000),
      imageUrl: "https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?w=600&auto=format&fit=crop&q=80",
      category: "ELECTRONICS",
      status: "UNCLAIMED",
    },
  });

  // Seed Ride Shares
  await prisma.rideShare.create({
    data: {
      hostId: user1.id,
      origin: "Hostel Block 4 Gate",
      destination: "Kempegowda International Airport (BLR)",
      departureTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
      availableSeats: 2,
      totalSeats: 4,
      splitCostEstimate: 35000,
      cabProvider: "Uber XL",
      status: "OPEN",
    },
  });

  await prisma.rideShare.create({
    data: {
      hostId: user3.id,
      origin: "Campus Main Gate",
      destination: "Central Railway Junction (SBC)",
      departureTime: new Date(Date.now() + 18 * 60 * 60 * 1000),
      availableSeats: 3,
      totalSeats: 4,
      splitCostEstimate: 12000,
      cabProvider: "BluSmart EV",
      status: "OPEN",
    },
  });

  // Seed Incognito Whispers
  const p1 = await prisma.incognitoProfile.findUnique({ where: { userId: user1.id } });
  const p2 = await prisma.incognitoProfile.findUnique({ where: { userId: user2.id } });

  if (p1 && p2) {
    await prisma.incognitoPost.create({
      data: {
        profileId: p2.id,
        content: "Pro-tip for freshers: Prof. Iyer in Algorithms always repeats questions from the 2022 midterm on Quiz 2. Thank me later! 📚✨",
        feedType: "ADVICE",
        likesCount: 42,
      },
    });

    await prisma.incognitoPost.create({
      data: {
        profileId: p1.id,
        content: "Confession: I accidentally answered an entire DSP exam using Laplace transforms instead of Z-transforms, somehow got an A-, and now I fear my professor thinks I am a genius. 🤫😂",
        feedType: "CONFESSION",
        likesCount: 119,
      },
    });
  }

  // Seed Marketplace
  await prisma.marketplaceItem.create({
    data: {
      sellerId: user2.id,
      title: "Calculus: Early Transcendentals (James Stewart 9th Ed)",
      description: "Hardcover, mint condition with no markings or highlights. Essential for 1st/2nd year engineering mathematics.",
      price: 85000,
      category: "BOOKS_NOTES",
      condition: "LIKE_NEW",
      images: [
        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
      ],
      status: "AVAILABLE",
    },
  });

  await prisma.marketplaceItem.create({
    data: {
      sellerId: user3.id,
      title: "Hero Sprint 21-Speed Mountain Gear Bicycle",
      description: "6 months old, includes combination lock, front LED headlight, and rear carrier. Perfect for cross-campus commute.",
      price: 420000,
      category: "CYCLES_TRANSPORT",
      condition: "GOOD",
      images: [
        "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80",
      ],
      status: "AVAILABLE",
    },
  });

  // Seed Admin Operator User
  const adminUser = await prisma.user.upsert({
    where: { id: "usr_admin_operator" },
    update: {},
    create: {
      id: "usr_admin_operator",
      name: "Campus Print Operator",
      email: "admin.print@uni.edu",
      role: "ADMIN",
      department: "Campus Printing & IT Services",
      year: 0,
      phone: "+91 99999 00000",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
      incognitoProfile: {
        create: {
          handle: "AdminConsole",
          avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=AdminConsole",
        },
      },
    },
  });

  // Seed Direct Conversation between Aarav and Priya
  const conv1 = await prisma.conversation.create({
    data: {
      participantOneId: user1.id,
      participantTwoId: user2.id,
      isAnonymousChat: false,
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: user2.id,
      content: "Hey Aarav! Saw your coding gig for the distributed key-value store. Can you clarify if Raft heartbeats need gRPC stream RPCs?",
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv1.id,
      senderId: user1.id,
      content: "Yes, exactly! We want bidirectional gRPC streaming for the append entries RPC. Let me know if you want to take it on!",
    },
  });

  // Seed Anonymous Incognito Conversation
  const conv2 = await prisma.conversation.create({
    data: {
      participantOneId: user1.id,
      participantTwoId: user3.id,
      isAnonymousChat: true,
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conv2.id,
      senderId: user3.id,
      content: "Hey, saw your confession about the DSP exam. That was hilarious! Which textbook did you study from?",
    },
  });

  console.log("✅ Supabase PostgreSQL database seeded successfully with RBAC & Conversations!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
