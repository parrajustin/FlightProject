const https = require('https');
const http = require('http');
const jetpack = require('fs-jetpack');
const path = require('path');
const querystring = require("querystring");
const fs = require('fs');
const unzip = require('node-unzip-2');
// const gdal = require("gdal");

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

function correctMaps(locationName, fileJson, callback) {
    console.log(locationName, fileJson);
    callback();
}

/**
 * Downloads and updates the files in the data directory
 *
 * @param {*} locationName name of the directory/api location
 * @param {*} json contians the information from the faa api outlet
 * @param {*} callback used to signify erros or when the worker is done
 */
function downloadAndUpdateFiles(locationName, json, callback) {
    const fileFriendlyLocation = locationName.replace(new RegExp('-', 'g'), '_').replace(new RegExp(' ', 'g'), '_');
    jetpack.writeAsync(path.join(__dirname, 'data', fileFriendlyLocation, 'api.json'), json).then(
        (value) => {
            const file = path.join(__dirname, 'data', fileFriendlyLocation, json.edition[0].product.url.split('/')[json.edition[0].product.url.split('/').length - 1])
            const writeStream = jetpack.createWriteStream(file);

            http.get(json.edition[0].product.url, (innerResponse) => {
                const len = parseInt(innerResponse.headers['content-length'], 10);
                const total = len / 1048576;
                let current = 0;
                let checkpoint = 10;

                innerResponse.pipe(writeStream);

                innerResponse.on('data', (chunk) => {
                    current += chunk.length;

                    progress = (100.0 * current / len).toFixed(2);
                    if (progress >= checkpoint) {
                        console.log(`${locationName}: ${progress}% total ${total}MB`);
                        checkpoint += 10;
                    }
                });

                innerResponse.on('end', (_) => {

                    if (innerResponse.statusCode === 200) {
                        const outputData = {
                            version: json["edition"][0]["editionNumber"],
                            files: []
                        }

                        fs.createReadStream(file)
                            .pipe(unzip.Parse())
                            .on('entry', function (entry) {
                                const fileName = entry.path;
                                const name = fileName.split(".");
                                // const type = entry.type; // 'Directory' or 'File'
                                // const size = entry.size;

                                if (name[name.length - 1] === "tif" || name[name.length - 1] === "htm") {
                                    const outputFilePath = path.join(__dirname, 'data', fileFriendlyLocation, fileName);

                                    outputData.files.push(fileName);
                                    entry.pipe(jetpack.createWriteStream(outputFilePath));
                                } else {
                                    entry.autodrain();
                                }
                            })
                            .on('close', function () {
                                const outputFilePath = path.join(__dirname, 'data', fileFriendlyLocation, 'file.json');

                                // jetpack.removeAsync(file).then(
                                //     (_) => {
                            
                                correctMaps(locationName, outputData, () => {
                                    jetpack.writeAsync(outputFilePath, outputData).then(
                                        (_) => {
                                            callback(null, {
                                                success: true,
                                                message: 'complete'
                                            });
                                        }
                                    );
                                });

                                    // }
                                // );
                            });
                    } else {
                        callback(`${locationName} Sectional chart retrieve failed; ${res.statusCode}:${res.statusMessage}`, null);
                    }
                });

            }).on('error', (e) => {
                callback(e, null);
            });
        }
    );
}

/**
 * Recursive Function that removes all files declared in the files array
 *
 * @param {*} files string[] contains all file names that should be removed
 * @param {*} locationName directory in data that contains the files
 * @param {*} callback callback to make this function async
 */
function removeFiles(files, locationName, callback) {
    if (files.length > 0) {
        const temp = files.pop();
        const fileFriendlyLocation = locationName.replace(new RegExp('-', 'g'), '_').replace(new RegExp(' ', 'g'), '_');
        const fileName = path.join(__dirname, 'data', fileFriendlyLocation, temp);
        jetpack.removeAsync(fileName).then(
            () => {
                removeFiles(files, locationName, callback);
            }
        );
    } else {
        callback();
    }
}


/**
 * Wrapper function for removing files from the fileJson    
 *
 * @param {*} locationName directory in data that contains the files
 * @param {*} fileJson json storage that contains the directory information
 * @param {*} callback callback to be used when the function is done
 */
function removeOldFiles(locationName, fileJson, callback) {
    if (fileJson === undefined) {
        callback();
    } else {
        const files = fileJson["files"];
        removeFiles(files, locationName, () => {
            callback();
        });
    }
}


/**
 * Checks if the current files in teh directory are up to date or not, if they are it'll stop the process
 * otherwise it'll continue and download the new files
 *
 * @param {*} locationName Directory/api location name
 * @param {*} json contains the info from the faa api 
 * @param {*} callback used to say when the worker is done
 */
function checkIfFileVersionIsCurrent(locationName, json, callback) {
    const fileFriendlyLocation = locationName.replace(new RegExp('-', 'g'), '_').replace(new RegExp(' ', 'g'), '_');
    const apiJsonParams = path.join(__dirname, 'data', fileFriendlyLocation, 'file.json');

    const apiVersion = json["edition"][0]["editionNumber"];

    jetpack.readAsync(apiJsonParams, 'json').then(
        (fileJson) => {
            const currentVersion = (fileJson || { version: -1 })["version"];

            if (currentVersion === apiVersion) {
                callback(null, {
                    success: true,
                    message: 'Tiffs are current'
                });
            } else {
                removeOldFiles(locationName, fileJson, () => {
                    downloadAndUpdateFiles(locationName, json, callback);
                });
            }
        }
    );
}


/**
 * Creates the https get that retrieves the info for the vfr section chart into a promise
 *
 * @param {*} apiOutlet api outlet name
 * @returns
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
                    reject(new Error('Failed to retrieve api sectional data'));
                }
                // if (res.statusCode === 200) {
                //     jetpack.dirAsync(path.join(__dirname, 'data', fileFriendlyLocation)).then(
                //         () => {
                //             checkIfFileVersionIsCurrent(loc, data, callback);
                //         }
                //     );
    
                // } else {
                //     callback(`${loc} Sectional chart info failed; ${res.statusCode}:${res.statusMessage}`, null);
                // }
            });
    
        }).on('error', (e) => {
            // callback(e, null);
            reject(e);
        });
    });
}

module.exports = function (loc, callback) {
    const fileFriendlyLocation = loc.replace(new RegExp('-', 'g'), '_').replace(new RegExp(' ', 'g'), '_');

    constructApiGetInfo(loc).then(
        (data) => {
            return new Promise((resolve, _) => {
                jetpack.dirAsync(path.join(__dirname, 'data', fileFriendlyLocation)).then(
                    () => {
                        resolve(data);
                    }
                )
            });
        }
    ).then(
        (data) => {
            checkIfFileVersionIsCurrent(loc, data, callback);
        }
    ).catch(
        (reason) => {
            callback(reason);
        }
    )
}