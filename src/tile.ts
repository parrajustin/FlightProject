import * as path from 'path';
import { spawn } from 'child_process';

module.exports = function generateTiles(zoomLvl: number, WorkerCallback: (err: Error | undefined, message?: any) => void) {
    const outVrt = path.join(__dirname, 'data', 'combined.vrt');
    const outTiles = path.join(__dirname, 'map');
    const gdal = spawn(`python`, ['-m', 'gdal2tiles', '-s', 'epsg:3857', '-z', zoomLvl.toString(), `${outVrt}`, `${outTiles}/`]);

    gdal.stdout.on('data', (data) => {
        console.log(`zoom ${zoomLvl}: ${data}`);
    });

    gdal.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        WorkerCallback(null, zoomLvl);
    });
}