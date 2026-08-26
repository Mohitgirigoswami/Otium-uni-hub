import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Otium University Hub database...");

  // 1. Seed College: JCBOSEUST, YMCA
  const ymcaCollege = await prisma.college.upsert({
    where: { name: "JCBOSEUST, YMCA" },
    update: {
      city: "Faridabad",
    },
    create: {
      name: "JCBOSEUST, YMCA",
      city: "Faridabad",
    },
  });
  console.log(`✅ Upserted College: ${ymcaCollege.name} (${ymcaCollege.city}) - ID: ${ymcaCollege.id}`);

  // 2. Seed Super Admin: mohtigiri3021@gmail.com
  const superAdminEmail = "mohtigiri3021@gmail.com";
  const superAdminUser = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      role: "SUPER_ADMIN" as Role,
      collegeId: ymcaCollege.id,
    },
    create: {
      email: superAdminEmail,
      name: "Mohit Giri",
      role: "SUPER_ADMIN" as Role,
      collegeId: ymcaCollege.id,
      department: "Computer Engineering",
      year: 4,
      image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    },
  });

  // Ensure Incognito Profile for Super Admin
  const adminHandle = "mohtigiri3021";
  await prisma.incognitoProfile.upsert({
    where: { userId: superAdminUser.id },
    update: {
      handle: adminHandle,
      avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(adminHandle)}`,
    },
    create: {
      userId: superAdminUser.id,
      handle: adminHandle,
      avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(adminHandle)}`,
    },
  });
  console.log(`✅ Upserted Super Admin: ${superAdminUser.email} (Role: SUPER_ADMIN, College: ${ymcaCollege.name})`);

  // 3. Seed Default Print Setting
  await prisma.printSetting.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      singleSidedRate: 250, // ₹2.50
      doubleSidedRate: 200, // ₹2.00
    },
  });
  console.log("✅ Print pricing settings initialized (₹2.50 / ₹2.00).");

  // 4. Seed Sample Escrow Gigs for Testing
  await prisma.taskGig.upsert({
    where: { id: "gig-escrow-demo-1" },
    update: {
      status: "CLAIMED",
      isAnonymousWriter: true,
      budget: 80000,
    },
    create: {
      id: "gig-escrow-demo-1",
      title: "Digital Electronics Lab Record",
      description: "Need 15 pages written neatly with circuit diagrams for Digital Electronics EE-201",
      budget: 80000, // ₹800
      category: "ASSIGNMENT",
      status: "CLAIMED",
      isAnonymousWriter: true,
      posterId: superAdminUser.id,
      assignedToId: superAdminUser.id,
      collegeId: ymcaCollege.id,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.taskGig.upsert({
    where: { id: "gig-escrow-demo-2" },
    update: {
      status: "OPEN",
      budget: 150000,
    },
    create: {
      id: "gig-escrow-demo-2",
      title: "Computer Graphics OpenGL Solar System",
      description: "3D Solar System rendering with shaders and lighting in C++ OpenGL",
      budget: 150000, // ₹1500
      category: "CODING",
      status: "OPEN",
      posterId: superAdminUser.id,
      collegeId: ymcaCollege.id,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("✅ Sample Escrow Gigs seeded (CLAIMED & OPEN).");

  console.log("🚀 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
