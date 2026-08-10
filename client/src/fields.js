// Professional profile schemas for MatchNest — informed by how real apps
// structure profiles: Hinge (vitals + prompts + interests), Muzz (religious
// practice, icebreakers, interests) and Shaadi/Muslim matrimony (full biodata).
//
// Field `type`: text | number | textarea | select | tags | prompts

const t = (name, label, opts = {}) => ({ name, label, type: "text", ...opts });
const num = (name, label, opts = {}) => ({ name, label, type: "number", ...opts });
const area = (name, label, opts = {}) => ({ name, label, type: "textarea", ...opts });
const sel = (name, label, options, opts = {}) => ({ name, label, type: "select", options, ...opts });
const tags = (name, label, options, opts = {}) => ({ name, label, type: "tags", options, ...opts });
const prompts = (name, label, bank, count = 3) => ({ name, label, type: "prompts", bank, count });

// ---------- shared option banks ----------
const HEIGHTS = (() => {
  const out = [];
  for (let f = 4; f <= 6; f++) for (let i = 0; i < 12; i++) {
    if (f === 4 && i < 6) continue;
    if (f === 6 && i > 8) break;
    const cm = Math.round((f * 12 + i) * 2.54);
    out.push(`${f}'${i}" (${cm} cm)`);
  }
  return out;
})();

const EDUCATION = ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "Doctorate / PhD", "Islamic Studies", "Other"];
const EMPLOYMENT = ["Employed", "Self-Employed", "Business Owner", "Student", "Homemaker", "Looking for work"];
const MARITAL = ["Never Married", "Divorced", "Widowed"];
const SECTS = ["Sunni", "Shia", "Just Muslim", "Other"];
const RELIGIOSITY = ["Learning", "Moderately Practicing", "Practicing", "Very Practicing"];
const PRAY = ["Always (5x daily)", "Most of the time", "Sometimes", "Rarely"];
const YESNO = ["Yes", "No"];
const RELATIONSHIP_GOAL = ["Marriage", "A serious relationship", "Getting to know people", "Making friends first"];

const LANGUAGES = ["Arabic", "English", "Urdu", "Hindi", "Bengali", "Turkish", "Farsi", "French", "Malay", "Indonesian", "Somali", "Pashto", "Punjabi", "Spanish", "Other"];
const ETHNICITY = ["Arab", "South Asian", "Turkish", "Persian", "African", "Southeast Asian", "European", "Central Asian", "Mixed", "Other"];

const INTERESTS = [
  "Travel", "Reading", "Fitness", "Cooking", "Photography", "Sports",
  "Volunteering", "Art", "Music", "Nature", "Foodie", "Movies",
  "Technology", "Entrepreneurship", "Islamic history", "Calligraphy",
  "Hiking", "Gaming", "Writing", "Gardening", "Languages", "Charity work",
];

// ---------- icebreaker prompt banks (pick & answer) ----------
const DATING_PROMPTS = [
  "A life goal of mine…",
  "What I'm looking for…",
  "The way to win me over is…",
  "My ideal weekend looks like…",
  "I'm really passionate about…",
  "Faith to me means…",
  "A cause I care about…",
  "Something I'm proud of…",
  "My family means…",
  "A skill I'm working on…",
  "My simple pleasures…",
  "Two truths and a lie…",
  "Together we could…",
  "You should not match with me if…",
];

const MARRIAGE_PROMPTS = [
  "What faith means to me…",
  "My idea of a happy home…",
  "Qualities I value most in a spouse…",
  "My role in a marriage…",
  "Five years from now I see myself…",
  "What I bring to a marriage…",
  "How I'd like to raise a family…",
  "My non-negotiables…",
];

// ================= Dating — lighter, personality-focused =================
export const datingSteps = [
  {
    title: "About You",
    fields: [
      t("displayName", "Display Name", { required: true }),
      num("age", "Age", { required: true }),
      sel("gender", "Gender", ["Male", "Female"], { required: true }),
      sel("lookingFor", "Who Are You Looking For?", ["Male", "Female"], { required: true }),
      sel("height", "Height", HEIGHTS),
      t("city", "City / Location", { required: true }),
      sel("ethnicity", "Ethnicity", ETHNICITY),
      tags("languages", "Languages You Speak", LANGUAGES),
    ],
  },
  {
    title: "Lifestyle & Faith",
    fields: [
      sel("education", "Education", EDUCATION, { required: true }),
      t("occupation", "Occupation"),
      sel("maritalStatus", "Marital Status", MARITAL, { required: true }),
      sel("sect", "Sect", SECTS),
      sel("religiosity", "How Practicing Are You?", RELIGIOSITY),
      sel("pray", "Do You Pray?", PRAY),
    ],
  },
  {
    title: "Interests & Bio",
    fields: [
      tags("interests", "Your Interests", INTERESTS),
      sel("relationshipGoal", "What Are You Looking For?", RELATIONSHIP_GOAL, { required: true }),
      area("aboutMe", "About You", {
        placeholder: "A few real lines about who you are…",
        required: true,
        minLength: 20,
      }),
    ],
  },
  {
    title: "Icebreakers",
    fields: [
      prompts("icebreakers", "Share what others should know before reaching out", DATING_PROMPTS, 3),
    ],
  },
];

