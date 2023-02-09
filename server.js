const express = require("express");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routers = require("./routes/userRouter.js");
app.use("/v1/user", routers);

const routersProduct = require("./routes/productRouter");
app.use("/v1/product", routersProduct);

var portfinder = require("portfinder");
// const { routes } = require('.')

portfinder.getPort(function (err, port) {
  process.env.PORT = port;
  app.listen(port, () => console.log(`Server Started on port ${port}...`));
});

app.get("/healthz", async (req, res) => {
  res.status(200).send("OK");
});

module.exports = app;
