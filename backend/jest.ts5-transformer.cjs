// ts-jest 29 solo soporta TypeScript < 7 y el proyecto usa TypeScript 7.
// Cuando ts-jest pide 'typescript' se le entrega TypeScript 5.9 (alias typescript5); el resto del proyecto no cambia.
const Module = require('node:module');
const path = require('node:path');

const resolver = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  const desdeTsJest = parent?.filename?.includes(`${path.sep}ts-jest${path.sep}`);
  return resolver.call(this, desdeTsJest && request === 'typescript' ? 'typescript5' : request, parent, ...rest);
};

module.exports = require('ts-jest');
