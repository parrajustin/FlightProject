import * as jetpack from 'fs-jetpack';
import * as jszip from 'jszip';
import * as async from 'async';
import * as path from 'path';

/**
 * zips up all files in the files array stored in the fileroot outputing zipName
 *
 * @export
 * @param {string} fileRoot root of the files
 * @param {string[]} files name of files to zip
 * @param {string} zipName name of zip to output
 * @returns {Promise<undefined>} promise resolves when zip has completed
 */
export function zipFile(fileRoot: string, files: string[], zipName: string): Promise<undefined> {
    return new Promise((resolve, reject) => {
        if (files.length === 0) {
            resolve();
        } else {
            const zip = new jszip();

            async.mapSeries(files, (file, callback) => {
                const fileFullPath = path.join(fileRoot, file);
                jetpack.readAsync(fileFullPath, 'buffer').then(
                    (value: Buffer) => {
                        zip.file(file, value)
                        callback(null);
                    }
                ).catch(
                    (reason) => callback(reason)
                );
            }, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    const pipeOut = jetpack.createWriteStream(zipName);

                    zip.generateNodeStream({ streamFiles: true })
                        .pipe(pipeOut)
                        .on('finish', () => {
                            resolve();
                        });
                }
            })
        }
    });
}