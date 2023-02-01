const express = require("express");
const bcrypt = require("bcrypt");
var cors = require('cors');
const app = express();
const mysql = require("mysql");
var portfinder = require("portfinder");
var bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json())
require("dotenv").config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_DATABASE = process.env.DB_DATABASE;
const DB_PORT = process.env.DB_PORT;

const db = mysql.createPool({
    connectionLimit: 100,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    //   port: DB_PORT,
});
db.getConnection((err, connection) => {
    if (err) throw err;
    console.log("DB connected successful: " + connection.threadId);
});


portfinder.getPort(function (err, port) {
    process.env.PORT = port;
    app.listen(port, () =>
        console.log(`Server Started on port ${port}...`)
    );
});

let encryptedPassword = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
}


//CREATE USER
app.post("/v1/user", async (req, res) => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    //new RegExp(/^[A-Za-z0-9_!#$%&'*+\/=?`{|}~^.-]+@[A-Za-z0-9.-]+$/, "gm");
    const email = req.body.email;
    const firstName = req.body.first_name;
    const nameRegex = /^[a-zA-Z]+$/;
    const isValidFirstName = nameRegex.test(firstName);
    const lastName = req.body.last_name;
    const isValidLastName = nameRegex.test(lastName);
    const passwordValidation = req.body.password;
    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    const isValidPassword = passwordRegex.test(passwordValidation);
    const hashedPassword = encryptedPassword(req.body.password);
    const isValidMail = emailRegex.test(email);

    console.log(email);
    console.log(isValidMail);
    console.log(isValidFirstName);
    console.log(isValidLastName);
    console.log(isValidPassword);


    db.getConnection(async (err, connection) => {
        if (err) throw err;
        const sqlSearch = "SELECT * FROM cloudDB.users WHERE email = ?"
        const search_query = mysql.format(sqlSearch, [email])

        const sqlInsert = "INSERT INTO cloudDB.users(first_name,last_name,email,password) VALUES (?,?,?,?)";
        const insert_query = mysql.format(sqlInsert, [firstName, lastName, email, hashedPassword]);
        if (isValidFirstName == true && isValidLastName == true && isValidPassword == true && firstName != undefined && lastName != undefined && email != undefined) {
            await db.query(search_query, async (err, result) => {
                if (err) throw err;
                console.log("------> Search Results");
                console.log(result.length);
                if (result.length != 0) {
                    //db.end();
                    console.log("------> User already exists");
                    res.sendStatus(400);
                } else {
                    if (isValidMail == true) {
                        await connection.query(insert_query, (err, result) => {
                            //db.end();
                            if (err) throw err;
                            console.log("--------> Created new User");
                            console.log(result.insertId);
                            res.sendStatus(201);
                        });
                    } else {
                        console.log("--->invalid email format");
                        console.log(result.insertId);
                        res.sendStatus(400);
                    }
                }
            }); //end of connection.query()
        } else {
            console.log("----> invalid name_format");
            //console.log(result.insertId);
            res.sendStatus(400);
        }

    }); //end of db.getConnection()
}); //end of app.post()

// ------------Get code --------------

//GET USER

app.get("/v1/user/:userId", async (req, res) => {
    const userId = req.params.userId;
    console.log('userid:' + userId);

    const emailRegex = /^\S+@\S+\.\S+$/;
    //new RegExp(/^[A-Za-z0-9_!#$%&'*+\/=?`{|}~^.-]+@[A-Za-z0-9.-]+$/, "gm");
    let email = req.body.email;
    //let validEmail = email.match(emailRegex);

    //console.log(validEmail);

    const authHead = Buffer.from(
        req.headers.authorization.split(" ")[1],
        "base64"
    ).toString("ascii");
    const user = authHead.split(":")[0];
    const pass = authHead.split(":")[1];

    db.getConnection(async (err, connection) => {
        if (err) throw err;
        const sqlSearch = "SELECT * FROM cloudDB.users WHERE user_id = ?"
        const search_query = mysql.format(sqlSearch, [userId])

        await db.query(search_query, async (err, result) => {
            if (err) throw err;
            console.log("------> Search Results");
            console.log(result.length);
            if (result.length == 0) {
                console.log("------> User Not Found");
                res.status(404);
                res.send("User Not Found");
            } else {
                if (err) throw err;
                else {
                    let fn = result[0].first_name;
                    let ln = result[0].last_name;
                    let pw = result[0].password;
                    bcrypt.compare(pass, pw, (err, ress) => {
                        if (err) throw err;
                        if (user.match(emailRegex)) {
                            if (ress && user == result[0].email) {
                                console.log("authentication completed successfully");
                                connection.query(search_query, (err, result) => {
                                    //db.end();
                                    if (err) throw err;
                                    else {
                                        res.status(200).send({
                                            user_id: result[0].user_id,
                                            first_name: result[0].first_name,
                                            last_name: result[0].last_name,
                                            username: result[0].email,
                                        });
                                    }
                                    console.log("----- the result has been populated");
                                    console.log(result.insertId);
                                    //res.sendStatus(201);
                                });
                            }  
                            else {
                                console.log("authentication failed");
                                res.sendStatus(401);
                            }
                        } 
                        else {
                            console.log("please add correct email format");
                            res.sendStatus(400);
                        }
                    })
                }
            }
        }); //end of connection.query()
    }); //end of db.getConnection()
}); //end of app.get()

