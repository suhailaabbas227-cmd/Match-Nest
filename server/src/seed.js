// Seed demo data: an admin + a few verified profiles in each mode.
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "./db.js";

db._reset();
const hash = (p) => bcrypt.hashSync(p, 10);

function user(over) {
  return {
    id: uuid(),
    role: "user",
    password: hash("password123"),
    verified: true,
    badge: false,
    profileComplete: true,
    photoPrivacy: false,
    blockedUsers: [],
    photos: [],
    profilePhoto: null,
    createdAt: Date.now(),
    profile: {},
    ...over,
  };
}

const seed = [
  user({
    fullName: "Admin", email: "admin@matchnest.app",
    password: hash("admin123"), role: "admin", gender: "other",
    mode: "dating", country: "UK", city: "London",
  }),
  user({
    fullName: "Aisha Rahman", email: "aisha@example.com", gender: "female",
    dateOfBirth: "1998-04-12", country: "UK", city: "London", mode: "dating",
    profile: {
      displayName: "Aisha", age: 27, height: "5'5\"", city: "London",
      nationality: "British Pakistani", languages: "English, Urdu",
      education: "BSc Computer Science", occupation: "Software Engineer",
      sect: "Sunni", religiosity: "Practicing", pray: "Yes",
      hobbies: "Reading, hiking, calligraphy", personality: "Introvert, thoughtful",
      lookingFor: "Someone kind, ambitious and family-oriented",
      dealBreakers: "Dishonesty", ageRange: "27-34",
      aboutMe: "Engineer who loves books and long walks. Faith matters to me.",
    },
  }),
  user({
    fullName: "Yusuf Khan", email: "yusuf@example.com", gender: "male",
    dateOfBirth: "1994-09-03", country: "UK", city: "Manchester", mode: "dating",
    profile: {
      displayName: "Yusuf", age: 31, height: "5'11\"", city: "Manchester",
      nationality: "British Bangladeshi", languages: "English, Bengali",
      education: "MBA", occupation: "Product Manager",
      sect: "Sunni", religiosity: "Practicing", pray: "Yes",
      hobbies: "Football, cooking, travel", personality: "Extrovert, easy-going",
      lookingFor: "A partner to build a life and deen with",
      dealBreakers: "Smoking", ageRange: "24-30",
      aboutMe: "PM by day, amateur chef by night. Looking for my other half.",
    },
  }),
  user({
    fullName: "Fatima Noor", email: "fatima@example.com", gender: "female",
    dateOfBirth: "1996-01-22", country: "UK", city: "Birmingham", mode: "marriage",
    photoPrivacy: true,
    profile: {
      fullLegalName: "Fatima Noor", age: 29, height: "5'4\"", weight: "60kg",
      complexion: "Fair", maritalStatus: "Never Married", children: "None",
      nationality: "British", motherTongue: "Arabic", city: "Birmingham",
      relocate: "Yes", sect: "Sunni", religiosity: "Very Practicing",
      prayFive: "Yes", fastRamadan: "Yes", readQuran: "Yes", hijab: "Yes",
      halalDiet: "Yes", islamicKnowledge: "Intermediate",
      education: "Pharmacy Degree", fieldOfStudy: "Pharmacy", occupation: "Pharmacist",
      income: "£40-50k", employment: "Employed",
      fatherName: "Abdullah Noor (Doctor)", motherBackground: "Homemaker",
      siblings: "2", familyReligiosity: "Practicing", wali: "Abdullah Noor +44 7700 900111",
      livingWithFamily: "Yes",
      prefAgeRange: "29-36", prefLocation: "UK", prefEducation: "Graduate",
      prefReligiosity: "Practicing", openDifferentSect: "No", openDivorced: "Yes",
      timeline: "Within a year", mahr: "Modest", liveAfter: "Own home",
      wantChildren: "Yes", wifeWorking: "Open to it",
      biodataNote: "Seeking a practicing partner to complete half my deen.",
    },
  }),
  user({
    fullName: "Bilal Ahmed", email: "bilal@example.com", gender: "male",
    dateOfBirth: "1992-07-15", country: "UK", city: "Birmingham", mode: "marriage",
    photoPrivacy: true,
    profile: {
      fullLegalName: "Bilal Ahmed", age: 32, height: "6'0\"", weight: "78kg",
      complexion: "Wheatish", maritalStatus: "Never Married", children: "None",
      nationality: "British", motherTongue: "Urdu", city: "Birmingham",
      relocate: "No", sect: "Sunni", religiosity: "Practicing",
      prayFive: "Yes", fastRamadan: "Yes", readQuran: "Yes", beard: "Yes",
      halalDiet: "Yes", islamicKnowledge: "Advanced",
      education: "MEng", fieldOfStudy: "Civil Engineering", occupation: "Engineer",
      income: "£55-65k", employment: "Employed",
      fatherName: "Tariq Ahmed (Businessman)", motherBackground: "Teacher",
      siblings: "3", familyReligiosity: "Practicing", wali: "Tariq Ahmed +44 7700 900222",
      livingWithFamily: "No",
      prefAgeRange: "25-31", prefLocation: "Birmingham", prefEducation: "Graduate",
      prefReligiosity: "Practicing", openDifferentSect: "No", openDivorced: "No",
      timeline: "ASAP", mahr: "As per sunnah", liveAfter: "Own home",
      wantChildren: "Yes", wifeWorking: "Her choice",
      biodataNote: "Engineer, practicing, family-oriented. Looking to marry soon insha'Allah.",
    },
  }),
];

seed.forEach((u) => db.users().insert(u));

console.log("Seeded demo data:");
console.log("  Admin login:  admin@matchnest.app / admin123");
console.log("  Demo users:   aisha@example.com, yusuf@example.com,");
console.log("                fatima@example.com, bilal@example.com  (all: password123)");
