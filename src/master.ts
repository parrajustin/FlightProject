import * as workerFarm from 'worker-farm';
import { map, filter, flatten } from 'lodash';
import { exec } from 'child_process';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import { INode } from 'fs-jetpack/interfaces';

const maxZoom = 12;
const workers = workerFarm(require.resolve('./child'));
const tileWorkers = workerFarm(require.resolve('./tile'));
const __root = path.join(__dirname, '..');

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

let indexs = map(Array(locations.length), (_, index) => index);
let finished = 0;


function createTiles() {
    tileWorkers(maxZoom, (err, zoom) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`FINISHED TILES ZOOM LVL: ${zoom}`);
        }
    });
}

/**
 * Builds a vrt
 *
 */
function buildVrt() {
    const outVrt = path.join(__root, 'data', 'combined.vrt');

    jetpack.inspectTreeAsync(path.join(__root, 'data')).then(
        (files) => {
            const tiffs = flatten(map(filter(files.children, (f: INode) => f.type === 'dir'), (directory: INode) => {
                const tifImage = filter(directory.children, (f: INode) => f.type === 'file' && f.name.indexOf('final.tif') !== -1);
                const tifNames = map(tifImage, (f: INode) => path.join(__root, 'data', directory.name, f.name));

                return tifNames;
            }));

            const tifPath = tiffs.join(' ');
            exec(`gdalbuildvrt -srcnodata 0 "${outVrt}" ${tifPath}`, (err) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(`BUILT COMBINED VRT`);
                    createTiles();
                }
            });
        }
    )


}

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
        buildVrt();
    }

    if (indexs.length > 0) {
        const temp = indexs.pop();
        workers(locations[temp], function (err, message) {
            if (err && (!err.isUser === true)) {
                console.error(err);
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
