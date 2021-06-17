var collection = require("../config/collection");
var db = require("../config/connection");
var bcrypt = require("bcrypt");
var objectId = require("mongodb").ObjectID;
const Razorpay = require("razorpay");

var instance = new Razorpay({
  key_id: "rzp_test_7f6qT5mKBxSRTA",
  key_secret: "lzyKnVtRFbmf27hMT1aQCKFu",
});

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.Password = await bcrypt.hash(userData.Password, 10);
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((response) => {
          resolve(response.ops[0]);
        });
    });
  },
  doLogin: (body) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: body.Email });
      if (user) {
        bcrypt.compare(body.Password, user.Password, (err, result) => {
          if (result) {
            resolve({ status: true, data: user });
          } else {
            resolve({ status: false });
          }
        });
      } else {
        resolve({ status: false });
      }
    });
  },
  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { "products.item": objectId(proId), user: objectId(userId) },
              { $inc: { "products.$.quantity": 1 } }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              { $push: { products: proObj } }
            )
            .then(() => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  getCartProduct: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(cartItems);
    });
  },
  cartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });

      if (cart) {
        count = cart.products.length;
        resolve(count);
      } else {
        resolve(count);
      }
    });
  },
  changeProQuantity: (body) => {
    return new Promise((resolve, reject) => {
      let cartId = body.cartId;
      let proId = body.proId;
      let count = parseInt(body.count);
      let quantity = body.quantity;

      if (count == -1 && quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(cartId) },
            { $pull: { products: { item: objectId(proId) } } }
          )
          .then(() => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(cartId), "products.item": objectId(proId) },
            { $inc: { "products.$.quantity": count } }
          )
          .then((response) => {
            resolve({ removeProduct: false });
          });
      }
    });
  },
  removeOneProduct: (body) => {
    return new Promise((resolve, reject) => {
      let cartId = body.cartId;
      let proId = body.proId;

      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(cartId) },
          { $pull: { products: { item: objectId(proId) } } }
        )
        .then(() => {
          resolve({ status: true });
        });
    });
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ["$quantity", "$product.Price"] } },
            },
          },
        ])
        .toArray();
      resolve(total[0].total);
    });
  },
  placeOrder: (data, userId, products, total) => {
    return new Promise((resolve, reject) => {
      let status = data["payment-method"] === "COD" ? "placed" : "pending";
      let cartObj = {
        deliveryDetails: {
          mobiles: data.Mobile,
          address: data.Address,
          pincode: data.pincode,
        },
        user: userId,
        paymentMethod: data["payment-method"],
        products: products,
        status: status,
        total: total,
      };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(cartObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .removeOne({ user: objectId(userId) });
          resolve(response.ops[0]._id);
        });
    });
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart.products);
    });
  },
  getOrderDetails: (userId) => {
    return new Promise(async (resolve, reject) => {
      console.log(userId);
      let orders = await db
        .get()
        .collection("orders")
        .find({ user: objectId(userId) })
        .toArray();
      resolve(orders);
    });
  },
  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: parseInt(total) * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: "" + orderId,
      };
      instance.orders.create(options, function (err, order) {
        resolve(order);
      });
    });
  },
  verifyPayment: (order) => {
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");

      var generatedSignature = crypto
        .createHmac("SHA256", "lzyKnVtRFbmf27hMT1aQCKFu")
        .update(order.orderId + "|" + order.payId)
        .digest("hex");

      if (generatedSignature == order.signature) {
        resolve();
      }
    });
  },
};
