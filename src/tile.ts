import * as path from 'path';
import { spawn } from 'child_process';
const __root = path.join(__dirname, '..');

module.exports = function generateTiles(maxZoom: number, WorkerCallback: (err: Error | undefined, message?: any) => void) {
    const outVrt = path.join(__root, 'data', 'combined.vrt');
    const outTiles = path.join(__root, 'map');
    const gdal = spawn(`python`, [path.join(__root, 'gdal2tiles_parallel.py'), '-s', 'epsg:3857', '--resume', '-z', `0-${maxZoom}`, `${outVrt}`, `${outTiles}/`] as any[]);

    gdal.stdout.on('data', (data) => {
        console.log(`zoom ${maxZoom}: ${data}`);
    });

    gdal.stderr.on('data', (data) => {
        console.log(`${maxZoom} stderr: ${data}`);
    });

    gdal.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        WorkerCallback(null, maxZoom);
    });
}