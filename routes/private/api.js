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
  console.log("user =>", user)
  return user;
};

module.exports = function (app) {
  // example
  app.get("/users", async function (req, res) {
    try {
       const user = await getUser(req);
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

  //pay ticket online 
  // app.post("/api/v1/payment/ticket", async function(req, res){
  //   try{
  //   const { purchasedId, creditCardNumber, holderName, payedAmount, origin, destination, tripDate } = req.body;
  //   const user = await getUser(req);

  //   // Check if required fields are missing
  //   if (!purchasedId || !creditCardNumber || !holderName || !payedAmount || !origin || !destination || !tripDate) {
  //     return res.status(400).send("Missing required fields");
  //   }

  //   // Create a new ticket object
  //   const ticket = {
  //     origin,
  //     destination,
  //     userid: user.id,
  //     subid: purchasedId,
  //     tripdate: tripDate,
  //   };
    
  //   // Insert the ticket record into the database
  //   const [ticketId] = await db("se_project.tickets").insert(ticket).returning("id");

  //   // Fetch the newly created ticket from the database
  //   const purchasedTicket = await db
  //     .select("*")
  //     .from("se_project.tickets")
  //     .where("id", ticketId)
  //     .first();

  //   return res.status(200).json(purchasedTicket);
  // } 
  // catch (e) {
  //   console.log(e.message);
  //   return res.status(400).send("Could not purchase ticket");
  // }

  // });
  //ADMIN create a station
 
  app.post ("/api/v1/station", async function (req, res){
    const user= await getUser(req);
    if(user.isAdmin){
      try{
      const stationname = req.body;
      const userid=user.userid;
        await db("se_project.stations").where("id" , userid).insert({"stationname": stationname , "stationtype": "normal" , "stationstatus" :"new"});
        return res.status(200).send("Station Created!");
      }
      catch(e){
        console.log(e.message);
        return res.status(400).send("Could not create station");
      }
    }
    else{
      return res.status(400).send("You can't create station");

    }
  });


  //ADMIN creates a route 
  app.post("/api/v1/route", async function(req,res){
    try{
    const user= await getUser(req);
    if(user.isAdmin){
      const {newStationId, connectedStationId, routeName} = req.body;
      if (!newStationId || !connectedStationId || !routeName) {
        return res.status(400).send("Missing required fields");
      }
      const connectedStationPosition= await db.select("stationposition").from("se_project.stations").where({"id": connectedStationId}).first();
      const routeid= await db.select("id").from("se_project.routes").where("routename", routeName);
      if(connectedStationPosition=='start'){
      
          const idroute= await db.select("id").from("se_project.routes").where({"routename": routeName})
          const newroute={
            routename: routeName,
            fromStationid: newStationId,
            toStationid: connectedStationId,
          };
          const newstationroute={
            stationid: newStationId,
            routeid: idroute,
          };
          const route= await db("se_project.routes").insert(newroute).returning("*");
          await db("se_project.stations").where("id",newStationId).update({stationposition: "start"});
          const newroutestation= await db("stationRoutes").insert(newstationroute).returning("*");
        await db("se_project.stations").where("id",connectedStationId).update({stationposition: "middle"});
          return res.status(200).json(route); 
          //return res.status(200).json(newroutestation);

      }
      else if(connectedStationPosition=='end'){
    
          const newroute={
            routename: routeName,
            fromStationid: newStationId,
            toStationid: connectedStationId,
          };
          const newstationroute={
            stationid: newStationId,
            routeid: routeid,
          };
          await db("se_project.stations").where("id",newStationId).update({stationposition: "end"});
          await db("se_project.stations").where("id",connectedStationId).update({stationposition: "middle"});
          const route= await db("se_project.routes").insert(newroute).returning("*");
          const routeid= await db.select("id").from("se_project.routes").where({"routename": routeName});
          res.status(200).json(route); 
          const newroutestation= await db("stationRoutes").insert(newstationroute).returning("*");
          //no "return"
           res.status(200).json(newroutestation); 

        //ROUTE ID MENEN
        
          
      // newStationPosition= 'end';
        // connectedStationPosition='middle';
        // route.fromStationid= connectedStationId;
        // route.toStationid= newStationId;
      
      }
    }
//UPDATE ROUTES AS WELL
      } catch (e) {
        console.log(e.message);
        return res.status(400).send("Could not create route");
      }
    
  });
  ///pay ticket for subscription:
  app.post("/api/v1/payment/ticket", async function (req, res) {
    try{
        const user = await getUser(req);
        const useridsubscription = await db.select("userid").from("se_project.subsription");
        if(useridsubscription != user.id){
        const {purchasediid, creditcardnumber, holdername, payedamount, origin, destination, tripdate} = req.body;
        const transaction = {amount: payedamount, userid: user.id, purchasediid: purchasediid};
        const [transactionid] = await db("se_project.transactions").insert(transaction).returning("id");
        //insert ticket into upcoming ride 
        //const ticketinsert = await db("se_project.rides").insert(tripdate).returning("id","tripdate");
        return res.status(200).json({transactionid});
        }else{
          return res.status(200).send("user has a subscription");
        }
    }catch(e){
        console.log(e.message);
        return res.status(400).send("Could not subscribe");
    }
  });
  //this is farida's code
};