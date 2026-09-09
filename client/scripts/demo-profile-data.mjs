const LOCATIONS = [
  { country: "Pakistan", city: "Karachi", ethnicity: "South Asian", language: "Urdu" },
  { country: "Pakistan", city: "Lahore", ethnicity: "South Asian", language: "Punjabi" },
  { country: "Pakistan", city: "Islamabad", ethnicity: "South Asian", language: "Urdu" },
  { country: "United Kingdom", city: "London", ethnicity: "South Asian", language: "English" },
  { country: "United Kingdom", city: "Manchester", ethnicity: "Mixed", language: "English" },
  { country: "Canada", city: "Toronto", ethnicity: "South Asian", language: "English" },
  { country: "United Arab Emirates", city: "Dubai", ethnicity: "Arab", language: "Arabic" },
  { country: "United States", city: "Chicago", ethnicity: "Mixed", language: "English" },
  { country: "Australia", city: "Sydney", ethnicity: "Southeast Asian", language: "English" },
  { country: "Turkey", city: "Istanbul", ethnicity: "Turkish", language: "Turkish" },
  { country: "Germany", city: "Berlin", ethnicity: "European", language: "German" },
  { country: "Saudi Arabia", city: "Riyadh", ethnicity: "Arab", language: "Arabic" },
];

const MALE_NAMES = [
  "Adam", "Ahmed", "Ali", "Bilal", "Daniyal", "Faris", "Hamza", "Hassan",
  "Ibrahim", "Imran", "Ismail", "Kareem", "Mikael", "Omar", "Rayan",
  "Saad", "Salman", "Sami", "Tariq", "Yahya", "Yusuf", "Zaid", "Zayn",
];

const FEMALE_NAMES = [
  "Aaliyah", "Aisha", "Amal", "Amina", "Aya", "Fatima", "Hana", "Hiba",
  "Inaya", "Layla", "Mariam", "Maryam", "Noor", "Rania", "Sara", "Sofia",
  "Sumaya", "Yasmin", "Zahra", "Zainab",
];

const OCCUPATIONS = [
  ["Software Engineer", "Bachelor's Degree", "Computer Science"],
  ["Teacher", "Master's Degree", "Education"],
  ["Accountant", "Bachelor's Degree", "Accounting"],
  ["Doctor", "Doctorate / PhD", "Medicine"],
  ["Architect", "Master's Degree", "Architecture"],
  ["Product Designer", "Bachelor's Degree", "Design"],
  ["Business Owner", "Bachelor's Degree", "Business"],
  ["Pharmacist", "Master's Degree", "Pharmacy"],
  ["Data Analyst", "Bachelor's Degree", "Data Science"],
  ["Civil Engineer", "Bachelor's Degree", "Civil Engineering"],
  ["Researcher", "Doctorate / PhD", "Life Sciences"],
  ["Marketing Manager", "Master's Degree", "Marketing"],
];

const INTEREST_SETS = [
  ["Reading", "Travel", "Cooking"],
  ["Fitness", "Hiking", "Nature"],
  ["Photography", "Art", "Foodie"],
  ["Technology", "Entrepreneurship", "Writing"],
  ["Volunteering", "Charity work", "Islamic history"],
  ["Sports", "Movies", "Music"],
  ["Gardening", "Languages", "Calligraphy"],
];

const HEIGHTS = ["5'2\" (157 cm)", "5'4\" (163 cm)", "5'6\" (168 cm)", "5'8\" (173 cm)", "5'10\" (178 cm)", "6'0\" (183 cm)"];
const SECTS = ["Sunni", "Shia", "Just Muslim"];
const RELIGIOSITY = ["Moderately Practicing", "Practicing", "Very Practicing"];
const MARITAL_STATUSES = ["Never Married", "Never Married", "Divorced", "Widowed"];

function pad(value) {
  return String(value).padStart(3, "0");
}

function demoEmail(index) {
  return `demo.profile.${String(index + 1).padStart(4, "0")}@matchnest.invalid`;
}

