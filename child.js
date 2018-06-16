const https = require('https');
const http = require('http');
const jetpack = require('fs-jetpack');
const path = require('path');
const querystring = require("querystring");
// const fs = require('fs');
const unzip = require('node-unzip-2');
const async = require('async');
const { exec } = require('child_process');
const _ = require('lodash');
const geoBoundData = require('./data.json');
// const gdal = require("gdal");

const numCheck = new RegExp(/[-\d.]/);

function userError(input) {
    const err = new Error(input);
    err.isUser = true;
    return err;
}

/**
 * Checks if a string is either a number, -, or .
 *
 * @param {*} input input string character to check
 * @returns
 */
function isNumber(input) {
    return !input.match(numCheck) === false;
}

/**
 * Get a number out of a string and starting index
 *
 * @param {*} string the find the nubmers from
 * @param {*} start index to start checking
 * @returns
 */
function getNumber(string, start) {
    let num = '';

    for (let i = start; isNumber(string[i]); i++) {
        num += string[i];
    }

    return parseFloat(num, 10);
}


/**
 * Gdalwarp the outputed maps by using boudnaries declared in the metadata or those hand defined in the data.json
 *
 * @param {*} fileFriendlyLocation data location name
 * @param {*} fileJson contains the file json information
 * @returns promise that resolves when complted returning an edited fileJson
 */
function correctMaps(fileFriendlyLocation, fileJson) {
    return new Promise((resolve, reject) => {
        const metaDataFiles = _.filter(fileJson['files'], (f) => {
            const splitName = f.split('.');
            return splitName[splitName.length - 1] === 'htm';
        });

        async.map(metaDataFiles, (metaFile, callback) => {
            const metaPath = path.join(__dirname, 'data', fileFriendlyLocation, metaFile);

            const periodLocation = metaFile.indexOf('.');
            const fileName = metaFile.substr(0, periodLocation);
            const inImg = path.join(__dirname, 'data', fileFriendlyLocation, `${fileName}.tif`);
            const outImg = path.join(__dirname, 'data', fileFriendlyLocation, `${fileName}.clipped.tif`);

            jetpack.readAsync(metaPath).then(
                (data) => {
                    const innerbody = data.match(new RegExp(/<body>(.*)<\/body>/s))[1].replace(new RegExp('\r\n', 'g'), '').replace(new RegExp(' ', 'g'), '');

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
                        exec(`gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te ${westNumber} ${southNumber} ${eastNumber} ${northNumber} -tr ${horizontalResolution} ${verticalResolution} "${inImg}" "${outImg}"`, (err) => {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, `${fileName}.clipped.tif`);
                            }
                        });
                    } else {
                        async.parallel([
                            (innerCallback) => {
                                // handle positive side
                                const subImg = path.join(__dirname, 'data', fileFriendlyLocation, `${fileName}_west.clipped.tif`);

                                exec(`gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te ${westNumber} ${southNumber} 180 ${northNumber} -tr ${horizontalResolution} ${verticalResolution} "${inImg}" "${subImg}"`, (err) => {
                                    if (err) {
                                        innerCallback(err);
                                    } else {
                                        innerCallback(null, `${fileName}_west.clipped.tif`);
                                    }
                                });
                            }, (innerCallback) => {
                                // handle negative side
                                const subImg = path.join(__dirname, 'data', fileFriendlyLocation, `${fileName}_east.clipped.tif`);

                                exec(`gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te -180 ${southNumber} ${eastNumber} ${northNumber} -tr ${horizontalResolution} ${verticalResolution} "${inImg}" "${subImg}"`, (err) => {
                                    if (err) {
                                        innerCallback(err);
                                    } else {
                                        innerCallback(null, `${fileName}_east.clipped.tif`);
                                    }
                                });
                            }
                        ], (err, results) => {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, results);
                            }
                        });
                    }
                }
            ).catch(
                (reason) => callback(reason)
            );
        }, (err, results) => {
            if (err) {
                reject(err);
            } else {
                fileJson['files'] = _.union(fileJson['files'], _.filter(_.flatten(results), (s) => (s || '').length > 0));
                resolve(fileJson);
            }
        })
    });
}

function unzipSectionalFile(fileFriendlyLocation, zipFileName, sectionalInfoJson) {
    return new Promise((resolve, _) => {
        const zipPath = path.join(__dirname, 'data', fileFriendlyLocation, zipFileName);
        const outputData = {
            version: sectionalInfoJson["edition"][0]["editionNumber"],
            files: []
        }
    
        jetpack.createReadStream(zipPath)
            .pipe(unzip.Parse())
            .on('entry', function (entry) {
                const fileName = entry.path.replace(new RegExp(/[- ]/, 'g'), '_');
                const name = fileName.split(".");
    
                if (name[name.length - 1] === "tif" || name[name.length - 1] === "htm") {
                    const outputFilePath = path.join(__dirname, 'data', fileFriendlyLocation, fileName);
    
                    outputData.files.push(fileName);
                    entry.pipe(jetpack.createWriteStream(outputFilePath));
                } else {
                    entry.autodrain();
                }
            })
            .on('close', function () {
                resolve({
                    zipFileName: zipFileName,
                    fileJson: outputData
                });
                // const outputFilePath = path.join(__dirname, 'data', fileFriendlyLocation, 'file.json');

                // correctMaps(locationName, outputData, () => {
                //     jetpack.writeAsync(outputFilePath, outputData).then(
                //         (_) => {
                //             callback(null, {
                //                 success: true,
                //                 message: 'complete'
                //             });
                //         }
                //     );
                // });
    
                    // }
                // );
            });
    });
}

