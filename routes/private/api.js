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
  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const { newPassword } = req.body;
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

  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);

    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get zones");
    }
  });
  //update station(admin) done
  app.put("/api/v1/station/:stationId", async function (req, res) {
    try {
      const user = await getUser(req);
      const useridd = user.userid
      if (user.isAdmin) {
        // const {stationname} = req.body;
        //const {stationid} = req.params;
        await db("se_project.stations")
          .where({ id: req.params.stationId })
          .update({ stationname: req.body.stationname, id: req.params.stationId });
        return res.status(200).send("stationId is updated successfully");
      } else {
        return res.status(400).send("you are not an admin");
      }
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("can not update stationId");
    }
  });
  //update route(admin) done
  app.put("/api/v1/route/:routeId", async function (req, res) {
    try {
      const price = 0;
      const user = await getUser(req);
      const useridd = user.userid;
      if (user.isAdmin) {
        //onst {routeid} = req.params;
        await db("se_project.routes")
          .where({ id: req.params.routeId })
          .update({ routename: req.body.routename, id: req.params.routeId });
        return res.status(200).send("routeid is updated successfully");
      }
      else {
        return res.status(400).send("you are not an admin");
      }
    }
    catch (e) {
      console.log(e.message);
      return res.status(400).send("can not update routeid");
    }
  });

  //Delete Station (admin):
  app.delete("/api/v1/station/:stationId", async function (req, res) {
    try {
      const user = await getUser(req);
      if (user.isAdmin) {
        const stationid = req.params.stationid;
        const station = await db("se_project.stations").where("id", stationid);
        if (!station) {
          return res.status(400).send("station not found");
        }
        if (station.stationtype == "normal" && station.stationpostition == "start") {

          const route = await db("se_project.routes").where("id", stationid)
          route = route.fromstationid;
          nextroute = route.tostationid;
          await db("se_project.stations").where("id", route).del();
          nextroute.stationposition = "start";

        }
        else if (station.stationtype == "normal" && station.stationpostition == "end") {
          const nextStationend = await db("se_project.stations").where("id", stationid);

          //fl end bnbd2 bl to w nnhi bl from, w not affect route brdo 
          route = route.tostationid;
          prevroute = route.fromstationid;
          await db("se_project.stations").where("id", route).del();
          prevroute.stationposition = "end";
          //////done the routes & stationRoutes////

        } else if (station.stationtype == "normal" && station.stationpostition == ("middle")) {

          const station = await db("se_project.stations").where("id", stationid); //el hndaletha
          //s2
          const mystationnext = await db("se_project.stations").where("tostationid", stationid);
          // s3
          let mystationprev = await db("se_project.stations").where("fromstationid", stationid);
          //s1
          mystationprev = mystationnext.fromstationid;
          mystationnext = mystationprev.tostationid;
          //keda el route automatically updated bsbb enha on update cascade

          station.del();



        } else if (station.stationtype == "transfer") {
          const transferStations = await db("se_project.stations").where("tostationid", stationId);

          // Delete the current station
          await db("se_project.stations").where("id", stationId).del();

          // Update the position of transfer stations
          for (const transferStation of transferStations) {
            transferStation.stationposition = "middle";
            await db("se_project.stations").where("id", transferStation.id).update(transferStation);
          }

          // Update the affected routes
          const affectedRoutes = await db("se_project.routes").whereIn("fromstationid", transferStations.map(station => station.id));

          for (const affectedRoute of affectedRoutes) {
            const newFromStationId = transferStations.find(station => station.id !== affectedRoute.fromstationid).id;
            affectedRoute.fromstationid = newFromStationId;
            await db("se_project.routes").where("id", affectedRoute.id).update(affectedRoute);
          }
          return res.status(200).send("Station deleted successfully");
        }
      } else {
        return res.status(400).send("Unauthorised access")
      }
    } catch (e) {
      console.log(e);
      return res.status(400).send("Station doesn't exist to delete or Mission Failed")
    }
  });

  //Delete Route (admin):
  app.delete("/api/v1/route/:routeId", async function (req, res) {
    try {
      const user = await getUser(req);
      if (user.isAdmin) {
        const routeId = req.params;

        const routeToDelete = await db("se_project.routes").where("id", routeId).first();

        if (!routeToDelete) {
          return res.status(404).send("Route not found");
        }

        const stationToDelete = routeToDelete.toStationid;
        const nextRoute = await db("se_project.routes").where("fromStationid", routeToDelete.toStationid).first();

        // Delete the route
        await db("se_project.routes").where("id", routeId).del();

        // Update the unconnected station status and position
        if (nextRoute) {
          const unconnectedStation = await db("se_project.stations").where("id", nextRoute.toStationid).first();

          if (unconnectedStation) {
            // Change the station position to "start" if it was previously "middle"
            if (unconnectedStation.stationposition === "middle") {
              await db("se_project.stations").where("id", unconnectedStation.id).update({ stationposition: "start" });
            }

            // Change the station position to "end" if it was previously "middle" and the next route is deleted
            if (routeToDelete.toStationid === nextRoute.fromStationid && unconnectedStation.stationposition === "middle") {
              await db("se_project.stations").where("id", unconnectedStation.id).update({ stationposition: "end" });
            }
          }
        }

        return res.status(200).send("Route deleted successfully");
      } else {
        return res.status(400).send("You are not authorized to delete a route");
      }
    } catch (e) {
      console.error(e.message);
      return res.status(400).send("Could not delete the route");
    }
  });


  //check price
  app.get('/api/v1/tickets/price/:originId&:destinationId', async (req, res) => {
    // const { originId, destinationId } = req.params;
    // const route = await db.select('*').from('se_project.routes').where('fromstationid', originId).andWhere('tostationid', destinationId);
    // console.log(route);
    // res.status(200).json(route);
    //});
    // try {
    let { originId, destinationId } = req.params;
    let stationsCount = 1;
    let destinationReached = false;
    let visitedStationsSet = new Set();
    visitedStationsSet.add(originId);
    //ghalat

    while (true) {
      const toStationidsObjects = await db.select('tostationid').from('se_project.routes').where('fromstationid', originId);
      stationsCount++;
      let furthestStationId = 0;

      for (let i = 0; i < toStationidsObjects.length; i++) {
        let toStationId = toStationidsObjects[i].tostationid;
        if (visitedStationsSet.has(toStationId)) {
          continue;
        } else {
          visitedStationsSet.add(toStationId);
        }
        if (toStationId == destinationId) {
          destinationReached = true;
          break;
        }
        if (toStationId < destinationId && toStationId > furthestStationId) {
          furthestStationId = toStationId;
        }
      }

      if (destinationReached) {
        break;
      }
      originId = furthestStationId;
    }
    if (stationsCount <= 9) {
      price = 5;
    }
    else if (stationsCount >= 10 & stationsCount <= 16) {
      price = 7;
    }
    else {
      price = 10;
    }
    // res.status(200).send("price of ticket equal:", price);
    res.status(200).json({stationsCount: stationsCount, price: price});


  });

  //break;
  //}
  // const stationid =await db.select('id').from("se_project.stations")
  // const routeid = await db.select('routeid').from('se_project.stationRoutes').where('stationid', stationid); 
  //res.status(200).json(toStationidsObjects);
  //}
  // catch (e) {}
  // const origin = await db('se_project.routes').where('id', routeid).andWhere('fromstationid', originId);
  // const destination = await db('se_project.routes').where('id', routeid).andWhere('tostationid', destinationId);


  // const stations = await db('se_project.stations')
  // .whereIn('id', function () {
  //   this.select('stationid')
  //     .from('se_project.stationRoutes')
  //     .where('routeid', routeid)
  //     .andWhere(function () {
  //       if (origin.stationid < destination.stationid) {
  //         this.whereBetween('id', [origin.stationid, destination.stationid]);
  //       } else {
  //         this.whereBetween('id', [destination.stationid, origin.stationid]);
  //       }
  //     });
  // });

  // const amount = stations.length; 
  // if (amount === 0) { //no routes where found 
  //       return res.status(404).send('No routes found for the given origin and destination');
  //     }
  //     if(amount <= 9){
  //       price = 5;
  //     }
  //     else if(amount >=10 & amount <=16){
  //       price = 7;
  //     }
  //     else{
  //       price =10;
  //     }
  //     res.status(200).send(`Price of ticket: ${price}`);

  //     }catch (error) {
  //     console.error('Error checking ticket price:', error);
  //     return res.status(500).send('An error occurred while checking the ticket price');
  //      }


  // //check price
  //     app.get('/api/v1/tickets/price/:originId&:destinationId', async (req, res) => {
  //       try {
  //         const { originId, destinationId } = req.params;

  //         // Retrieve the origin and destination stations ?? leh mesh mn el routes ??
  //         const originStation = await db('se_project.stations').where('id', originId).first(); //check for the needed station start
  //         const destinationStation = await db('se_project.stations').where('id', destinationId).first(); //check for the needed station end

  //         if (!originStation || !destinationStation) { // if they are false
  //           return res.status(400).send('Invalid origin or destination station');    
  //         // Find the routes that connect the origin and destination stations
  //         const routes = await db('se_project.routes')
  //           .join('se_project.stationRoutes', 'se_project.routes.id', 'se_project.stationRoutes.routeid')
  //           .where('se_project.routes.fromStationid', originId) // make the from station(start) 
  //           .andWhere('se_project.routes.toStationid', destinationId) // make the to station(end) 
  //           .select('se_project.routes.id', 'se_project.routes.routename'); // get route id and route name

  //         if (routes.length === 0) { //no routes where found 
  //           return res.status(404).send('No routes found for the given origin and destination');
  //         }
  //         if(routes.length <= 9){
  //            price = 5;
  //         }
  //         else if(routes.length >=10 & routes.length <=16){
  //           price = 7;
  //         }
  //         else{
  //           price =10;
  //         }
  //         res.status(200).send("price of ticket equal:", price);


  //         // Calculate the total price for the ticket based on the routes : how many stations u pass 
  //         //mesh fahma ?????????
  //         let totalPrice = 0;
  //         for (const route of routes) {
  //           const stationRoutes = await db('se_project.stationRoutes')
  //             .where('routeid', route.id)
  //             .orderBy('id', 'asc');
  //           let previousStation = originStation;
  //           let routePrice = 0;

  //           for (const stationRoute of stationRoutes) {
  //             const currentStation = await db('se_project.stations').where('id', stationRoute.stationid).first();
  //             const stationPrice = calculatePrice(previousStation, currentStation); // Implement your logic to calculate the price between stations , fixed price for each route
  //             routePrice += stationPrice;
  //             previousStation = currentStation;
  //           }

  //           totalPrice += routePrice;
  //         }

  //         return res.status(200).json({ price: totalPrice });
  //       } catch (error) {
  //         console.error('Error checking ticket price:', error);
  //         return res.status(500).send('An error occurred while checking the ticket price');
  //       }
  //     });
