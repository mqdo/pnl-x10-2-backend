const { customAlphabet } = require('nanoid');

function generateCode() {
  const nanoid = customAlphabet('1234567890abcdef', 10)
  const id = nanoid();
  return `prj-${id}`;
}

module.exports = generateCode;