const XLSX = require('xlsx');

const xlsxDateToJsDate = (date) => {
  const dateObject = XLSX.SSF.parse_date_code(date);

  const jsDate = new Date(Date.UTC(dateObject.y, dateObject.m - 1, dateObject.d, dateObject.H, dateObject.M, dateObject.S, dateObject.u / 1000));

  return jsDate;
}

module.exports = xlsxDateToJsDate;