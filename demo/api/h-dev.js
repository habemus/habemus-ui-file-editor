// native
const path = require('path');

// third-party
const createHFs = require('h-fs');
const Bluebird  = require('bluebird');

// constants
const FS_ROOT_PATH = path.join(__dirname, '../files');
const H_DEV_DELAY  = 500;

function _toArray(obj) {
  return Array.prototype.slice.call(obj, 0);
}

var hFs = createHFs(FS_ROOT_PATH);

var hDevAPI = {
  readFile: hFs.readFile.bind(hFs),
  createFile: hFs.createFile.bind(hFs),
  updateFile: hFs.updateFile.bind(hFs),

  readDirectory: hFs.readDirectory.bind(hFs),
  createDirectory: hFs.createDirectory.bind(hFs),
  remove: hFs.remove.bind(hFs),
  move: hFs.move.bind(hFs),
}

hDevAPI.subscribe = function () {
  // console.log('subscribe', arguments);
  return hFs.on.apply(hFs, _toArray(arguments));
};

hDevAPI.startWatching = function () {
  // console.log('startWatching', arguments);
  return Bluebird.resolve();
};

hDevAPI.stopWatching = function () {
  // console.log('stopWatching', arguments);
  return Bluebird.resolve();
};

if (H_DEV_DELAY) {

  Object.keys(hDevAPI).forEach(function (methodName) {
    if (typeof hDevAPI[methodName] === 'function') {
      var originalMethod = hDevAPI[methodName];

      hDevAPI[methodName] = function () {
        var args = Array.prototype.slice.call(arguments, 0);

        return new Bluebird(function (resolve, reject) {
          setTimeout(resolve, H_DEV_DELAY);
        })
        .then(function () {
          return originalMethod.apply(hDevAPI, args);
        });
      }
    }
  });
}

// set implementation specific methods
hDevAPI.projectRootURL = 'file://' + FS_ROOT_PATH;

// TODO: expose only methods required by happiness tree
// so that we are always sure of which methods are required
module.exports = hDevAPI;
