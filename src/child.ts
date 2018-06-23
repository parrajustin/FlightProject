import * as https from 'https';
import * as http from 'http';
import * as jetpack from 'fs-jetpack';
import * as path from 'path';
import * as querystring from "query-string";
// const fs = require('fs');
import * as async from 'async';
import { map, filter, union, flatten } from 'lodash';
import { MD5 } from 'object-hash';

import { constructFileHashPromise, contructExecPromise, getNumber, removeFiles, unzipFile, UserError } from './utils';

/**
 * The geo Data that contains the image bounds
 */
const geoBoundData = require('../data.json') as object;
/**
 * Hash of geo data
 */
const geoBoundHash = MD5(geoBoundData);

const __root = path.join(__dirname, '..');


/**
 * Current avaliable maps for download from the api
 *
 * @interface EditionInfo
 */
interface EditionInfo {
    geoname: string;
    editionName: string;
    format: string;
    geoeditionDatename: string;
    editionNumber: number;
    product: {
        productName: string;
        url: string;
    }
}


/**
 * the api information of the sectional charts
 *
 * @interface SectionalInfoJson
 */
interface SectionalInfoJson {
    status: {
        code: number;
        message: string
    };
    edition: EditionInfo[];
}


/**
 * json information of the files in the data directory
 *
 * @interface FileInfoJson
 */
interface FileInfoJson {
    /**
     * what version are the maps
     *
     * @type {number}
     * @memberof FileInfoJson
     */
    version: number;

    /**
     * hash of the sectional api chart
     *
     * @type {string}
     * @memberof FileInfoJson
     */
    dataHash: string;

    /**
     * hash of the downloaded sectional file
     *
     * @type {string}
     * @memberof FileInfoJson
     */
    zipHash: string;

    /**
     * hash of the sectional chart bounds
     *
     * @type {string}
     * @memberof FileInfoJson
     */
    boundHash: string;

    /**
     * file names stored in the data directory
     *
     * @type {string[]}
     * @memberof FileInfoJson
     */
    files: string[];
}


/**
 * Promise Data for passing data between promises
 *
 * @interface PromiseDataObject
 */
interface PromiseDataObject {

    /**
     * the api information of the sectional charts
     *
     * @type {SectionalInfoJson}
     * @memberof PromiseDataObject
     */
    sectionalInfo: SectionalInfoJson;

    /**
     * json information of the files in the data directory
     *
     * @type {FileInfoJson}
     * @memberof PromiseDataObject
     */
    fileInfo: FileInfoJson;

    /**
     * The working file info for future write
     *
     * @type {FileInfoJson}
     * @memberof PromiseDataObject
     */
    futureFileInfo?: FileInfoJson;

    /**
     * name of the downloaded zip file
     *
     * @type {string}
     * @memberof PromiseDataObject
     */
    zipName?: string;

    /**
     * if the process should skip to the clip
     *
     * @type {boolean}
     * @memberof PromiseDataObject
     */
    skipToClip?: boolean;
}

function clipMaps(fileJson) {

}

/**
 * Gdalwarp the outputed maps by using boudnaries declared in the metadata or those hand defined in the data.json
 *
 * @param {string} fileFriendlyLocation data location name
 * @param {PromiseDataObject} params contains promise data information
 * @returns {Promise<PromiseDataObject>} promise that resolves when mapes have been corrected
 */
