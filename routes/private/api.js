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
  app.put("/api/v1/station/:stationId",async function(req,res){
  if(user.isAdmin){
      try{
const user = await getUser(req);
const useridd =user.userid
const {stationid} = req.params;
await db("se_project.stations")
      .where("id", useridd)
      .update({ stationid: stationid });
      return res.status(200).send("stationId is updated successfully");
  } catch (e) {
    console.log(e.message);
    return res.status(400).send("can not update stationId");
  }
}
else{
  return res.status(400).send("you are not an admin");
}
  });
  app.put("/api/v1/route/:routeId",async function(req,res){
    if(user.isAdmin){
      try{
      const user = await getUser(req);
      const useridd =user.userid;
      const {routeid} = req.params;
      await db("se_project.routes")
      .where("id", useridd)
      .update({ routeid : routeid});
      return res.status(200).send("routeid is updated successfully");
      
      }
      catch(e){
        console.log(e.message);
        return res.status(400).send("can not update routeid");
      }
    }
    else{
      return res.status(400).send("you are not an admin");
    }


  });




      }

  