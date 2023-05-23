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
// example
app.get("/users", async function (req, res) {
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
//senior request (user) (Tested)
app.post("/api/v1/senior/request", async function (req, res) {
    try {
      const { nationalid } = req.body;
      const user = await getUser(req);
  
      const seniorRequest = {
        nationalid: nationalid,
        status: "pending",
        userid: user.id
      };
  
      await db("se_project.senior_requests").insert(seniorRequest).returning("*");
      
      return res.status(200).send("Senior request has been added successfully");
    } catch (error) {
      console.error(error.message);
      return res.status(400).send("Could not add nationalId");
    }
});
//reset password (Tested)
app.put("/api/v1/password/reset",async function(req,res){
    try{
      const {newPassword } = req.body;
      const user = await getUser(req);
      const useridn = user.userid;
      
      await db("se_project.users")
      .where("id", useridn)
      .update({ password: newPassword });
    return res.status(200).send("Password reset successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("Could not reset password");
  }
});
  
//subscriptions using zones db(get) (Tested)
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
      const transaction = {amount: payedamount, userid: user.id, purchaseid: purchaseid};
      const [transactionid] = await db("se_project.transactions").insert(transaction).returning("id");
      let numOftickets = 0;
      if(subtype == "monthly"){
        numOftickets = 10;
      }else if(subtype == "quarterly"){
        numOftickets = 50; 
      }else if(subtype == "yearly"){
        numOftickets = 100;
      }
      const subscription = {subtype: subtype, zoneid: zoneid, userid: user.id, numOftickets};
      const [subscriptionid] = await db("se_project.subsription").insert(subscription).returning("id");
      return res.status(200).json({transactionid, subscriptionid});
  }catch(e){
      console.log(e.message);
      return res.status(400).send("Could not subscribe");
  }
});

//tickets: POST for pay for ticket by subscription
app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
  try{
      const user = await getUser(req);
      const {subid, origin, destination, tripdate} = req.body;
      const subscription = await db.select("*").from("se_project.substription").where("subscriptionid", subId).andWhere("userid", user.id);
      const ticket = {origin, destination, userid: user.id, tripdate: tripDate, subscriptionid: subId};
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

//manageRequests(admin): accept/reject refund request (Tested)
app.put("/api/v1/requests/refunds/:requestId", async function (req, res) {
try{
    const user = await getUser(req);
    if(user.isAdmin){
      const {refundstatus} = req.body;
      if(refundstatus = "accepted"){
        const deleteRide = await db("se_project.rides").where("id", ticketid).del();
        if(ticketid == subId){ //if ticket is subscription
          const deletesubride = await db("se_project.tickets").where("subid", subid).del();
          return res.status(200).send(deletesubride);
        }
        else if(transactionid == purchaseid){ //if ticket is transaction
          const deletetransride = await db("se_project.tickets").where("purchaseid", purchaseid).del();
          return res.status(200).send(deletetransride);
        }
      }else if(refundstatus = "pending"){
          const pendingrequest = await db("se_project.refund_requests").where("ticketid", ticketid).andWhere("userid", user.id).andWhere(payedAmount, amount).insert({pendingrequest});
          return res.status(200).send(pendingrequest);
      }
      else if(refundstatus = "rejected"){
        return res.status(200).send("Refund request rejected");
      }
    }else{
        return res.status(400).send("You are not authorized to accept/reject refund request");
    }

}catch(e){
  console.log(e.message);
  return res.status(400).send("Could not accept/reject refund request");
  }
});

};