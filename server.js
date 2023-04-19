const express = require("express");
const cors = require("cors");
const multer = require("multer");
const app = express();
const routersImage = require("./routes/imageRouter");
app.use("/v2/product", routersImage);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const statsd = require("node-statsd");

const statsdClient=new statsd(
  {host: 'localhost',
  port: 8125}
)

const routers = require("./routes/userRouter.js");
app.use("/v2/user", routers);

const routersProduct = require("./routes/productRouter");
app.use("/v2/product", routersProduct);

var portfinder = require("portfinder");
// const { routes } = require('.')

portfinder.getPort(function (err, port) {
  process.env.PORT = port;
  app.listen(port, () => console.log(`Server Started on port ${port}...`));
});

app.get("/healthz", async (req, res) => {
  statsdClient.increment('GET.healthz.count');
  res.status(200).send("OK");
});

app.get("/cloudhealthz", async (req, res) => {
  statsdClient.increment('GET.cloudhealthz.count');
  res.status(200).send("OK");
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ message: 'Invalid field name for file upload' });
  } else {
    next(err);
  }
});

module.exports = app;
