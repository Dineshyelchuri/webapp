const db = require("../model");
const bcrypt = require("bcrypt");
const { users } = require("../model");
const statsd = require("node-statsd");
const winston = require("winston");


// const logger = winston.createLogger({
//   // level: 'info', // Set the logging level
//   format: winston.format.json(), // Set the log format to JSON
//   transports: [
//     new winston.transports.Console(), // Log to the console
//     new winston.transports.File({ filename: /logs/webapp_user_stories.log }) // Log to a file
//   ]
// });

const path = require('path');

const logsFolder = path.join(__dirname, '../logs');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logsFolder, 'csye6225.log') })
  ]
});

const statsdClient=new statsd(
  {host: 'localhost',
  port: 8125}
)



const User = db.users;

let isEmail = (email) => {
  var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (email.match(emailFormat)) {
    return true;
  }
  return false;
};

//Password Regex : min 8 letter password, with at least a symbol, upper and lower case letters and a number
let checkPassword = (str) => {
  var passRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
  console.log(str);
  return str.match(passRegex);
};

//Name Validation
let checkName = (str) => {
  var regName = /^[a-zA-Z]+$/;
  return str != "" && str.match(regName);
};

let encryptedPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

const adduser = async (req, res) => {
  statsdClient.increment('POST.adduser.count');
  logger.log('info', 'welcome to user adduser API end point');
  const allowedParams = ["first_name", "last_name", "password", "username"];
  const receivedParams = Object.keys(req.body);
  const unwantedParams = receivedParams.filter(
    (param) => !allowedParams.includes(param)
  );
  const notReceivedParams = allowedParams.filter(
    (param) => !receivedParams.includes(param)
  );
  console.log(notReceivedParams);
  console.log(allowedParams);
  console.log(unwantedParams);
  console.log(receivedParams);
  if (unwantedParams.length) {
    res.status(400).send({
      error: `The following parameters are not allowed: ${unwantedParams.join(
        ", "
      )}`,
    });
  } else if (notReceivedParams.length) {
    res.status(400).send({
      error: `The following required parameters are not received: ${notReceivedParams.join(
        ", "
      )}`,
    });
  } else {
    const firstName = req.body.first_name;
    const lastName = req.body.last_name;
    const username = req.body.username;
    const password = req.body.password;
    let hashedPassword = "";
    if (password != undefined && password != "" && password != null)
      hashedPassword = encryptedPassword(req.body.password);

    if (username == undefined || username == "" || !isEmail(username))
      res.status(400).send("Please enter valid email");
    else if (
      password == undefined ||
      password == "" ||
      !checkPassword(password)
    )
      res.status(400).send("Please enter a valid password");
    else if (
      firstName == undefined ||
      firstName == "" ||
      lastName == undefined ||
      lastName == "" ||
      !(checkName(firstName) && checkName(lastName))
    )
      res.status(400).send("Please enter valid First and Last Names");
    else {
      let existingUser = await User.findOne({
        where: {
          username: username,
        },
      });
      if (!existingUser) {
        let info = {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          username: req.body.username,
          password: hashedPassword,
        };
        const user = await User.create(info);
        let newUser = await User.findOne({
          where: {
            username: username,
          },
        });
        console.log("-> Created New User:");
        logger.info('created new user');
        logger.info(newUser.id);
        console.log(newUser.id);
        res.status(201).send({
          id: newUser.id,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          username: newUser.username,
          account_created: newUser.account_created,
          account_updated: newUser.account_updated,
        });
      } else {
        logger.error('User Already exists');
        console.log("-> User Already Exists");
        res.status(400).send("User Already Exists");
      }
    }
  }
};

const getuser = async (req, res) => {
  statsdClient.increment('GET.getuser.count');
  logger.info('this is getuser API end point');
  const userId = req.params.userId;
  let authheader = req.headers.authorization;
  if (!authheader) {
    res.status(401).send("Unauthorized");
  } else {
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];

    if (!isEmail(username)) {
      logger.error('please enter a valid email');
      res.status(401).send("Authentication Failed, Please enter a valid email");
    } else {
      let userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        console.log("------> User Not Found");
        res.status("User Not Found").sendStatus(401);
      } else if (userId != userDetails.id) {
        res.status("Forbidden").sendStatus(403);
      } else {
        bcrypt.compare(password, userDetails.password, (err, resu) => {
          if (err) throw err;
          if (resu && username == userDetails.username) {
            console.log("Authentication Successful");
            console.log(resu);
            res.status(200).send({
              id: userDetails.id,
              first_name: userDetails.first_name,
              last_name: userDetails.last_name,
              username: userDetails.username,
              account_created: userDetails.account_created,
              account_updated: userDetails.account_updated,
            });
          } else {
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
  }
};

const updateuser = async (req, res) => {
  statsdClient.increment('PUT.updateuser.count');
  logger.info('this is updateuser API endpoint which modifies user data');
  const allowedParams = ["first_name", "last_name", "password"];
  const receivedParams = Object.keys(req.body);
  const unwantedParams = receivedParams.filter(
    (param) => !allowedParams.includes(param)
  );

  //   console.log(allowedParams);
  //   console.log(unwantedParams);
  //   console.log(receivedParams);

  const userId = req.params.userId;
  let firstName = req.body.first_name;
  let lastName = req.body.last_name;
  let passwordBody = req.body.password;
  let authheader = req.headers.authorization;
  let hashedPassword = "";

  if (passwordBody != undefined && passwordBody != "" && passwordBody != null) {
    hashedPassword = encryptedPassword(req.body.password);
  }

  if (!authheader) {
    logger.error('Unauthorized');
    res.status(401).send("Unauthorized");
  } else {
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];

    if (!isEmail(username)) {
      logger.error('Authentication failed, please enter a valid email');
      res.status(401).send("Authentication Failed, Please enter valid email");
    } else {
      let userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
        logger.warn('user not found in database');
        console.log("->User not found");
        res.status(401).send("User Not Found");
      } else if (userId != userDetails.id) {
        res.status("Forbidden").sendStatus(403);
      } else {
        bcrypt.compare(password, userDetails.password, (err, resu) => {
          if (err) throw err;
          if (firstName == undefined || firstName == "")
            firstName = userDetails.first_name;
          if (lastName == undefined || lastName == "")
            lastName = userDetails.last_name;
          if (passwordBody == undefined || passwordBody == "")
            hashedPassword = userDetails.password;

          if (resu && username == userDetails.username) {
            logger.info('Authentication Successful');
            console.log("Authentication Successful");

            if (unwantedParams.length) {
              logger.error('please remove unwanted paraemeters from the request');
              res.status(400).send({
                error: `The following parameters are not allowed: ${unwantedParams.join(
                  ", "
                )}`,
              });
            } else {
              let upinfo = {
                first_name: firstName,
                last_name: lastName,
                password: hashedPassword,
              };
              if (
                passwordBody != null &&
                passwordBody != "" &&
                !checkPassword(passwordBody)
              ) {
                logger.error('Please enter valid password');
                res.status(400).send("Please enter valid password");
              } else if (!(checkName(firstName) && checkName(lastName)))
                res.status(400).send("Please enter valid First and Last Names");
              else {
                const user = User.update(upinfo, {
                  where: {
                    id: userId,
                  },
                });
                logger.info('user data has updated successfully');
                res.status(204).send(user);
              }
            }
          } else {
            console.log("Authentication Failed");
            res.status(401).send("Authentication Failed");
          }
        });
      }
    }
  }
};

module.exports = {
  adduser,
  updateuser,
  getuser,
  isEmail
};
