const path = require('path');
const { exec } = require('child_process');
const jetpack = require('fs-jetpack');
const _ = require('lodash');

const data = path.join(__dirname, 'data', 'Wichita', 'Wichita SEC 100.htm');

const inImg = path.join(__dirname, 'data', 'Wichita', 'Wichita SEC 100.tif');
const outImg = path.join(__dirname, 'data', 'Wichita', 'Wichita SEC 100.clipped.tif');
const numCheck = RegExp(/[-\d.]/);

function isNumber(input) {
    return !input.match(numCheck) === false;
}

function getNumber(string, start) {
    let num = '';

    for (let i = start; isNumber(string[i]); i++) {
        num += string[i];
    }

    return parseFloat(num, 10);
}

jetpack.readAsync(data).then(
    (value) => {
        console.log('b');
        const innerbody = value.match(new RegExp(/<body>(.*)<\/body>/s))[1].replace(new RegExp('\r\n', 'g'), '').replace(new RegExp(' ', 'g'), '');

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

        const westNumber = Math.ceil(getNumber(subString, westIndex + westBound.length));
        const eastNumber = getNumber(subString, eastIndex + eastBound.length);
        const southNumber = Math.ceil(getNumber(subString, southIndex + southBound.length));
        const northNumber = getNumber(subString, northIndex + northBound.length);

        exec(`gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te ${westNumber} ${southNumber} ${eastNumber} ${northNumber} "${inImg}" "${outImg}"`, (err, stdout, stderr) => {
          if (err) {
            // node couldn't execute the command
            console.log(err);
            return;
          }
        
          // the *entire* stdout and stderr (buffered)
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
        });

        // gdalwarp -t_srs epsg:3857 -te_srs epsg:4326 -te -104 36 -96.625570 40.300664 start.tif start_clipped.tif

    }
);

// const gdal = require("gdal");
// gdal.verbose();

// const fileIn = path.join(__dirname, 'start.tif');
// const fileOut = path.join(__dirname, 'test.tif');

// const dataSetIn = gdal.open(fileIn);

// // data set in properties
// const width =  dataSetIn.rasterSize.x;
// const height =  dataSetIn.rasterSize.y;
// console.log(width);
// console.log(height);
// // process.exit();
// const geoTransform = dataSetIn.geoTransform;
// const s_srs = dataSetIn.srs;

// const t_srs = gdal.SpatialReference.fromUserInput('EPSG:4326');

// var tr = {x: 1, y: 1}; // target resolution
// var tx = new gdal.CoordinateTransformation(s_srs, t_srs);
// // var cutline = cutline_ds.layers.get(0).features.get(0).getGeometry();

// // transform cutline to source dataset px/line coordinates
// // var geotransformer = new gdal.CoordinateTransformation(t_srs, src);
// // cutline.transform(geotransformer);

// // compute output geotransform / dimensions
// var ul = tx.transformPoint(geoTransform[0], geoTransform[3]);
// var ur = tx.transformPoint(geoTransform[0] + geoTransform[1] * width, geoTransform[3]);
// var lr = tx.transformPoint(geoTransform[0] + geoTransform[1] * width, geoTransform[3] + geoTransform[5] * height);
// var ll = tx.transformPoint(geoTransform[0], geoTransform[3] + geoTransform[5] * height);

// // var extent = new gdal.Polygon();
// // var ring = new gdal.LinearRing();
// // ring.points.add([ul, ur, lr, ll, ul]);
// // extent.rings.add(ring);
// // extent = extent.getEnvelope();
// // console.log(extent);
// // process.exit();

// var tw = Math.ceil(Math.max(ul.x, ur.x, lr.x, ll.x) - Math.min(ul.x, ur.x, lr.x, ll.x));
// var th = Math.ceil(Math.max(ul.y, ur.y, lr.y, ll.y) - Math.min(ul.y, ur.y, lr.y, ll.y));

// var datatype = dataSetIn.bands.get(1).dataType;
// var dst = gdal.open(fileOut, 'w', 'GTiff', tw, th, dataSetIn.bands.count(), datatype);
// dst.srs = t_srs;
// dst.geoTransform = [
//     Math.min(ul.x, ur.x, lr.x, ll.x), tr.x, geoTransform[2],
//     Math.max(ul.y, ur.y, lr.y, ll.y), geoTransform[4], -tr.y
// ];
// const ouput = gdal.suggestedWarpOutput({
//     src: dataSetIn,
//     s_srs: s_srs,
//     t_srs: t_srs
// });

// console.log(ouput);
// console.log(dst.geoTransform);
// console.log(tw);
// console.log(th);

// process.exit();
// console.log('a');
// // warp
// gdal.reprojectImage({
//     src: dataSetIn,
//     dst: dst,
//     s_srs: s_srs,
//     t_srs: t_srs,
//     // resampling: gdal.GRA_Bilinear,
//     // cutline: cutline,
//     // dstAlphaBand: 1,
//     // blend: 0,
// });
// console.log('b');
// dataSetIn.close();
// dst.close();

// // const ouput = gdal.suggestedWarpOutput({
// //     src: dataSetIn,
// //     s_srs: spartialSrc,
// //     t_srs: t_srs
// // });

// // console.log(ouput);
// // console.log(dataSetIn.rasterSize)

// // var datatype = dataSetIn.bands.get(1).dataType;
// // const dataSetOut = gdal.open(fileOut, "w", "GTiff", ouput["rasterSize"]["x"], ouput["rasterSize"]["y"], dataSetIn.bands.count(), datatype);
// // dataSetOut.geoTransform = ouput["geoTransform"];

// // gdal.reprojectImage({
// //     src: dataSetIn,
// //     dst: dataSetOut,
// //     s_srs: spartialSrc,
// //     t_srs: t_srs
// // });

// // dataSetOut.close();
// // dataSetIn.close();