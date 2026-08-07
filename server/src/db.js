// Lightweight JSON-file database.
// Mirrors a MongoDB-style document model so it can be swapped for real
// MongoDB later (collections of documents keyed by `id`). Zero external
// dependencies — the whole store lives in server/data/db.json.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const EMPTY = {
  users: [],          // accounts + profile data
  connections: [],    // connection requests / matches
  messages: [],       // chat messages
  conversations: [],  // chat threads (with optional chaperone)
  reports: [],        // reported users (for admin)
};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY, null, 2));
  }
}

function load() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY);
  }
}

let cache = load();

function persist() {
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2));
}

// Collection helper — chainable-ish minimal API.
export function collection(name) {
  if (!cache[name]) cache[name] = [];
  return {
    all: () => cache[name],
    find: (pred) => cache[name].filter(pred),
    findOne: (pred) => cache[name].find(pred),
    insert: (doc) => {
      cache[name].push(doc);
      persist();
      return doc;
    },
    update: (id, patch) => {
      const item = cache[name].find((d) => d.id === id);
      if (!item) return null;
      Object.assign(item, patch);
      persist();
      return item;
    },
    remove: (id) => {
      cache[name] = cache[name].filter((d) => d.id !== id);
      persist();
    },
  };
}

export const db = {
  users: () => collection("users"),
  connections: () => collection("connections"),
  messages: () => collection("messages"),
  conversations: () => collection("conversations"),
  reports: () => collection("reports"),
  _raw: () => cache,
  _reset: () => {
    cache = structuredClone(EMPTY);
    persist();
  },
};
