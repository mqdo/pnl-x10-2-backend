const isDate = (input) => {
  const newDate = new Date(input);
  return newDate instanceof Date && !isNaN(newDate);
}

module.exports = isDate;