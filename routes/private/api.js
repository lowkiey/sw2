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
  app.put("/api/v1/password/reset", async function(req,res){
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
  
  //subscriptions: GET using zones db(get):
  app.get("/api/v1/zones",async function(req,res){
    try{
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);

    }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not get zones");
    }
  });
  
  //subscriptions: POST pay for subscription online (Tested)
  app.post("/api/v1/payment/subscription", async function (req, res) {
    try{
        const user = await getUser(req);
        const {purchaseid, creditcardnumber, holdername, payedamount, subtype, zoneid} = req.body;
        const transaction = {amount: payedAmount, userid: user.id, purchaseid: purchaseid};
        const [transactionid] = await db("se_project.transactions").insert(transaction).returning("id");
        let numOftickets = 0;
        if(subtype == "monthly"){
          numOftickets = 10;
        }else if(subtype == "quarterly"){
          numOftickets = 50; 
        }else{
          numOftickets = 100;
        }
        const subscription = {subtype: subtype, zoneid: zoneid, userid: user.id, numOftickets};
        const [subscriptionID] = await db("se_project.subscriptions").insert(subscription).returning("id");
        return res.status(200).json({transactionID, subscriptionID});
    }catch(e){
        console.log(e.message);
        return res.status(400).send("Could not subscribe");
    }
  });

  //tickets: POST for pay for ticket by subscription
  app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
    try{
        const user = await getUser(req);
        const {subId, origin, destination, tripDate} = req.body;
        const subscription = await db.select("*").from("se_project.substription").where("subscriptionid", subId).andWhere("userid", user.id);
        const tickets = {origin, destination, userid: user.id, tripdate: tripDate, subscriptionid: subId};
        const [ticketID] = await db("se_project.tickets").insert(tickets).returning("id");
        return res.status(200).json({ticketID});
    }catch(e){
        console.log(e.message);
        return res.status(400).send("Could not purchase ticket");
    }
});

//manageRoutes(admin): delete route
app.delete("/api/v1/route/:routeId", async function (req, res) {
  try{
      const user = await getUser(req);
      if(user.isAdmin){
          const routeid = req.params.routeid;
          const deleteroute = await db("se_project.routes").where("id", routeid).del();
            if(deleteroute){
              return res.status(200).send("Route deleted successfully");
            }
            else{
              return res.status(400).send("Could not delete route");
            }
      }else{
          return res.status(400).send("You are not authorized to delete route");
      }
  }catch(e){
    console.log(e.message);
    return res.status(400).send("Could not delete route");
  }

});
//manageRequests(admin): accept/reject refund request
app.put("/api/v1/requests/refunds/:requestId", async function (req, res) {
  try{
      const user = await getUser(req);
      if(user.isAdmin){
        const refundRequest = {requestid, Refundstatus, refundamount, ticketID}
        const requests = await db.select("*").from("se_project.refund_requests").where("id", req.params.requestId);
      }

  }catch(e){
    console.log(e.message);
    return res.status(400).send("Could not accept/reject refund request");
  }
});
};