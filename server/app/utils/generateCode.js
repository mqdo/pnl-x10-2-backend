const { customAlphabet } = require('nanoid');

function generateCode(type) {
  const nanoid = customAlphabet('1234567890abcdef', 10)
  const id = nanoid();
  return `${type}-${id}`;
}

module.exports = generateCode;