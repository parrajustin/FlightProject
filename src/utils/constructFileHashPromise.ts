import * as jetpack from 'fs-jetpack';

/**
 * Wraps the process to read a file and hash it into a promise
 *
 * @param {*} file path to file to hash
 * @returns {Promise<string>} md5 hash of file
 */
export function constructFileHashPromise(file): Promise<string> {
    return new Promise((resolve, reject) => {
        jetpack.inspectAsync(file, { checksum: 'md5' }).then(
            (out) => resolve(out['md5'])
        ).catch(
            (reason) => reject(reason)
        )
    });
}