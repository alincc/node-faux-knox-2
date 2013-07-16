var fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    mkdirp = require('mkdirp');

exports.createClient = function(config){
  function Client(config){
    if (!config) config = {};
    if (!config.bucket) {
      config.bucket = './';
    } else {
      if (config.bucket[config.bucket.length - 1] !== '/') {
        config.bucket = config.bucket + '/';
      }
    }
    Client.prototype.getFile = function(uri, headers, callback){
        var stream = fs.createReadStream(config.bucket + uri);
        function cancelLocalListeners(){
          stream.removeListener('error', bad);
          stream.removeListener('readable', good);
        }
        function bad(e){
          cancelLocalListeners();
          if(e.code === 'ENOENT') {
            return callback(null, {statusCode: 404});
          }
        }
        function good(){
          stream.headers = headers;
          stream.statusCode = 200;
          cancelLocalListeners();
          return callback(null, stream);
        }
        stream.on('error', bad);
        stream.on('readable', good);
    };

    Client.prototype.putFile = function(from, to, callback){
      function checkToPath(cb){
        var splitPath = to.split('/');
        var dirPath = config.bucket + _.initial(splitPath, 1).join('/');
        fs.exists(dirPath, function(exists){
          return exists ? cb() : mkdirp(dirPath, cb);
        });
      }
      function checkFromPath(cb){
        fs.exists(from, function(exists){
          cb(exists ? void 0 : {code:'ENOENT'});
        });
      };
      async.series([checkFromPath, checkToPath], function(err){
        if (err) {
          return callback(err);
        }
        var r = fs.createReadStream(from),
            w = fs.createWriteStream(config.bucket + to);
        w.on('finish', function(){
          callback(null, {headers:{statusCode:201}});
        });
        w.on('error', function(e){
          callback(null, {headers:{statusCode:404}});
        });
        r.pipe(w);
      });
    }
    Client.prototype.putBuffer = function(){}
    Client.prototype.deleteFile = function(){}
  }
  return new Client(config);
};


