import * as jetpack from 'fs-jetpack';
import * as md5 from 'md5';

/**
 * Wraps the process to read a file and hash it into a promise
 *
 * @param {*} file path to file to hash
 * @returns {Promise<string>} md5 hash of file
 */
export function constructFileHashPromise(file): Promise<string> {
    return new Promise((resolve, reject) => {
        jetpack.readAsync(file, 'buffer').then(
            (value) => resolve(md5(value as Buffer))
        ).catch(
            (reason) => reject(reason)
        );
    });
}