/**
 * Download the vfr sectional file from the api source
 *
 * @param {*} fileFriendlyLocation the location in the data folder where the files will be saved
 * @param {*} sectionalInfoJson the chart info from the api source
 * @returns promise the resolves with the file zip name
 */
function downloadSectionalFile(fileFriendlyLocation, sectionalInfoJson) {
    return new Promise((resolve, reject) => {
        const zipFile = sectionalInfoJson.edition[0].product.url.split('/').pop().replace(new RegExp(/[- ]/, 'g'), '_');
        const filePath = path.join(__dirname, 'data', fileFriendlyLocation, zipFile);
        const writeStream = jetpack.createWriteStream(filePath);

        http.get(sectionalInfoJson.edition[0].product.url, (res) => {
            const len = parseInt(res.headers['content-length'], 10);
            const total = len / 1048576;
            let current = 0;
            let checkpoint = 10;

            res.pipe(writeStream);

            res.on('data', (chunk) => {
                current += chunk.length;

                progress = (100.0 * current / len).toFixed(2);
                if (progress >= checkpoint) {
                    console.log(`${fileFriendlyLocation}: ${progress}% total ${total}MB`);
                    checkpoint += 10;
                }
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(zipFile);
                } else {
                    reject(userError(`${fileFriendlyLocation} Sectional chart retrieve failed; ${res.statusCode}:${res.statusMessage}`));
                }
            });
        }).on('error', (e) => {
            reject(e);
        });
    });
}

// function downloadAndUpdateFiles(locationName, json, callback) {
//     const fileFriendlyLocation = locationName.replace(new RegExp('-', 'g'), '_').replace(new RegExp(' ', 'g'), '_');
//     jetpack.writeAsync(path.join(__dirname, 'data', fileFriendlyLocation, 'api.json'), json).then(
//         (value) => {
//             const file = path.join(__dirname, 'data', fileFriendlyLocation, json.edition[0].product.url.split('/')[json.edition[0].product.url.split('/').length - 1])
//             const writeStream = jetpack.createWriteStream(file);

//             http.get(json.edition[0].product.url, (innerResponse) => {
//                 const len = parseInt(innerResponse.headers['content-length'], 10);
//                 const total = len / 1048576;
//                 let current = 0;
//                 let checkpoint = 10;

//                 innerResponse.pipe(writeStream);

//                 innerResponse.on('data', (chunk) => {
//                     current += chunk.length;

//                     progress = (100.0 * current / len).toFixed(2);
//                     if (progress >= checkpoint) {
//                         console.log(`${locationName}: ${progress}% total ${total}MB`);
//                         checkpoint += 10;
//                     }
//                 });

//                 innerResponse.on('end', (_) => {

//                     if (innerResponse.statusCode === 200) {
//                         const outputData = {
//                             version: json["edition"][0]["editionNumber"],
//                             files: []
//                         }

//                         fs.createReadStream(file)
//                             .pipe(unzip.Parse())
//                             .on('entry', function (entry) {
//                                 const fileName = entry.path.replace(new RegExp(/[- ]/, 'g'), '_');
//                                 const name = fileName.split(".");
//                                 // const type = entry.type; // 'Directory' or 'File'
//                                 // const size = entry.size;

//                                 if (name[name.length - 1] === "tif" || name[name.length - 1] === "htm") {
//                                     const outputFilePath = path.join(__dirname, 'data', fileFriendlyLocation, fileName);

//                                     outputData.files.push(fileName);
//                                     entry.pipe(jetpack.createWriteStream(outputFilePath));
//                                 } else {
//                                     entry.autodrain();
//                                 }
//                             })
//                             .on('close', function () {
//                                 const outputFilePath = path.join(__dirname, 'data', fileFriendlyLocation, 'file.json');

//                                 // jetpack.removeAsync(file).then(
//                                 //     (_) => {
                            
//                                 correctMaps(locationName, outputData, () => {
//                                     jetpack.writeAsync(outputFilePath, outputData).then(
//                                         (_) => {
//                                             callback(null, {
//                                                 success: true,
//                                                 message: 'complete'
//                                             });
//                                         }
//                                     );
//                                 });

//                                     // }
//                                 // );
//                             });
//                     } else {
//                         callback(`${locationName} Sectional chart retrieve failed; ${res.statusCode}:${res.statusMessage}`, null);
//                     }
//                 });

