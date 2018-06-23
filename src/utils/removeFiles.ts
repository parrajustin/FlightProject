import { isUndefined } from 'lodash';
import * as async from 'async';
import * as jetpack from 'fs-jetpack';

/**
 * Remove all files specified in the parameters
 *
 * @param {string[]} files path to files to remove
 * @returns {Promise<undefined>} promise resolves when all files are removed
 */
export function removeFiles(files: string[]): Promise<undefined> {
    return new Promise((resolve, reject) => {
        if (isUndefined(files) || files.length < 1) {
            resolve();
        } else {
            async.map(files, (file, callback) => {
                jetpack.removeAsync(file).then(
                    () => callback(null)
                ).catch(
                    (reason) => reject(reason)
                );
            }, (err, _) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }
    });
}
