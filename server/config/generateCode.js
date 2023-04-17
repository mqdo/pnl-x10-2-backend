const { customAlphabet } = require('nanoid');

function generateCode() {
  const nanoid = customAlphabet('1234567890abcdef', 10)
  const id = nanoid();
  return `PRJ-${id}`;
}

module.exports = generateCode;