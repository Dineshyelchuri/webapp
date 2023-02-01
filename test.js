
const request = require("supertest");
const app = require("./index");
const chai = require("chai");
const expect = chai.expect;

describe("Authentication Tests", function () {
  describe("Successes", function () {
    it("Username Validation", function (done) {
      request(app)
        .post("/v1/user")
        .send({
          username: "Dineshcom",
          password: "dddDddd@10",
          first_name: "den",
          last_name: "dine",
        })
        .end(function (err, res) {
          expect(res.status).to.be.equal(400);
          expect(res.text).to.be.equal("Bad Request");
          done();
          console.log(res.text);
        });
    });
  });
});

describe("Authentication Tests", function () {
    describe("Successes", function () {
      it("Password Validation", function (done) {
        request(app)
          .post("/v1/user")
          .send({
            username: "dinesh@gmail.com",
            password: "dinesh",
            first_name: "bussu",
            last_name: "K",
          })
          .end(function (err, res) {
            expect(res.status).to.be.equal(400);
            expect(res.text).to.be.equal("Bad Request");
            done();
            console.log(res.text);
          });
      });
    });
  });