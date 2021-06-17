var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");

/* GET users listing. */
router.get("/", function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render("admin/admin-home", { admin: true, products });
  });
});

router.get("/add-product", (req, res) => {
  res.render("admin/add-product", { admin: true });
});

router.post("/add-product", (req, res) => {
  productHelpers.addProduct(req.body, (proId) => {
    let Image = req.files.Image;
    Image.mv("./public/product-images/" + proId + ".jpg", (err) => {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/admin");
      }
    });
  });
});

router.get("/edit-product/:id", (req, res) => {
  productHelpers.getOneProduct(req.params.id).then((productDetails) => {
    res.render("admin/edit-product", { admin: true, productDetails });
  });
});

router.post("/edit-product/:id", (req, res) => {
  let proId = req.params.id;
  productHelpers.editProduct(req.body, proId).then(() => {
    res.redirect("/admin");
  });
});

router.get("/delete-product/:id", (req, res) => {
  productHelpers.deleteProduct(req.params.id).then(() => {
    res.redirect("/admin");
  });
});

module.exports = router;