function correctMaps(fileFriendlyLocation: string, params: PromiseDataObject): Promise<PromiseDataObject> {
    return new Promise((resolve, reject) => {
        if (params.skipToClip) {
            resolve(params);
        } else {
            const metaDataFiles = filter(params.futureFileInfo.files, (f) => {
                const splitName = f.split('.');
                return splitName[splitName.length - 1] === 'htm';
            });

            async.map(metaDataFiles, (metaFile, callback) => {
                const metaPath = path.join(__root, 'data', fileFriendlyLocation, metaFile);

                const periodLocation = metaFile.indexOf('.');
                const fileName = metaFile.substr(0, periodLocation);
                const inImg = path.join(__root, 'data', fileFriendlyLocation, `${fileName}.tif`);

                jetpack.readAsync(metaPath).then(
                    (data: string) => {
                        const innerbody = data.match(
                            new RegExp(/<body>(.*)<\/body>/s)
                        )[1].replace(new RegExp('\r\n', 'g'), '').replace(new RegExp(' ', 'g'), '');

                        /* GET THE PIZEL SIZES OF THE IMAGE */
                        let horizontalResolution = 0;
                        let verticalResolution = 0;

                        const horizontalStr = '<em>Abscissa_Resolution:</em>';
                        const verticalStr = '<em>Ordinate_Resolution:</em>';

                        let horizontalIndex = innerbody.indexOf(horizontalStr);
                        let verticalIndex = innerbody.indexOf(verticalStr, horizontalIndex);

                        const resolutionStr = innerbody.substr(horizontalIndex, (verticalIndex - horizontalIndex) * 4);
                        horizontalIndex = resolutionStr.indexOf(horizontalStr);
                        verticalIndex = resolutionStr.indexOf(verticalStr, horizontalIndex);

                        horizontalResolution = getNumber(resolutionStr, horizontalIndex + horizontalStr.length);
                        verticalResolution = getNumber(resolutionStr, verticalIndex + verticalStr.length);
                        /* END PIXEL SIZE */


                        /* GET THE LAT/LONG BOUNDS OF THE MAP SECTION */
                        const westBound = 'West_Bounding_Coordinate:</em>';
                        const eastBound = 'East_Bounding_Coordinate:</em>';
                        const southBound = 'South_Bounding_Coordinate:</em>';
                        const northBound = 'North_Bounding_Coordinate:</em>';

                        let westIndex = innerbody.indexOf(westBound);
                        let eastIndex = innerbody.indexOf(eastBound, westIndex);
                        let southIndex = innerbody.indexOf(southBound, westIndex);
                        let northIndex = innerbody.indexOf(northBound, westIndex);

                        const subString = innerbody.substr(westIndex, (Math.max(westIndex, eastIndex, southIndex, northIndex) - Math.min(westIndex, eastIndex, southIndex, northIndex)) * 2);
                        westIndex = subString.indexOf(westBound);
                        eastIndex = subString.indexOf(eastBound, westIndex);
                        southIndex = subString.indexOf(southBound, westIndex);
                        northIndex = subString.indexOf(northBound, westIndex);

                        const westNumber = (geoBoundData[metaDataFiles.length === 1 ? fileFriendlyLocation : metaFile] || {})['west'] || Math.ceil(getNumber(subString, westIndex + westBound.length));
                        const eastNumber = (geoBoundData[metaDataFiles.length === 1 ? fileFriendlyLocation : metaFile] || {})['east'] || getNumber(subString, eastIndex + eastBound.length);
                        const southNumber = (geoBoundData[metaDataFiles.length === 1 ? fileFriendlyLocation : metaFile] || {})['south'] || Math.ceil(getNumber(subString, southIndex + southBound.length));
                        const northNumber = (geoBoundData[metaDataFiles.length === 1 ? fileFriendlyLocation : metaFile] || {})['north'] || getNumber(subString, northIndex + northBound.length);
                        /* END LAT/LONG BOUNDS */

                        // if the image goes over the 180 degree divide line split it into 2 in the else section
                        if (westNumber < eastNumber) {
                            const clippedFile = `${fileName}.clipped.tif`;
                            const rgbFile = `${fileName}.rgb.tif`;

                            const clippedOut = path.join(__root, 'data', fileFriendlyLocation, clippedFile);
                            const rgbOut = path.join(__root, 'data', fileFriendlyLocation, rgbFile);

                            contructExecPromise(`gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te ${westNumber} ${southNumber} ${eastNumber} ${northNumber} -tr ${horizontalResolution} ${verticalResolution} "${inImg}" "${clippedOut}"`).then(
                                () => contructExecPromise(`gdal_translate -expand rgb "${clippedOut}" ${rgbOut}`)
                            ).then(
                                () => callback(null, [clippedFile, rgbFile])
                            ).catch(
                                (err) => callback(err)
                            );
                        } else {
                            async.parallel([
                                (innerCallback) => {
                                    // handle positive side
                                    const clippedFile = `${fileName}_west.clipped.tif`;
                                    const rgbFile = `${fileName}_west.rgb.tif`;

                                    const clippedOut = path.join(__root, 'data', fileFriendlyLocation, clippedFile);
                                    const rgbOut = path.join(__root, 'data', fileFriendlyLocation, rgbFile);

                                    contructExecPromise(`gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te ${westNumber} ${southNumber} 180 ${northNumber} -tr ${horizontalResolution} ${verticalResolution} "${inImg}" "${clippedOut}"`).then(
                                        () => contructExecPromise(`gdal_translate -expand rgb "${clippedOut}" ${rgbOut}`)
                                    ).then(
                                        () => innerCallback(null, [clippedFile, rgbFile])
                                    ).catch(
                                        (err) => innerCallback(err)
                                    );
                                }, (innerCallback) => {
                                    // handle negative side
                                    const clippedFile = `${fileName}_east.clipped.tif`;
                                    const rgbFile = `${fileName}_east.rgb.tif`;

                                    const clippedOut = path.join(__root, 'data', fileFriendlyLocation, clippedFile);
                                    const rgbOut = path.join(__root, 'data', fileFriendlyLocation, rgbFile);

                                    contructExecPromise(`gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te -180 ${southNumber} ${eastNumber} ${northNumber} -tr ${horizontalResolution} ${verticalResolution} "${inImg}" "${clippedOut}"`).then(
                                        () => contructExecPromise(`gdal_translate -expand rgb "${clippedOut}" ${rgbOut}`)
                                    ).then(
                                        () => innerCallback(null, [clippedFile, rgbFile])
                                    ).catch(
                                        (err) => innerCallback(err)
                                    );
                                }
                            ], (err, results) => {
                                if (err) {
                                    callback(err);
                                } else {
                                    callback(null, flatten(results));
                                }
                            });
                        }
                    }
                ).catch(
                    (reason) => callback(reason)
                );
            }, (err, results: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    // fileJson['files'] = _.union(fileJson['files'], _.filter(_.flatten(results), (s) => (s || '').length > 0));
                    const allFiles = union(params.futureFileInfo.files, filter(flatten(results), (s) => (s || '').length > 0));

                    const fiterFunc = (f: string) => {
                        const fileArry = f.split('.');
                        if (fileArry[fileArry.length - 1] === 'htm') {
                            return true;
                        } else if (fileArry[fileArry.length - 1] === 'tif' && fileArry.length > 2 && fileArry[fileArry.length - 2] === 'rgb') {
                            return true;
                        }
                    };

                    const filesToBeKept = filter(allFiles, fiterFunc);
                    const filesToDelete = filter(allFiles, (f) => !fiterFunc(f));

                    params.futureFileInfo.files = filesToBeKept;

                    removeFiles(map(filesToDelete, (f: string) => path.join(__root, 'data', fileFriendlyLocation, f))).then(
                        () => resolve(params)
                    ).catch(
                        (reason) => reject(reason)
                    );
                }
            })
        }
    });
}