// ================= Marriage — full matrimony biodata =================
export const marriageSteps = [
  {
    title: "Personal",
    fields: [
      t("fullLegalName", "Full Name", { required: true }),
      num("age", "Age", { required: true }),
      sel("gender", "Gender", ["Male", "Female"], { required: true }),
      sel("lookingFor", "Who Are You Looking For?", ["Male", "Female"], { required: true }),
      sel("height", "Height", HEIGHTS),
      sel("complexion", "Complexion", ["Fair", "Wheatish", "Medium", "Dark"]),
      sel("maritalStatus", "Marital Status", MARITAL, { required: true }),
      t("children", "Children (if any)"),
      sel("ethnicity", "Ethnicity", ETHNICITY),
      t("motherTongue", "Mother Tongue"),
      t("city", "City & Country", { required: true }),
      sel("relocate", "Willing to Relocate?", YESNO),
    ],
  },
  {
    title: "Religious Practice",
    fields: [
      sel("sect", "Sect", SECTS, { required: true }),
      sel("religiosity", "Level of Religiosity", RELIGIOSITY, { required: true }),
      sel("prayFive", "Pray 5 Times Daily?", PRAY),
      sel("fastRamadan", "Fast in Ramadan?", YESNO),
      sel("readQuran", "Read Quran Regularly?", YESNO),
      sel("hijab", "Hijab / Niqab? (women)", ["Hijab", "Niqab", "No", "N/A"]),
      sel("beard", "Keep a Beard? (men)", ["Yes", "No", "N/A"]),
      sel("halalDiet", "Halal Diet Only?", YESNO),
      sel("drinkSmoke", "Drink or Smoke?", ["Never", "Occasionally", "No / N/A"]),
    ],
  },
  {
    title: "Education & Career",
    fields: [
      sel("education", "Highest Education", EDUCATION, { required: true }),
      t("fieldOfStudy", "Field of Study"),
      t("occupation", "Occupation"),
      t("income", "Annual Income (optional)"),
      sel("employment", "Employment Status", EMPLOYMENT),
    ],
  },
  {
    title: "Family",
    fields: [
      t("fatherName", "Father's Name & Profession"),
      t("motherBackground", "Mother's Background"),
      num("siblings", "Number of Siblings"),
      sel("familyReligiosity", "Family Religiosity", RELIGIOSITY),
      sel("familyValues", "Family Values", ["Traditional", "Moderate", "Liberal"]),
      t("wali", "Wali (Guardian) Name & Contact"),
      sel("livingWithFamily", "Living with Family?", YESNO),
    ],
  },
  {
    title: "Partner Expectations",
    fields: [
      t("prefAgeRange", "Preferred Age Range"),
      t("prefLocation", "Preferred Location"),
      sel("prefEducation", "Preferred Education", EDUCATION),
      sel("prefReligiosity", "Preferred Religiosity", RELIGIOSITY),
      sel("openDifferentSect", "Open to a Different Sect?", YESNO),
      sel("openDivorced", "Open to Divorced / Widowed?", YESNO),
      sel("timeline", "Timeline to Marry", ["Within 6 months", "6–12 months", "1–2 years", "Whenever it's right"]),
      t("mahr", "Mahr Expectation (optional)"),
      sel("wantChildren", "Want Children?", ["Yes", "No", "Open to discuss"]),
    ],
  },
  {
    title: "About & Icebreakers",
    fields: [
      tags("interests", "Your Interests", INTERESTS),
      area("biodataNote", "About You", {
        placeholder: "Tell potential matches and their families about yourself…",
        required: true,
        minLength: 20,
      }),
      prompts("icebreakers", "Share what others should know before reaching out", MARRIAGE_PROMPTS, 3),
    ],
  },
];

// Fields summarised on a profile card / detail view.
export const datingHighlights = ["occupation", "education", "relationshipGoal", "sect", "ethnicity"];
export const marriageHighlights = ["occupation", "education", "sect", "religiosity", "maritalStatus", "timeline"];
