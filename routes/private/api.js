const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const {getSessionToken}=require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi",sessionToken);
  const user = await db
    .select("*")
    .from("se_project.sessions")
    .where("token", sessionToken)
    .innerJoin(
      "se_project.users",
      "se_project.sessions.userid",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleid",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleid === roles.user;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;
  return user;
};

module.exports = function (app) {
  
  app.put("/users", async function (req, res) {
    try {
      const user = await getUser(req);
     // const {userId}=req.body
      console.log("hiiiiiiiiiii");
      const users = await db.select('*').from("se_project.users")
      
      return res.status(200).json(users);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get users");
    }
  });
  
  //reset password: 
  app.put("/api/v1/password/reset",async function(req,res){
    try{
      const { email, password, newPassword } = req.body;

      await db("se_project.users")
      .where("email", email)
      .update({ password: newPassword });

    return res.status(200).send("Password reset successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not reset password");
  }
  });
  
  //subscriptions using zones db(get):
  app.get("/api/v1/zones",async function(req,res){
    try{
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);

    }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not get zones");
    }
  });
  
  app.post("/api/v1/payment/subscription", async function (req, res) {
    try{
        const user = await getUser(req);
        const {purchaseID, creditCardNumber, holderName, payedAmount, subtype, zoneid} = req.body;
        const transaction = {Amount: payedAmount, userid: user.id, purchaseid: purchaseID};
        const [transactionID] = await db("se_project.transactions").insert(transaction).returning("id");

        const subscription = {subtype: subtype, zoneid: zoneid, userid: user.id, numOftickets: 0};
        const [subscriptionID] = await db("se_project.subscriptions").insert(subscription).returning("id");
        return res.status(200).json({transactionID, subscriptionID});
    }catch(e){
        console.log(e.message);
        return res.status(400).send("Could not subscribe");
    }
  });
};