/**
 * Check if the downloaded zip has the same hash as the one stored in the directories file.json
 *
 * @param {string} fileFriendlyLocation the location in the data folder where the files is saved
 * @param {PromiseDataObject} params information from other methods
 * @returns {Promise<PromiseDataObject>} promise return promise Data
 */
function checkZipFile(fileFriendlyLocation: string, params: PromiseDataObject): Promise<PromiseDataObject> {
    return new Promise((resolve, reject) => {
        const zipFile = path.join(__root, 'zip', params.zipName);

        // get zip file hash
        constructFileHashPromise(zipFile).then(
            (hash) => {
                if (hash === params.fileInfo.zipHash && params.fileInfo.boundHash === MD5(geoBoundData[fileFriendlyLocation])) {
                    // if the hash of the zip is the same, and the data is the same then we can skip the next steps till clipping
                    params.skipToClip = true;
                    const zippedImages = path.join(__root, 'zip', `${fileFriendlyLocation}.images.zip`);
                    const outPath = path.join(__root, 'data', fileFriendlyLocation);

                    unzipFile(zippedImages, outPath, 'htm', 'tif').then(
                        (files) => {
                            params.futureFileInfo = {
                                files,
                                version: params.sectionalInfo.edition[0].editionNumber,
                                dataHash: MD5(params.sectionalInfo),
                                boundHash: MD5(geoBoundData[fileFriendlyLocation]),
                                zipHash: hash
                            };

                            resolve(params);
                        }
                    ).catch(
                        (reason) => reject(reason)
                    )
                } else {
                    // some hash isn't the same so we have to go through the whole process
                    const outPath = path.join(__root, 'data', fileFriendlyLocation);
                    const filesToRemove = map(params.fileInfo.files, (f) => path.join(__root, 'data', fileFriendlyLocation, f));

                    // also remove the saved zipped images if any
                    filesToRemove.push(path.join(__root, 'zip', `${fileFriendlyLocation}.images.zip`));

                    // remove old files than unzip the downloaded file
                    removeFiles(params.fileInfo.files).then(
                        () => unzipFile(zipFile, outPath, 'htm', 'tif')
                    ).then(
                        (files) => {
                            params.futureFileInfo = {
                                files,
                                version: params.sectionalInfo.edition[0].editionNumber,
                                dataHash: MD5(params.sectionalInfo),
                                boundHash: MD5(geoBoundData[fileFriendlyLocation]),
                                zipHash: hash
                            };

                            resolve(params);
                        }
                    ).catch(
                        (reason) => reject(reason)
                    )
                }
            }
        ).catch(
            (reason) => reject(reason)
        );
    });
}