//Accept/Reject Senior
// app.put("/api/v1/requests/senior/:requestId",async function(req,res){
//   try{  
//     const user = await getUser(req);
//     let {seniorstatus}=req.body;
//     const userid = user.id;
//   if ( seniorstatus == "pending" ){
//     const nationalidcheck = db("se_project.senior_requests").select("nationalid");
//     if (nationalidcheck != null){
//       user.isSenior;
//       seniorstatus = "accepted";
//       await db("se_project.senior_requests").where("id" , userid).update({status : "accepted"});
//       const amountt = await db("se_project.transactions").select("amount")
//       const discount = amountt - 0.5;
//       return res.status(200).send("senior request is accepted");
//     }
//   }else if(seniorstatus == "rejected"){
//     await db("se_project.senior_requests").where("id" , userid).update({status : "rejected"});
//     return res.status(200).send("senior request is rejected");
//   }
//   }
//   catch(e){
//     console.log(e.message);
//     return res.status(400).send("rejected operation");
//   }
//   });
  
//   app.post ("/api/v1/station", async function (req, res){
//     const user= await getUser(req);
//     if(user.isAdmin){
//       try{
//       const stationname = req.body;
//       const userid=user.userid;
//         await db("se_project.stations").where("id" , userid).insert({"stationname": stationname , "stationtype": "normal" , "stationstatus" :"new"});
//         return res.status(200).send("Station Created!");
//       }
//       catch(e){
//         console.log(e.message);
//         return res.status(400).send("Could not create station");
//       }
//     }
//     else{
//       return res.status(400).send("You can't create station");

