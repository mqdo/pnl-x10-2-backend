const isEmail = (input) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(input);
}

module.exports = isEmail;