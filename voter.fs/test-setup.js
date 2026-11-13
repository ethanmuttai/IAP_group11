// Runs before every test file. Each file gets its own throwaway copy of the
// database, so tests that create or edit reviews never touch db/voter.db.
const fs = require('fs');
const os = require('os');
const path = require('path');

const copy = path.join(os.tmpdir(), `voter-test-${process.pid}-${Math.random().toString(36).slice(2)}.db`);
fs.copyFileSync(path.join(__dirname, 'db', 'voter.db'), copy);

process.env.DB_PATH = copy;
process.env.API_KEYS = 'test-key,rate-key';
process.env.PARTNER_API_KEY = 'partner-test-key';
process.env.PARTNER_VERSION = 'v2';