//     }
//   });


//   //ADMIN creates a route 
//   app.post("/api/v1/route", async function(req,res){
//     try{
//     const user= await getUser(req);
//     if(user.isAdmin){
//       const {newStationId, connectedStationId, routeName} = req.body;

//       if (!newStationId || !connectedStationId || !routeName) {
//         return res.status(400).send("Missing required fields");
//       }
//       console.log(newStationId, connectedStationId, routeName);

//       const connectedStationPosition= await db("se_project.stations").where({"id": connectedStationId}).first();
//       console.log(connectedStationPosition)
//       //const routeid= await db.select("id").from("se_project.routes").where("routename", routeName);

//       if(connectedStationPosition.stationposition== "start"){
//         console.log(connectedStationPosition.stationposition);
//           // const idroute= await db.select("id").from("se_project.routes").where({"routename": routeName})
//           // console.log(idroute)
//           const newroute={
//             routename: routeName,
//             fromstationid: newStationId,
//             tostationid: connectedStationId,
//           };
//           const route= await db("se_project.routes").insert(newroute).returning("*");
//           console.log(route)
//           await db("se_project.stations").where("id",newStationId).update({stationposition: "start"});
//           const newstationroute={
//             stationid: newStationId,
//             routeid: route[0].id,
//           };
//           console.log(newstationroute)
//           const newroutestation= await db("se_project.stationroutes").insert(newstationroute).returning("*");
//           console.log(newroutestation)
//           await db("se_project.stations").where("id",connectedStationId).update({stationposition: "middle"});
//           // return res.status(200).json(route); 
//          return res.status(200).json(newroutestation);

