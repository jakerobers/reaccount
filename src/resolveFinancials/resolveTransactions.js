import dateMax from 'date-fns/fp/max';
import isWithinInterval from 'date-fns/fp/isWithinInterval';
import addDays from 'date-fns/fp/addDays';
import subDays from 'date-fns/fp/subDays';
import addMonths from 'date-fns/fp/addMonths';
import setDate from 'date-fns/fp/setDate';
import addQuarters from 'date-fns/fp/addQuarters';
import addYears from 'date-fns/fp/addYears';
import isSameDay from 'date-fns/fp/isSameDay';
import isAfter from 'date-fns/fp/isAfter';
import isBefore from 'date-fns/fp/isBefore';
import differenceInCalendarDays from 'date-fns/fp/differenceInCalendarDays';
import getDay from 'date-fns/fp/getDay';
import getDate from 'date-fns/fp/getDate';
import differenceInMonths from 'date-fns/fp/differenceInMonths';

const computeTransactionModifications = (transactions, graphRange) =>
  transactions.reduce((modifications, transaction) => {
    let transactionInterval = {
      start: subDays(1)(
        dateMax([graphRange.start, transaction.start ? transaction.start : 0])
      ),
      end: addDays(1)(
        dateMax([
          graphRange.end,
          transaction.start ? transaction.start : 0,
          transaction.end ? transaction.end : 0
        ])
      )
    };
    let coercePaybacksIntoTransactions = !transaction.transactions
      ? [transaction]
      : transaction.transactions.map(paybackTransactions => ({
          ...paybackTransactions,
          id: transaction.id
        }));
    return modifications.concat(
      coercePaybacksIntoTransactions.reduce(
        (nestedMods, coercedTransactions) => {
          return nestedMods.concat(
            generateModification(
              coercedTransactions,
              transactionInterval,
              transaction.start,
              [],
              0
            )
          );
        },
        []
      )
    );
  }, []);

export default computeTransactionModifications;

const generateModification = (
  transaction,
  transactionInterval,
  prevDate,
  modifications,
  occurrences
) => {
  let modification = nextModification(transaction.rtype)(transaction, prevDate);
  modification.mutateKey = transaction.id;

  // if this is a modification we should use then add it to the list
  // and generate the next one
  if (
    isWithinInterval(transactionInterval)(modification.date) &&
    isAfter(prevDate)(modification.date) &&
    (!transaction.occurrences || occurrences < transaction.occurrences) &&
    occurrences < 365
  ) {
    modifications.push(modification);
    generateModification(
      transaction,
      transactionInterval,
      modification.date,
      modifications,
      occurrences + 1
    );
    // this isn't a modification we want because it is before
    //  our graph starts, but we need to keep generating to confirm
    // that none of the future ones fall within our graphRange
  } else if (
    isBefore(transactionInterval.end)(modification.date) &&
    isAfter(prevDate)(modification.date) &&
    occurrences < 365
  ) {
    generateModification(
      transaction,
      transactionInterval,
      modification.date,
      modifications,
      occurrences
    );
  }
  return modifications;
};

export { generateModification };

const nextModification = rtype => {
  switch (rtype) {
    case 'none':
      return transactionNoReoccur;
    case 'day':
      return transactionDailyReoccur;
    case 'day of week':
      return transactionDayOfWeekReoccur;
    case 'day of month':
      return transactionDayOfMonthReoccur;
    case 'bimonthy':
      return transactionBimonthlyReoccur;
    case 'quarterly':
      return transactionQuarterlyReoccur;
    case 'semiannually':
      return transactionSemiannuallyReoccur;
    case 'annually':
      return transactionAnnuallyReoccur;
    default:
      return transactionNoReoccur;
  }
};

// when transaction.rtype === 'none'
const transactionNoReoccur = (transaction, seedDate) => {
  return {
    date: transaction.start,
    y: transaction.value,
    dailyRate: transaction.value
  };
};

// when transaction.rtype === 'day'
const transactionDailyReoccur = (transaction, seedDate) => {
  return {
    date: addDays(transaction.cycle)(seedDate),
    y: transaction.value,
    dailyRate: transaction.value / transaction.cycle
  };
};

// when transaction.rtype === 'day of week'
const transactionDayOfWeekReoccur = (transaction, seedDate) => {
  return {
    date: addDays(7 + getDay(seedDate) - transaction.cycle)(seedDate),
    y: transaction.value,
    dailyRate: transaction.value / 7
  };
};

// when transaction.rtype === 'day of month'
const transactionDayOfMonthReoccur = (transaction, seedDate) => {
  let monthlyDate;
  let isOnOrBefore = checkDate =>
    isBefore(seedDate)(checkDate) || isSameDay(seedDate)(checkDate);
  let cycleDate = setDate(transaction.cycle);
  if (isOnOrBefore(cycleDate(seedDate))) {
    monthlyDate = cycleDate(addMonths(1)(seedDate));
  } else {
    monthlyDate = cycleDate(seedDate);
  }
  return {
    date: monthlyDate,
    y: transaction.value,
    dailyRate: transaction.value / 30
  };
};

// when transaction.rtype === 'bimonthly'
const transactionBimonthlyReoccur = (transaction, seedDate) => {
  return {
    date: setDate(transaction.cycle)(addMonths(2)(seedDate)),
    y: transaction.value,
    dailyRate: transaction.value / 30 / 2
  };
};

// when transaction.rtype === 'quarterly'
const transactionQuarterlyReoccur = (transaction, seedDate) => {
  return {
    date: addQuarters(transaction.cycle)(seedDate),
    y: transaction.value,
    dailyRate: transaction.value / 30 / 3
  };
};

// when transaction.rtype === 'semiannually'
const transactionSemiannuallyReoccur = (transaction, seedDate) => {
  return {
    date: addYears(0.5)(seedDate),
    y: transaction.value,
    dailyRate: transaction.value / 180
  };
};

// when transaction.rtype === 'annually'
const transactionAnnuallyReoccur = (transaction, seedDate) => {
  return {
    date: addYears(1)(seedDate),
    y: transaction.value,
    dailyRate: transaction.value / 365
  };
};

export {
  transactionNoReoccur,
  transactionDailyReoccur,
  transactionDayOfWeekReoccur,
  transactionDayOfMonthReoccur,
  transactionBimonthlyReoccur,
  transactionQuarterlyReoccur,
  transactionSemiannuallyReoccur,
  transactionAnnuallyReoccur
};
