import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Seeding demo data...");
    const hash = await bcrypt.hash("password123", 10);

    await client.query(`
      INSERT INTO teachers (name, email, password_hash, department, phone)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (email) DO NOTHING
    `, ["Dr. Sarah Johnson", "teacher@demo.com", hash, "Computer Science", "9876543210"]);
    console.log("Teacher: teacher@demo.com");

    const students = [
      ["Alice Smith",  "alice@demo.com",  "CS2021001", "Computer Science", 3, "A", "parent@demo.com",  "9876543211", "Robert Smith"],
      ["Bob Chen",     "bob@demo.com",    "CS2021002", "Computer Science", 3, "A", "parent2@demo.com", "9876543212", "Linda Chen"],
      ["Priya Patel",  "priya@demo.com",  "CS2021003", "Computer Science", 3, "B", "parent3@demo.com", "9876543213", "Raj Patel"],
      ["James Wilson", "james@demo.com",  "CS2021004", "Computer Science", 2, "A", "parent4@demo.com", "9876543214", "Carol Wilson"],
      ["Mei Zhang",    "mei@demo.com",    "CS2021005", "Electronics",      3, "A", "parent5@demo.com", "9876543215", "Wei Zhang"],
    ];

    for (const [name, email, reg, dept, year, sec, pe, pp, pn] of students) {
      await client.query(`
        INSERT INTO students (name, email, password_hash, registration_number, department, year, section, parent_email, parent_phone, parent_name, parent_password_hash)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (email) DO NOTHING
      `, [name, email, hash, reg, dept, year, sec, pe, pp, pn, hash]);
    }
    console.log("Students: alice, bob, priya, james, mei @demo.com");

    const periods = [
      ["Period 1", "Data Structures",     "09:00", "10:00", 1],
      ["Period 2", "Algorithms",          "10:00", "11:00", 1],
      ["Period 3", "Operating Systems",   "11:15", "12:15", 1],
      ["Period 4", "Database Systems",    "13:00", "14:00", 2],
      ["Period 5", "Computer Networks",   "14:00", "15:00", 2],
      ["Period 6", "Software Engineering","09:00", "10:00", 3],
    ];

    for (const [name, subject, start, end, day] of periods) {
      await client.query(`
        INSERT INTO periods (name, subject, start_time, end_time, day_of_week)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT DO NOTHING
      `, [name, subject, start, end, day]);
    }
    console.log("Periods created");

    const announcements = [
      ["Welcome to Smart Attendance System",
       "This system tracks attendance in real-time. Ensure students are enrolled and face data is registered.",
       "high", "all"],
      ["Mid-term Exams Schedule",
       "Mid-term examinations will be held from June 10–15. Minimum 75% attendance required.",
       "urgent", "all"],
      ["Lab Sessions Updated",
       "Database Systems lab rescheduled to Friday afternoons starting next week.",
       "medium", "student"],
    ];

    for (const [title, description, priority, targetRole] of announcements) {
      await client.query(`
        INSERT INTO announcements (title, description, priority, target_role)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT DO NOTHING
      `, [title, description, priority, targetRole]);
    }
    console.log("Announcements created");

    console.log("\n✅ Seed complete!");
    console.log("\nDemo credentials (password: password123):");
    console.log("  Teacher  → teacher@demo.com");
    console.log("  Students → alice@demo.com / bob@demo.com / priya@demo.com");
    console.log("  Parent   → parent@demo.com  (Alice's parent)");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