//       }
//       else if(connectedStationPosition.stationposition=="end"){
//         console.log(connectedStationPosition.stationposition);
//         const newroute={
//             routename: routeName,
//             fromstationid: newStationId,
//             tostationid: connectedStationId
//           };
//         const route= await db("se_project.routes").insert(newroute).returning("*");
//         await db("se_project.stations").where("id",newStationId).update({stationposition: "end"});

//           const newstationroute={
//             stationid: newStationId,
//             routeid: route[0].id,
//           };
//           console.log(newstationroute)
//           const newroutestation= await db("se_project.stationroutes").insert(newstationroute).returning("*");
//           await db("se_project.stations").where("id",connectedStationId).update({stationposition: "middle"});
//          // const routeid= await db.select("id").from("se_project.routes").where({"routename": routeName});
//           res.status(200).json(route); 
//           //no "return"
//            res.status(200).json(newroutestation); 

//         //ROUTE ID MENEN
//       }
//       }
//     }
    
    
// //UPDATE ROUTES AS WELL
      
//       catch (e) {
//         console.log(e.message);
//         return res.status(400).send("Could not create route");
//       }
    
    
//   });
// }
app.post("/api/v1/refund/:ticketId", async function (req, res) {
  try {
  const user = await getUser(req);
  const { ticketId } = req.params;
  const { refundMethod } = req.body;
  const ticket = await db
  .select("*")
  .from("se_project.tickets")
  .where("id", ticketId)
  .first();
  
  
  const currentDate = new Date();
  if (ticket.date <= currentDate) {
  return res.status(400).send("Cannot refund past-dated tickets");
  }
  await db("se_project.tickets")
  .where("id", ticketId)
  .delete();
  const refundTransaction = {
  userId: user.id,
  ticketId,
  refundMethod,
  refundAmount: ticket.price,
  status: "pending",
  };
  await db("se_project.transactions").insert(refundTransaction);
  return res.status(201).json({ message: "Ticket refunded successfully" });
  } 
  catch (e) {
  console.log(e.message);
  return res.status(400).send("Could not process refund request");
}
  });
};