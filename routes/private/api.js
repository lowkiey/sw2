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
  //starting habd el code 
  //reset password: 

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
  
  // simulate a ride : 
  app.put("/api/v1/ride/simulate", async function (req, res) {
    try {
      const user = await getUser(req);

      // if (!user.isAdmin) {
      //   return res.status(403).send("Access denied");
      // }
      const { origin, destination, tripDate } = req.body;
      //make sure that there is input 
      if (!origin || !destination || !tripDate) {
        return res.status(400).send("Missing required fields");
      }
      // Create a new ride 
      const ride = {
        status: "simulated",
        origin,
        destination,
        userid: user.id,
        ticketid: null, 
        tripdate: tripDate,
      };

      // Insert the ride record into the database
      const [rideId] = await db("se_project.rides").insert(ride).returning("id");

      // Fetch the newly created ride from the database
      const simulatedRide = await db
        .select("*")
        .from("se_project.rides")
        .where("id", rideId)
        .first();

      return res.status(200).json(simulatedRide);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Can't Simulate the ride");
    }
  });

  app.post("/api/v1/payment/ticket", async function(req, res){

  });

  
};
