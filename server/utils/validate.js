/**
 * Validation for http request input.
 */

const validateInt = value => {
  if (!Number.isInteger(value))
    throw new Error('quantity provided is not an integer');
};

const validateDate = value => {
  const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
  if (!value.match(dateFormat) || Number.isNaN((new Date(value)).getTime()))
    throw new Error('date provided is not in valid format YYYY-MM-DD');
};

exports.recordTransaction = (quantity, date) => {
  validateInt(quantity);
  validateDate(date);
};

exports.retrieveAnalytics = (dateBegin, dateEnd) => {
  validateDate(dateBegin);
  validateDate(dateEnd);
};
