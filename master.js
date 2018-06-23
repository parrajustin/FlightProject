const workerFarm = require('worker-farm');
// const {exec} = require('child_process');
// const path = require('path');
// const os = require('os');
// const cpuCount = os.cpus().length;

const maxZoom = 10;
const workers = workerFarm(require.resolve('./child'));
// const tileWorkers = workerFarm(require.resolve('./tile'));

// gdalwarp -te_srs epsg:4326 -te -109 3 -102 36.5 test2.tif test2_clipped.tif
// gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te -104 36 -96.625570 40.300664 start.tif start_clipped.tif
const locations = [
    'Albuquerque',
    // 'Anchorage',
    'Atlanta',
    // 'Bethel',
    'Billings', // fixed33
    'Brownsville',
    // 'Cape Lisburne',
    'Charlotte',
    'Cheyenne', // fixed
    'Chicago', // fixed
    'Cincinnati',
    // 'Cold Bay',
    'Dallas-Ft Worth',
    // 'Dawson',
    'Denver',
    'Detroit', // fixed
    // 'Dutch Harbor',
    'El Paso',
    // 'Fairbanks',
    'Great Falls', // fixed
    'Green Bay', // fixed
    'Halifax', // fixed
    // /* test */ // 'Hawaiian Islands',
    'Houston',
    'Jacksonville',
    // 'Juneau',
    'Kansas City',
    // 'Ketchikan',
    'Klamath Falls',
    // 'Kodiak',
    'Lake Huron', // fixed
    'Las Vegas',
    'Los Angeles',
    // 'McGrath',
    'Memphis',
    'Miami',
    'Montreal', // fixed
    'New Orleans',
    'New York', // fixed
    // 'Nome',
    'Omaha', // fixed
    'Phoenix',
    // 'Point Barrow',
    'Salt Lake City', // fixed
    'San Antonio',
    'San Francisco',
    'Seattle', // fixed
    // 'Seward',
    'St Louis',
    'Twin Cities', // fixed
    'Washington',
    // 'Western Aleutian Islands',
    // 'Whitehorse',
    'Wichita',
];

let indexs = Array(...{length: locations.length}).map(Number.call, Number);
let finished = 0;

const zoomArray = Array(...{length: maxZoom + 1}).map(Number.call, Number);
zoomArray.reverse();

// let finishedZoom = 0;
// const tileGenerators = 4;


/**
 *
 *
 */
// function createTiles() {
//     if (zoomArray.length <= 0) {
//         finishedZoom++;
//     }

//     if (finishedZoom > 3) {
//         workerFarm.end(tileWorkers);
//         console.log('ALL DONE WITH TILES');
//     }

//     if (zoomArray.length > 0) {
//         const temp = zoomArray.pop();

//         tileWorkers(temp, (err, zoom) => {
//             if (err) {
//                 console.error(err);
//             } else {
//                 console.log(`FINISHED TILES ZOOM LVL: ${zoom}`);
//                 createTiles();
//             }
//         });
//     }
// }

/**
 * Builds a vrt
 *
 */
// function buildVrt() {
//     const tifPath = path.join(__dirname, 'data', '**', '*.tif');
//     const outVrt = path.join(__dirname, 'data', 'combined.vrt');

//     exec(`gdalbuildvrt -srcnodata 0 "${outVrt}" ${tifPath}`, (err) => {
//         if (err) {
//             console.log(err);
//         } else {
//             console.log(`BUILT COMBINED VRT`);

//             const numOfProcs = tileGenerators > cpuCount ? tileGenerators : cpuCount;
//             for (let i = 0; i < numOfProcs; i++) {
//                 createTiles();
//             }
//         }
//     });
// }

/**
 * Handles creating workers using the worker farm
 *
 */
function createWorker() {
    if (indexs.length <= 0) {
        finished++;
    }

    if (finished > 3) {
        console.log('ALL DONE');
        workerFarm.end(workers);
        // buildVrt();
    }

    if (indexs.length > 0) {
        const temp = indexs.pop();
        workers(locations[temp], function(err, message) {
            if (err && (!err.isUser === true)) {
                throw err;
                createWorker();
            } else if (err) {
                console.log(`${locations[temp]}: ${err}`);
                createWorker();
            } else {
                console.log(`${locations[temp]}: ${message}`);
                createWorker();
            }
        });
    }
}


createWorker();
createWorker();
createWorker();
createWorker();

// locations.forEach((Location) => {
//     var result = querystring.stringify({ geoname: Location, edition: 'current', format: 'tiff' });
//     const options = {
//         hostname: 'soa.smext.faa.gov',
//         path: `/apra/vfr/sectional/chart?${result}`,
//         headers: {
//             'accept': 'application/json',
//             'content-type': 'application/json'
//         }
//     }

//     https.get(options, (res) => {

//         res.on('data', (d) => {
//             let data = JSON.parse(d);

//             if (res.statusCode === 200) {
//                 jetpack.writeAsync(path.join(__dirname, 'data', Location.replace('-', '_').replace(' ', '_'), 'api.json'), data)
// .catch((v) => console.log(v));

//                 http.get(data.edition[0].product.url, (innerResponse) => {
//                     const len = parseInt(innerResponse.headers['content-length'], 10);
//                     const total = len / 1048576;
//                     let current = 0;

//                     let chunks = '';

//                     innerResponse.on('data', (chunk) => {
//                         chunks += chunk;
//                         current += chunk.length;
//                         console.log(`${Location}: ${(100.0 * current / len).toFixed(2)}%`);
//                     });

//                     innerResponse.on('end', (d) => {

//                         if (innerResponse.statusCode === 200) {
//                             const file = path.join(__dirname, 'data', Location.replace('-', '_').replace(' ', '_'), data.edition[0].
// product.url.split('/')[data.edition[0].product.url.split('/').length - 1]);

//                             jetpack.writeAsync(file, chunks).then(
//                                 (value) => {
//                                     console.log(`${Location} done`);
//                                 }
//                             );
//                         }
//                     });

//                 }).on('error', (e) => {
//                     console.error(e);
//                 });
//             }
//         });

//     }).on('error', (e) => {
//         console.error(e);
//     });
// })

