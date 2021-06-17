var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
router.get("/", async (req, res, next) => {
  var user = req.session.user;
  let loggedIn = req.session.loggedIn;
  var cartCount = 0;
  if (req.session.loggedIn) {
    cartCount = await userHelpers.cartCount(req.session.user._id);
  }

  productHelpers.getAllProducts().then((products) => {
    res.render("user/home", { products, user, loggedIn, cartCount });
  });
});

router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", { err: req.session.loginErr });
    req.session.loginErr = false;
  }
});

router.post("/signup", (req, res) => {
  userHelpers.doSignup(req.body).then((userData) => {
    req.session.user = userData;
    req.session.loggedIn = true;
    res.redirect("/");
  });
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status == true) {
      req.session.user = response.data;
      req.session.loggedIn = true;
      res.redirect("/");
    } else {
      req.session.loginErr = true;
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.loggedIn = false;
  req.session.user = null;
  res.redirect("/");
});

router.get("/add-to-cart/:id", verifyLogin, (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.redirect("/");
  });
});

router.get("/cart", verifyLogin, async (req, res) => {
  let totalPrice = await userHelpers.getTotalAmount(req.session.user._id);
  userHelpers
    .getCartProduct(req.session.user._id)
    .then((cartItems) => {
      res.render("user/cart", {
        cartItems,
        totalPrice,
        user: req.session.user._id,
      });
    })
    .catch((err) => {
      res.render("user/cart", { err });
    });
});

router.post("/change-product-quantity", (req, res) => {
  userHelpers.changeProQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.userId);
    res.json(response);
  });
});

router.post("/remove-one-product", (req, res) => {
  userHelpers.removeOneProduct(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.userId);
    res.json(response);
  });
});

router.get("/place-order", verifyLogin, async (req, res) => {
  let totalAmount = await userHelpers.getTotalAmount(req.session.user._id);
  res.render("user/place-order", { totalAmount });
});

router.post("/place-order", verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProductList(req.session.user._id);
  let totalAmount = await userHelpers.getTotalAmount(req.session.user._id);
  userHelpers
    .placeOrder(req.body, req.session.user._id, products, totalAmount)
    .then((orderId) => {
      if (req.body["payment-method" == "COD"]) {
        res.json({ status: true });
      } else {
        userHelpers.generateRazorpay(orderId, totalAmount).then((order) => {
          res.json(order);
        });
      }
    });
});

router.get("/order-success", (req, res) => {
  res.render("user/order-success");
});

router.get("/orders", async (req, res) => {
  let orderDetails = await userHelpers.getOrderDetails(req.session.user._id);
  console.log(orderDetails);
  res.render("user/orders", { orderDetails });
});

router.post("/verify-payment", (req, res) => {
  console.log(req.body);
});

module.exports = router;
