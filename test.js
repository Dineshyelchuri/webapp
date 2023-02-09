const request = require("supertest");
const app = require("./server");
const chai = require("chai");
// const chaiHttp = require('chai-http');
const expect = chai.expect;

// chai.should();
// chai.use(chaiHttp);

// describe("Authentication Tests", function () {
//   describe("Successes", function () {
//     it("Username Validation", function (done) {
//       request(app)
//         .post("/v1/user")
//         .send({
//           username: "Dinesh@com",
//           password: "Dinesh@10",
//           first_name: "Dinesh",
//           last_name: "K",
//         })
//         .end(function (err, res) {
//           expect(res.status).to.be.equal(400);
//           expect(res.text).to.be.equal("Please enter valid email");
//           done();
//           console.log(res.text);
//         });
//     });
//   });
// });

// describe("Authentication Tests", function () {
//     describe("Successes", function () {
//       it("Password Validation", function (done) {
//         request(app)
//           .post("/v1/user")
//           .send({
//             username: "Sujith@gmail.com",
//             password: "Sujith",
//             first_name: "Sujith",
//             last_name: "K",
//           })
//           .end(function (err, res) {
//             expect(res.status).to.be.equal(400);
//             expect(res.text).to.be.equal("Please enter valid password");
//             done();
//             console.log(res.text);
//           });
//       });
//     });
//   });

var assert = require('assert');
describe('Array', function () {
  describe('#indexOf()', function () {
    it('should return -1 when the value is not present', function () {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});


describe('Healthz API', function() {
  describe('Successes', function() {
      it('Health Check', function(done) {
          request(app).get('/healthz').send({
}).end(function(err, res) {
              expect(res.statusCode).to.be.equal(200);
              done();
              // console.log(res.statusCode);
          })
      })
  })
})

// describe('GET /api/healthz', () => {
//   it('should return 200', (done) => {
//     chai.request(app)
//       .get('/healthz')
//       .end((err, res) => {
//         res.should.have.status(200);
//         // res.body.should.be.a('array');
//         // res.body.length.should.be.eql(2);
//         done();
//       });
//   });
// });