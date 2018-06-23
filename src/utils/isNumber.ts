
/**
 * regex which looks for a number accepting negatives, numbers, and periods
 */
const numCheck = new RegExp(/[-\d.]/);

/**
 * Checks if a string is either a number, -, or .
 *
 * @param {*} input input string character to check
 * @returns
 */
export function isNumber(input) {
    return !input.match(numCheck) === false;
}