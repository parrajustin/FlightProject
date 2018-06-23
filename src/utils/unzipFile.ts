import * as jetpack from 'fs-jetpack';
import * as unzip from 'node-unzip-2';
import * as path from 'path';

/**
 * Extract a zip where you only want to extract files with a certain extension
 *
 * @param {string} zipName name of zip to be extracted
 * @param {string} zipOut directory to extract zip to
 * @param {...string[]} fileTypesToExtract file extensions to extract
 * @returns {Promise<string[]>} promise resolving with name of files extracted
 */
export function unzipFile(zipName: string, zipOut: string, ...fileTypesToExtract: string[]): Promise<string[]> {
    return new Promise((resolve, _) => {
        const filesExtracted = [];

        jetpack.createReadStream(zipName)
            .pipe(unzip.Parse())
            .on('entry', function (entry) {
                const fileName = (entry.path as string).replace(new RegExp(/[- ]/, 'g'), '_');
                const name = fileName.split(".");
                const fileType = name[name.length - 1];

                if (fileTypesToExtract.indexOf(fileType) !== -1) {
                    const outputFilePath = path.join(zipOut, fileName);

                    filesExtracted.push(fileName);
                    entry.pipe(jetpack.createWriteStream(outputFilePath));
                } else {
                    entry.autodrain();
                }
            })
            .on('close', function () {
                resolve(filesExtracted);
            });
    });
}