/**
 * Download the vfr sectional file from the api source
 *
 * @param {string} fileFriendlyLocation the location in the data folder where the files will be saved
 * @param {PromiseDataObject} params previous promise data info
 * @returns {Promise<string>} promise resolves with string of downloaded zip file name
 */
function downloadSectionalFile(fileFriendlyLocation: string, params: PromiseDataObject): Promise<string> {
    return new Promise((resolve, reject) => {
        const zipFile = params['sectionalInfo'].edition[0].product.url.split('/').pop().replace(new RegExp(/[- ]/, 'g'), '_');
        const filePath = path.join(__root, 'zip', zipFile);
        const writeStream = jetpack.createWriteStream(filePath);

        http.get(params['sectionalInfo'].edition[0].product.url, (res) => {
            const len = parseInt(res.headers['content-length'], 10);
            const total = len / 1048576;
            let current = 0;
            let checkpoint = 10;

            res.pipe(writeStream);

            res.on('data', (chunk) => {
                current += chunk.length;

                let progress = (100.0 * current / len);
                if (progress >= checkpoint) {
                    console.log(`${fileFriendlyLocation}: ${progress.toFixed(2)}% total ${total}MB`);
                    checkpoint += 10;
                }
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(zipFile);
                } else {
                    reject(new UserError(`${fileFriendlyLocation} Sectional chart retrieve failed; ${res.statusCode}:${res.statusMessage}`));
                }
            });
        }).on('error', (e) => {
            reject(e);
        });
    });
}

/**
 * Check if the current files in the data folder are current, if not delete old files
 *
 * @param {string} fileFriendlyLocation the location in the folder in data
 * @param {SectionalInfoJson} sectionalInfoJson api result from the vfr sectional api call
 * @returns {Promise<PromiseDataObject>} promise which resolves PromiseData
 */
function checkIfFileVersionIsCurrent(fileFriendlyLocation: string, sectionalInfoJson: SectionalInfoJson): Promise<PromiseDataObject> {
    return new Promise((resolve, reject) => {
        const savedFileInfo = path.join(__root, 'data', fileFriendlyLocation, 'file.json');
        const apiVersion = sectionalInfoJson.edition[0].editionNumber;

        jetpack.readAsync(savedFileInfo, 'json').then(
            (fileJson) => {
                const json = (fileJson || {}) as FileInfoJson;

                const currentVersion = json.version || -1;
                const currentDataHash = json.dataHash || '';

                if (currentVersion === apiVersion && currentDataHash === MD5(sectionalInfoJson)) {
                    reject(new UserError('Map(s) are already current'));
                } else {
                    resolve({ sectionalInfo: sectionalInfoJson, fileInfo: json });
                }
            }
        ).catch(
            (reason) => reject(reason)
        );
    });
}


