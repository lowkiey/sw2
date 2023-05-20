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
      "se_project.sessions.userId",
      "se_project.users.id"
    )
    .innerJoin(
      "se_project.roles",
      "se_project.users.roleId",
      "se_project.roles.id"
    )
   .first();

  console.log("user =>", user);
  user.isNormal = user.roleId === roles.user;
  user.isAdmin = user.roleId === roles.admin;
  user.isSenior = user.roleId === roles.senior;
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
  })
  //prices check price 
  app.post("/api/v1/tickets/price/:originId/ :destinationId",async function(req,res){
    try{
      const {originId , destinationId } = req.body;
      const origin = await
      db.select("*")
      .from("se_project.rides")
      .where("id",origin)
    }catch(e){

    }
  })
  // app.post("/api/v1/tickets/price/:originId/:destinationId", async function (req, res) {
  //   try {
  //     const { originId, destinationId } = req.params;
  
  //     // Fetch origin zone price
  //     const originZone = await db
  //       .select("price")
  //       .from("se_project.zones")
  //       .where("id", originId)
  //       .first();
  
  //     if (!originZone) {
  //       return res.status(404).send("Origin zone not found");
  //     }
  
  //     // Fetch destination zone price
  //     const destinationZone = await db
  //       .select("price")
  //       .from("se_project.zones")
  //       .where("id", destinationId)
  //       .first();
  
  //     if (!destinationZone) {
  //       return res.status(404).send("Destination zone not found");
  //     }
  
  //     const price = originZone.price + destinationZone.price;
  
  //     return res.status(200).json({ price });
  //   } catch (e) {
  //     console.log(e.message);
  //     return res.status(400).send("Could not check price");
  //   }
  // });
  


  
};
