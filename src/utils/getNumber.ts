import { isNumber } from './isNumber';

/**
 * Get a number out of a string and starting index
 *
 * @param {*} string the find the nubmers from
 * @param {*} start index to start checking
 * @returns
 */
export function getNumber(string, start) {
    let num = '';

    for (let i = start; isNumber(string[i]); i++) {
        num += string[i];
    }

    return parseFloat(num);
}