/**
 * Creates the https get that retrieves the info for the vfr section chart into a promise   
 *
 * @param {string} apiOutlet api location for the http get
 * @returns {Promise<SectionalInfoJson>} promise that returns the http api info
 */
function constructApiGetInfo(apiOutlet: string): Promise<SectionalInfoJson> {
    return new Promise((resolve, reject) => {
        const result = querystring.stringify({ geoname: apiOutlet, edition: 'current', format: 'tiff' });

        const options: http.RequestOptions = {
            hostname: 'soa.smext.faa.gov',
            path: `/apra/vfr/sectional/chart?${result}`,
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json'
            }
        };

        https.get(options, (res) => {
            let json = '';

            res.on('data', (chunk) => {
                json += chunk;
            });

            res.on('end', () => {
                let data = JSON.parse(json) as SectionalInfoJson;

                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new UserError('Failed to retrieve api sectional data'));
                }
            });

        }).on('error', (e) => {
            reject(e);
        });
    });
}

module.exports = function sectionalPipeline(loc: string, WorkerCallback: (err: Error | string, message?: string) => void) {
    const fileFriendlyLocation = loc.replace(new RegExp(/[- ]/, 'g'), '_');

    // first make sure the directory in the data folder exists
    jetpack.dirAsync(path.join(__root, 'data', fileFriendlyLocation)).then(
        () => constructApiGetInfo(loc) // now get the vfr sectional chart info from the faa api
    ).then(
        (sectionalInfoJson) => checkIfFileVersionIsCurrent(fileFriendlyLocation, sectionalInfoJson) // check if the current files are current with the info from the sectional chart api, if they aren't current delete all old files
    ).then(
        (params): Promise<PromiseDataObject> => {
            /**
             * In Paralleld do the following
             * 1 save the info from the api into a file to be check against
             * 2 downoad the zip file stated in the api outlet
             */
            return new Promise((resolve, reject) => {
                async.parallel({
                    write: (callback) => {
                        jetpack.writeAsync(path.join(__root, 'data', fileFriendlyLocation, 'api.json'), params.sectionalInfo).then(
                            () => callback(null)
                        ).catch(
                            (reason) => reject(reason)
                        );
                    },
                    download: (callback) => {
                        downloadSectionalFile(fileFriendlyLocation, params).then(
                            (zipName) => callback(null, zipName)
                        );
                    }
                }, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        params.zipName = results['download'] as string;
                        resolve(params);
                        // resolve({
                        //     apiInfo: params,
                        //     zipName: results['download']
                        // });
                    }
                });
            });
        }
    ).then(
        (dataObject) => checkZipFile(fileFriendlyLocation, dataObject)
    ).then(
        (params) => {
            return new Promise((resolve, reject) => {
                async.parallel({
                    removeFile: (callback) => {
                        // remove the unecessary zip file
                        removeFiles([path.join(__root, 'zip', params.zipName)]).then(
                            () => callback(null)
                        ).catch(
                            (reason) => {
                                callback(reason)
                            }
                        );
                    },
                    reproject: (callback) => {
                        // correct the maps by clipping and reprojecting them
                        correctMaps(fileFriendlyLocation, params).then(
                            (fileJson) => callback(null, fileJson)
                        ).catch(
                            (reason) => callback(reason)
                        )
                    }
                }, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(results['reproject']);
                    }
                });
            });
        }
    ).then(
        (params) => {
            // jetpack.writeAsync(path.join(__root, 'data', fileFriendlyLocation, 'file.json'), fileJson)
            console.log(params);
        }
    ).then(
        () => WorkerCallback(null, 'Successfully updated!')
    ).catch(
        (reason) => WorkerCallback(reason)
    )
}