// ------------Put code----------------

app.put("/v1/user/:userId", async (req, res) => {
    const userId = req.params.userId;
    console.log('userid:' + userId);
    // const email = req.body.email;
    const nameRegex = /^[a-zA-Z]+$/;
    const emailRegex = /^\S+@\S+\.\S+$/;
    let firstName = req.body.first_name;
    const isValidFirstName = nameRegex.test(firstName);
    let lastName = req.body.last_name;
    const isValidLastName = nameRegex.test(lastName);
    let passwordValidation = req.body.password;
    const passwordRegex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    const isValidPassword = passwordRegex.test(passwordValidation);
    let hashedPassword = encryptedPassword(req.body.password);

    console.log(req.body.email);



    console.log(userId);

    const authHead = Buffer.from(
        req.headers.authorization.split(" ")[1],
        "base64"
    ).toString("ascii");
    const user = authHead.split(":")[0];
    const pass = authHead.split(":")[1];
    if(req.body.email == undefined){
        db.getConnection(async (err, connection) => {
            if (err) throw err;
            const sqlSearch = "SELECT * FROM cloudDB.users WHERE user_id = ?"
            const search_query = mysql.format(sqlSearch, [userId])
    
    
            const sqlUpdate = "UPDATE cloudDB.users SET first_name = ?,last_name =?,password=? WHERE user_id=?"
            //const update_query = mysql.format(sqlUpdate,[firstName,lastName, hashedPassword,userId]);
    
            if (isValidFirstName == true && isValidLastName == true && isValidPassword == true) {
                await db.query(search_query, async (err, result) => {
                    if (err) throw err;
                    console.log("------> Search Results");
                    console.log(result.length);
                    if (result.length == 0) {
                        db.end();
                        console.log("------> User not found");
                        res.sendStatus(409);
                    } else {
                        let fn = result[0].first_name;
                        let ln = result[0].last_name;
                        let pw = result[0].password;
                        bcrypt.compare(pass, pw, (err, ress) => {
                            if (err) throw err;
                            if (firstName == undefined || firstName == null)
                                firstName = result[0].first_name;
                            if (lastName == undefined || lastName == null)
                                lastName = result[0].last_name;
                            if (passwordValidation == undefined || passwordValidation == null)
                                hashedPassword = result[0].password;
                            const update_query = mysql.format(sqlUpdate, [firstName, lastName, hashedPassword, userId]);
                            if(user.match(emailRegex)){
                                if (ress && user == result[0].email) {
                                    console.log("authentication completed successfully");
                                    connection.query(update_query, (err, result) => {
                                        //db.end();
                                        if (err) throw err;
                                        console.log("-----_updated new User");
                                        console.log(result.insertId);
                                        res.status(200).send("updated");
        
                                    });
                                } 
                                else {
                                    console.log("authentication failed");
                                    res.sendStatus(401);
                                }
                            }
                            else{
                                console.log("please enter correct email format");
                                res.sendStatus(400);
                            }
                        })
                    }
                });
            } else {
                console.log("please provide correct naming format");
                res.sendStatus(400);
            }
    
            //end of connection.query()
        });
    }
    else{
        console.log("please remove email body from the payload as it cannot be updated");
        res.sendStatus(400);
    }
    //end of db.getConnection()
});

module.exports=app;