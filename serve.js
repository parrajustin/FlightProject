const workerFarm = require('worker-farm');
const workers = workerFarm(require.resolve('./child'))

// gdalwarp -te_srs epsg:4326 -te -109 3 -102 36.5 test2.tif test2_clipped.tif
// gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te -104 36 -96.625570 40.300664 start.tif start_clipped.tif
const locations = [
    // 'Albuquerque',
    // 'Anchorage',
    // 'Atlanta',
    // 'Bethel',
    // 'Billings',
    // 'Brownsville',
    // 'Cape Lisburne',
    // 'Charlotte',
    // 'Cheyenne',
    // 'Chicago',
    // 'Cincinnati',
    // 'Cold Bay',
    // 'Dallas-Ft Worth',
    // 'Dawson',
    // 'Denver',
    // 'Detroit',
    // 'Dutch Harbor',
    // 'El Paso',
    // 'Fairbanks',
    // 'Great Falls',
    // 'Green Bay',
    // 'Halifax',
    // 'Hawaiian Islands',
    // 'Houston',
    // 'Jacksonville',
    // 'Juneau',
    // 'Kansas City',
    // 'Ketchikan',
    // 'Klamath Falls',
    // 'Kodiak',
    // 'Lake Huron',
    // 'Las Vegas',
    // 'Los Angeles',
    // 'McGrath',
    // 'Memphis',
    // 'Miami',
    // 'Montreal',
    // 'New Orleans',
    // 'New York',
    // 'Nome',
    // 'Omaha',
    // 'Phoenix',
    // 'Point Barrow',
    // 'Salt Lake City',
    // 'San Antonio',
    // 'San Francisco',
    // 'Seattle',
    // 'Seward',
    // 'St Louis',
    // 'Twin Cities',
    'Washington',
    'Western Aleutian Islands',
    'Whitehorse',
    'Wichita'
]

let indexs = Array.apply(null, {length: locations.length}).map(Number.call, Number);
let finished = 0;

function createWorker() {

    if (indexs.length <= 0) {
        finished++;
    }

    if (finished > 3) {
        console.log("ALL DONE");
        workerFarm.end(workers);
    }

    if (indexs.length > 0) {
        const temp = indexs.pop();
        workers(locations[temp], function (err, outp) {
            if (err) {
                console.log('Error: ' + err);
                createWorker();
            } else if (outp.error) {
                console.log('Error: ' + outp.error);
                createWorker();
            } else {    
                console.log(`${locations[temp]}: ${outp.message}`);
                createWorker();
            }
        })
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
//                 jetpack.writeAsync(path.join(__dirname, 'data', Location.replace('-', '_').replace(' ', '_'), 'api.json'), data).catch((v) => console.log(v));

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
//                             const file = path.join(__dirname, 'data', Location.replace('-', '_').replace(' ', '_'), data.edition[0].product.url.split('/')[data.edition[0].product.url.split('/').length - 1]);

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




