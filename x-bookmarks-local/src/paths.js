const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = process.env.X_BOOKMARKS_LOCAL_DATA_DIR
    ? path.resolve(process.env.X_BOOKMARKS_LOCAL_DATA_DIR)
    : path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const BOOKMARKS_FILE = path.join(DATA_DIR, "bookmarks.json");
const STATUS_FILE = path.join(DATA_DIR, "status.json");
const AUTH_STATUS_FILE = path.join(DATA_DIR, "auth-status.json");
const STORAGE_STATE_FILE = path.join(DATA_DIR, "storage-state.json");
const PROFILE_DIR = path.join(DATA_DIR, "browser-profile");

module.exports = {
    ROOT_DIR,
    DATA_DIR,
    PUBLIC_DIR,
    BOOKMARKS_FILE,
    AUTH_STATUS_FILE,
    STORAGE_STATE_FILE,
    STATUS_FILE,
    PROFILE_DIR
};