//             }).on('error', (e) => {
//                 callback(e, null);
//             });
//         }
//     );
// }


/**
 * Remove all the old files stated in the fileJson
 *
 * @param {*} fileFriendlyLocation location in data folder
 * @param {*} fileJson json file containing current data
 * @returns Promise resolves with nothing
 */
function removeOldFiles(fileFriendlyLocation, fileJson) {
    return new Promise((resolve, reject) => {
        if (fileJson === undefined) {
            resolve();
        } else {
            const files = fileJson["files"].map((x) => path.join(__dirname, 'data', fileFriendlyLocation, x));

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


/**
 * Check if the current files in the data folder are current, if not delete old files
 *
 * @param {*} fileFriendlyLocation the location in the data folder
 * @param {*} sectionalInfoJson api result from the vfr sectional api call
 * @returns promise which resolves with the sectionalInfoJson 
 */
function checkIfFileVersionIsCurrent(fileFriendlyLocation, sectionalInfoJson) {
    return new Promise((resolve, reject) => {
        const apiJsonParams = path.join(__dirname, 'data', fileFriendlyLocation, 'file.json');
    
        const apiVersion = sectionalInfoJson["edition"][0]["editionNumber"];
    
        jetpack.readAsync(apiJsonParams, 'json').then(
            (fileJson) => {
                const currentVersion = (fileJson || { version: -1 })["version"];
    
                if (currentVersion === apiVersion) {
                    reject(userError('Map(s) are already current'));
                } else {
                    removeOldFiles(fileFriendlyLocation, fileJson).then(
                        () => resolve(sectionalInfoJson)
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
 * Creates the https get that retrieves the info for the vfr section chart into a promise
 *
 * @param {*} apiOutlet api outlet name
 * @returns promise that resolves with the json output from the api call
 */
function constructApiGetInfo(apiOutlet) {
    return new Promise((resolve, reject) => {
        const result = querystring.stringify({ geoname: apiOutlet, edition: 'current', format: 'tiff' });
    
        const options = {
            hostname: 'soa.smext.faa.gov',
            path: `/apra/vfr/sectional/chart?${result}`,
            encoding: null,
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
                let data = JSON.parse(json);
    
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(userError('Failed to retrieve api sectional data'));
                } 
            });
    
        }).on('error', (e) => {
            reject(e);
        });
    });
}

module.exports = function sectionalPipeline(loc, WorkerCallback) {
    const fileFriendlyLocation = loc.replace(new RegExp(/[- ]/, 'g'), '_');
    
    // first make sure the directory in the data folder exists
    jetpack.dirAsync(path.join(__dirname, 'data', fileFriendlyLocation)).then(
        () => constructApiGetInfo(loc) // now get the vfr sectional chart info from the faa api
    ).then(
        (sectionalInfoJson) => checkIfFileVersionIsCurrent(fileFriendlyLocation, sectionalInfoJson) // check if the current files are current with the info from the sectional chart api, if they aren't current delete all old files
    ).then(
        (sectionalInfoJson) => {
            /**
             * In Paralleld do the following
             * 1) save the info from the api into a file to be check against
             * 2) downoad the zip file stated in the api outlet
             */
            return new Promise((resolve, reject) => {
                async.parallel({
                    write: (callback) => {
                        jetpack.writeAsync(path.join(__dirname, 'data', fileFriendlyLocation, 'api.json'), sectionalInfoJson).then(
                            () => callback(null)
                        ).catch(
                            (reason) => reject(reason)
                        );
                    },
                    download: (callback) => {
                        downloadSectionalFile(fileFriendlyLocation, sectionalInfoJson).then(
                            (data) => callback(null, data)
                        );
                    }
                }, (err, results) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({
                            apiInfo: sectionalInfoJson,
                            zipName: results['download']
                        });
                    }
                });
            });
        }
    ).then(
        (dataObject) => unzipSectionalFile(fileFriendlyLocation, dataObject['zipName'], dataObject['apiInfo']) // unzip the downloaded file
    ).then(
        (params) => {
            return new Promise((resolve, reject) => {
                async.parallel({
                    removeFile: (callback) => {
                        // remove the unecessary zip file
                        jetpack.removeAsync(path.join(__dirname, 'data', fileFriendlyLocation, params['zipFileName'])).then(
                            () => callback(null)
                        ).catch(
                            (reason) => {
                                callback(reason)
                            }
                        )
                    },
                    reproject: (callback) => {
                        // correct the maps by clipping and reprojecting them
                        correctMaps(fileFriendlyLocation, params['fileJson']).then(
                            (fileJson) => callback(null, fileJson)
                        );
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
        (fileJson) => jetpack.writeAsync(path.join(__dirname, 'data', fileFriendlyLocation, 'file.json'), fileJson)
    ).then(
        () => WorkerCallback(null, 'Successfully updated!')
    ).catch(
        (reason) => {
            WorkerCallback(reason);
        }
    )
}