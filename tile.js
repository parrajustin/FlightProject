const path = require('path');
const { spawn } = require('child_process');

module.exports = function generateTiles(zoomLvl, WorkerCallback) {
    const outVrt = path.join(__dirname, 'data', 'combined.vrt');
    const outTiles = path.join(__dirname, 'map');
    const gdal = spawn(`gdal2tiles.py`, ['-s', 'epsg:3857', '-z', zoomLvl, `${outVrt}`, `${outTiles}/`]);

    // console.log(`gdal2tiles.py -s epsg:3857 -z ${zoomLvl} "${outVrt}" "${outTiles}/"`);

    gdal.stdout.on('data', (data) => {
        console.log(`zoom ${zoomLvl}: ${data}`);
    });

    gdal.stderr.on('data', (data) => {
        console.log(`zoom ${zoomLvl} error: ${data}`);
        WorkerCallback(data);
    });

    gdal.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        WorkerCallback(null, zoomLvl);
    });
    // spawn(`gdal2tiles.py -s epsg:3857 -z ${zoomLvl} "${outVrt}" "${outTiles}/"`, (err) => {
    //     if (err) {
    //         WorkerCallback(err);
    //     } else {
    //         WorkerCallback(null, zoomLvl);
    //     }
    // });
}