function dateOfBirth(age, index) {
  const today = new Date();
  const monthNumber = (index % 12) + 1;
  const dayNumber = (index % 27) + 1;
  const birthdayStillAhead = monthNumber > today.getUTCMonth() + 1
    || (monthNumber === today.getUTCMonth() + 1 && dayNumber > today.getUTCDate());
  const year = today.getUTCFullYear() - age - (birthdayStillAhead ? 1 : 0);
  const month = String(monthNumber).padStart(2, "0");
  const day = String(dayNumber).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sharedProfile({ index, serial, gender, location, occupation, education }) {
  const lookingFor = gender === "Male" ? "Female" : "Male";
  const age = 22 + (index % 22);
  return {
    age,
    gender,
    lookingFor,
    height: HEIGHTS[index % HEIGHTS.length],
    city: `${location.city}, ${location.country}`,
    ethnicity: location.ethnicity,
    languages: [location.language, "English"].filter((item, pos, all) => all.indexOf(item) === pos),
    education,
    occupation,
    maritalStatus: MARITAL_STATUSES[index % MARITAL_STATUSES.length],
    sect: SECTS[index % SECTS.length],
    religiosity: RELIGIOSITY[index % RELIGIOSITY.length],
    interests: INTEREST_SETS[index % INTEREST_SETS.length],
    isDemo: true,
    demoLabel: `Synthetic preview profile ${serial}`,
  };
}

function friendshipProfile(context) {
  const shared = sharedProfile(context);
  const city = context.location.city;
  return {
    ...shared,
    displayName: context.fullName,
    pray: ["Always (5x daily)", "Most of the time", "Sometimes"][context.index % 3],
    relationshipGoal: ["Making friends first", "Getting to know people", "A serious relationship"][context.index % 3],
    aboutMe: `This is a fictional preview profile for testing MatchNest. I enjoy ${shared.interests.join(", ").toLowerCase()} and meeting thoughtful people in ${city}.`,
    icebreakers: [
      { q: "My ideal weekend looks like…", a: `A relaxed morning, time with family, and exploring somewhere new around ${city}.` },
      { q: "A cause I care about…", a: "Education, community support, and making useful opportunities easier to access." },
      { q: "Together we could…", a: "Share good conversations, learn something new, and enjoy simple plans." },
    ],
  };
}

function marriageProfile(context) {
  const shared = sharedProfile(context);
  const gender = context.gender;
  return {
    ...shared,
    fullLegalName: context.fullName,
    complexion: ["Fair", "Wheatish", "Medium", "Dark"][context.index % 4],
    children: shared.maritalStatus === "Never Married" ? "None" : context.index % 2 ? "None" : "One",
    motherTongue: context.location.language,
    relocate: context.index % 3 === 0 ? "Yes" : "No",
    prayFive: ["Always (5x daily)", "Most of the time"][context.index % 2],
    fastRamadan: "Yes",
    readQuran: context.index % 3 === 0 ? "No" : "Yes",
    hijab: gender === "Female" ? ["Hijab", "Niqab", "No"][context.index % 3] : "N/A",
    beard: gender === "Male" ? (context.index % 3 === 0 ? "No" : "Yes") : "N/A",
    halalDiet: "Yes",
    drinkSmoke: "Never",
    fieldOfStudy: context.fieldOfStudy,
    income: "Prefer to discuss with a serious match",
    employment: context.occupation === "Business Owner" ? "Business Owner" : "Employed",
    fatherName: "Family background available after a serious match",
    motherBackground: "Family background available after a serious match",
    siblings: String((context.index % 4) + 1),
    familyReligiosity: RELIGIOSITY[(context.index + 1) % RELIGIOSITY.length],
    familyValues: ["Traditional", "Moderate", "Liberal"][context.index % 3],
    livingWithFamily: context.index % 2 ? "Yes" : "No",
    prefAgeRange: gender === "Male" ? "22-35" : "25-42",
    prefLocation: context.location.country,
    prefEducation: ["Bachelor's Degree", "Master's Degree", "Other"][context.index % 3],
    prefReligiosity: RELIGIOSITY[context.index % RELIGIOSITY.length],
    openDifferentSect: context.index % 2 ? "Yes" : "No",
    openDivorced: context.index % 3 ? "Yes" : "No",
    timeline: ["Within 6 months", "6–12 months", "1–2 years", "Whenever it's right"][context.index % 4],
    mahr: "To be discussed respectfully between families",
    wantChildren: ["Yes", "Open to discuss", "No"][context.index % 3],
    biodataNote: `This is a fictional marriage-profile preview for MatchNest. I value faith, respectful communication, family involvement, and a thoughtful path toward marriage. My work in ${context.occupation.toLowerCase()} matters to me, while a peaceful and supportive home remains a priority.`,
    icebreakers: [
      { q: "My idea of a happy home…", a: "A calm home built on faith, kindness, honest communication, and shared responsibility." },
      { q: "Qualities I value most in a spouse…", a: "Good character, emotional maturity, reliability, and respect for both families." },
      { q: "What I bring to a marriage…", a: "Patience, consistency, practical support, and a willingness to grow together." },
    ],
  };
}

export function buildDemoProfiles(count = 300) {
  if (!Number.isInteger(count) || count < 4 || count % 4 !== 0) {
    throw new Error("DEMO_PROFILE_COUNT must be an integer divisible by 4 (for example, 300)." );
  }

  const perGroup = count / 4;
  const groups = [
    { mode: "dating", gender: "Male" },
    { mode: "dating", gender: "Female" },
    { mode: "marriage", gender: "Male" },
    { mode: "marriage", gender: "Female" },
  ];

  let index = 0;
  return groups.flatMap(({ mode, gender }) => Array.from({ length: perGroup }, (_, groupIndex) => {
    const serial = pad(groupIndex + 1);
    const names = gender === "Male" ? MALE_NAMES : FEMALE_NAMES;
    const firstName = names[(groupIndex + (mode === "marriage" ? 5 : 0)) % names.length];
    const fullName = `${firstName} Demo ${serial}`;
    const location = LOCATIONS[index % LOCATIONS.length];
    const [occupation, education, fieldOfStudy] = OCCUPATIONS[index % OCCUPATIONS.length];
    const age = 22 + (index % 22);
    const context = {
      index, serial, mode, gender, fullName, location,
      occupation, education, fieldOfStudy,
    };
    const profile = mode === "marriage" ? marriageProfile(context) : friendshipProfile(context);
    const record = {
      email: demoEmail(index),
      dateOfBirth: dateOfBirth(age, index),
      fullName,
      gender,
      country: location.country,
      city: location.city,
      mode,
      profile,
      photoPrivacy: mode === "marriage",
    };
    index += 1;
    return record;
  }));
}
