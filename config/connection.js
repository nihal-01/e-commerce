var MongoClient = require("mongodb").MongoClient;

let data = {
  db: null,
};

module.exports.connect = function (callback) {
  var url = "mongodb://localhost:27017";
  var dbname = "mongo";

  MongoClient.connect(url, (err, client) => {
    if (err) {
      callback(err);
    } else {
      data.db = client.db(dbname);
      callback();
    }
  });
};

module.exports.get = () => {
  return data.db;
};
