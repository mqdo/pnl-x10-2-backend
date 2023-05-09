const isDate = (input) => {
  const dateRegex = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$/;
  return dateRegex.test(input);
}

module.exports = isDate;