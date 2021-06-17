var db = require("../config/connection");
var collection = require("../config/collection");
const { response } = require("express");
var objectId = require("mongodb").ObjectID;

module.exports = {
  addProduct: (data, callback) => {
    data.Price = parseInt(data.Price);
    db.get()
      .collection(collection.PRODUCT_COLLECTION)
      .insertOne(data)
      .then((response) => {
        callback(response.ops[0]._id);
      });
  },
  getAllProducts: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .find()
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
  getOneProduct: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .findOne({ _id: objectId(proId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  editProduct: (data, proId) => {
    return new Promise((resolve, reject) => {
      data.Price = parseInt(data.Price);
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: objectId(proId) },
          {
            $set: {
              Name: data.Name,
              Category: data.Category,
              Description: data.Description,
              Price: data.Price,
            },
          }
        )
        .then(() => {
          resolve();
        });
    });
  },
  deleteProduct: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .removeOne({ _id: objectId(proId) })
        .then(() => {
          resolve();
        });
    });
  },
};
