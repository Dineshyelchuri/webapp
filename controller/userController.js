const db = require("../model");
const bcrypt = require("bcrypt");
const { users } = require("../model");

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
        console.log("-> User Already Exists");
        res.status(400).send("User Already Exists");
      }
    }
  }
};

const getuser = async (req, res) => {
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
    res.status(401).send("Unauthorized");
  } else {
    var auth = new Buffer.from(authheader.split(" ")[1], "base64")
      .toString()
      .split(":");

    var username = auth[0];
    var password = auth[1];

    if (!isEmail(username)) {
      res.status(401).send("Authentication Failed, Please enter valid email");
    } else {
      let userDetails = await User.findOne({
        where: {
          username: username,
        },
      });
      if (userDetails == null) {
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
            console.log("Authentication Successful");

            if (unwantedParams.length) {
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
                res.status(400).send("Please enter valid password");
              } else if (!(checkName(firstName) && checkName(lastName)))
                res.status(400).send("Please enter valid First and Last Names");
              else {
                const user = User.update(upinfo, {
                  where: {
                    id: userId,
                  },
                });
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
