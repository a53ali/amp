#!/usr/bin/env node
// Lightweight entry that loads TypeScript files via ts-node if available.
try {
  // prefer ts-node if present
  require('ts-node/register');
} catch (e) {
  // ignore; hope TS has been compiled
}
require('../src/index');
