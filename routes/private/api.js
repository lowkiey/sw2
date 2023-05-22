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
      const {newpassword } = req.body;
      const user = await getUser(req);
      const useridn = user.userid;
      
      await db("se_project.users")
      .where("id", useridn)
      .update({ password: newpassword });
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
      //bnkhli status complete for the user using id, origin and destination and trip date.
      const simulatedride = await db.select("*").from("se_project.rides")
      .where("origin", origin).andWhere("destination", destination).andWhere("tripdate", tripDate)
      simulatedride.status = "completed";
      return res.status(200).json(simulatedRide);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Can't Simulate the ride");
    }
  });
  //Delete Station (admin):
  app.delete("/api/v1/station/:stationId", async function(req,res){
    try{
      const user = await getUser(req);
      if(user.isAdmin){

        const stationid = req.params.stationid;
        const station = await db("se_project.stations").where("id", stationid);
        if(!station){
          return res.status(400).send("station not found");
        }
        const deletestation = await db("se_project.stations").where("id",stationid).del();
        if(station.stationtype == "normal"){
          await db("se_project.stationRoutes")
          .where("stationid", stationId)
          .del();

        // await db("se_project.stationRoutes")
        //   .where("routeid", station.stationroute)
        //   .update({ stationid: null });       //msh fhma a3ml eh f station routes

          await db("se_project.routes")
          .where("id", routes.routeid);
          const newRoute = await db("se_project.routes").insert({
          routename:"new",
          fromStationid: station.stationid,
          toStationid: station.stationid,
        });
          await db("se_project.stationRoutes").insert({
            stationid: stationId,
            routeid: newRoute[0],
          });
        }else if(station.stationtype == "transfer"){
        
          if(station.stationpostition == "start"){
          
          
          }else if(station.stationpostition == "middle"){
          
          
          }else if(station.stationpostition == "end"){ 
            
          }
        }

       
        return res.status(200).send("Station deleted successfully");


      }else{
        return res.status(400).send("Unauthorised access")
      }
    }catch(e){
      console.log(e);
      return res.status(400).send("Station doesn't exist to delete or Mission Failed")
    }
  });

  
};

//check price: