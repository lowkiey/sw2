const { isEmpty } = require("lodash");
const { v4 } = require("uuid");
const db = require("../../connectors/db");
const roles = require("../../constants/roles");
const { getSessionToken } = require('../../utils/session')
const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect("/");
  }
  console.log("hi", sessionToken);
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

  //refund a ticket 
  app.post("/api/v1/refund/:ticketId", async (req, res) => {
    const { ticketId } = req.params;
    const user = await getUser(req);
    const userid = user.id;
  
    const ticket = await db("se_project.tickets")
      .select('*')
      .where({ id: ticketId })
      .first();
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }
  
    // Check if ticket is future-dated
    const currentDate = new Date();
    if (ticket.tripdate > currentDate) {
      // Insert refund request
      const transaction = await db("se_project.transactions")
        .select('*')
        .where({ purchasediid: ticketId })
        .first();
      if (!transaction) {
        return res.status(500).json({ error: "Transaction not found" });
      }
  
      const refundamount = transaction.amount;
      const refundRequest = await db('se_project.refund_requests').insert({
        status: 'pending',
        userid: userid,
        refundamount: refundamount,
        ticketid: ticketId,
      });
  
      // Delete ticket
      await db("se_project.rides").where({ id: ticketId }).del();
      return res.json({message: "Ticket refunded successfully"});
    } else {
      return res.status(500).json({ error: "Ticket already used" });
    }
  });
  

  //     const ticket = await db
  //       .select("*")
  //       .from("se_project.tickets")
  //       .where("id", ticketId)
  //       .first();

  //       console.log(ticket);
  //     if (!ticket) {
  //       return res.status(404).json({ message: "Ticket not found" });
  //     }
  
  //     // Check if the ticket's trip date is in the future
  //     const currentDate = new Date();
  //     const ticketDate = new Date(ticket.tripdate);
  //     if (ticketDate <= currentDate) {
  //       return res.status(400).json({ message: "Cannot refund past-dated or current-dated tickets" });
  //     }
  
  //     // Retrieve the user information
  //     const user = await db
  //       .select("*")
  //       .from("se_project.users")
  //       .where("id", ticket.userid)
  //       .first();

  //       const transaction = await db("se_project.transactions")
  //       .select("id")
  //       .where("purchasediid", ticketId)
  //       .andWhere("userid", user.id)
  //       .returning("*");

  //       console.log(user);
  //     if (!user) {
  //       return res.status(404).json({ message: "User not found" });
  //     }
  
  //     // Determine the refund payment method based on the user's subscription
  //     let refundRequest = {};
  //     if (user.roleid === 1) {
  //       // User has a subscription, refund through subscription
  //       const subscription = await db
  //         .select("*")
  //         .from("se_project.subsription")
  //         .where("userid", user.id)
  //         .first();
  
  //       if (!subscription) {
  //         return res.status(404).json({ message: "Subscription not found" });
  //       }
  
  //       refundRequest = {
  //         status: "approved",
  //         userid: user.id,
  //         refundamount: transaction.amount || 0,
  //         ticketid: ticketId,
  //       };
  //     } else {
  //       // User does not have a subscription, refund through online payment (manual approval)
  //       refundRequest = {
  //         status: "pending",
  //         userid: user.id,
  //         refundamount: transaction.amount || 0,
  //         ticketid: ticketId,
  //       };
  //     }
  
  //     // Insert the refund request into "se_project.refund_requests" table
  //     const insertedRefundRequest = await db("se_project.refund_requests")
  //       .insert(refundRequest)
  //       .returning("*");
  
  //     // Delete the ticket from "se_project.tickets" table
  //     await db("se_project.tickets")
  //       .where("id", ticketId)
  //       .delete();
  
  //     const refundTransaction = {
  //       amount: refundRequest.refundamount,
  //       userid: refundRequest.userid,
  //       purchasedid: insertedRefundRequest[0].id.toString(),
  //     };
  
  //     // Insert the refund transaction into "se_project.transactions" table
  //     await db("se_project.transactions").insert(refundTransaction);
  
  //     return res.status(201).json({ message: "Ticket refunded successfully" });
  //   } catch (e) {
  //     console.log(e.message);
  //     return res.status(500).send("Could not process refund request");
  //   }
  // });
  
    
  //admin accept/reject senior
  app.put("/api/v1/requests/senior/:requestId", async function (req, res) {
    try {
      const user = await getUser(req);
      let { seniorstatus } = req.body;
      console.log("hi");
      const userid = user.id;
      if (seniorstatus == "pending") {
        const nationalidcheck = db("se_project.senior_requests").select("nationalid");
        if (nationalidcheck != null) {
          user.isSenior;
          seniorstatus = "accepted";
          await db("se_project.senior_requests").where("id", userid).update({ status: "accepted" });
          return res.status(200).send("senior request is accepted");
        }
      } else if (seniorstatus == "rejected") {
        await db("se_project.senior_requests").where("id", userid).update({ status: "rejected" });
        return res.status(200).send("senior request is rejected");
      }
    }
    catch (e) {
      console.log(e.message);
      return res.status(400).send("rejected operation");
    }
  });
  //reset password (Tested)
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

  //subscriptions using zones db(get) (Tested)
  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);

    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get zones");
    }
  });

  //subscriptions: POST pay for subscription online (Tested)
  app.post("/api/v1/payment/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      const { creditcardnumber, holdername, payedamount, subtype, zoneid } = req.body;
      console.log("hi");
      let numOftickets = 0;
      if (subtype == "monthly") {
        numOftickets = 10;
      } else if (subtype == "quarterly") {
        numOftickets = 50;
      } else if (subtype == "yearly") {
        numOftickets = 100;
      }
      const subscription = { subtype: subtype, zoneid: zoneid, userid: user.id, nooftickets: numOftickets };
      console.log(subscription);
      console.log("bekh");
      const [subscriptionid] = await db("se_project.subsription").insert(subscription).returning("*");
      const subid = subscriptionid.id;
      console.log(subid)
      const transaction = { amount: payedamount, userid: user.id, purchasediid: subid };
      const [transactionid] = await db("se_project.transactions").insert(transaction).returning("*");


      return res.status(200).json({ transactionid, subscriptionid });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not subscribe");
    }
  });

  //tickets: POST for pay for ticket by subscription (Tested)
  app.post("/api/v1/tickets/purchase/subscription", async function (req, res) {
    try {
      const user = await getUser(req);
      const { subid, origin, destination, tripdate } = req.body;
      const subscription = await db.select("*").from("se_project.substription").where("subscriptionid", subid).andWhere("userid", user.id);
      const ticket = { origin, destination, userid: user.id, tripdate: tripdate, subscriptionid: subid };
      const [ticketid] = await db("se_project.tickets").insert(ticket).returning("id");
      return res.status(200).json({ ticketid });
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not purchase ticket");
    }
  });

  app.put("/api/v1/requests/refunds/:requestid", async function (req, res) {
    try {
      const user = await getUser(req);
      if (user.isAdmin) {
        const { refundstatus } = req.body;
        const { requestid } = req.params;
        console.log(requestid);
        const refundrequest = await db("se_project.refund_requests").where({"id": requestid}).first();
        console.log(refundrequest);
        if (!refundrequest) {
          return res.status(404).send("Refund request not found");
        }
        const ticketid = refundrequest.ticketid;
        if (refundstatus === "Approve") {
          console.log("hi");
          const subid = await db("se_project.tickets").where({"id": ticketid}).select("subid").first();
          console.log(subid.subid);
          const transactionid = await db("se_project.tickets").where({"id": ticketid}).select("id").first();
          console.log(transactionid);
          const sub = await db("se_project.subsription").where("id", subid.subid).first();
          console.log(sub.id);
          if (subid.subid == sub.id) {
            console.log("hi");
            console.log(sub.id);
            //await db("se_project.tickets").where({"subid": sub.id}).del();
            const ticketamount = await db("se_project.subsription").where({"id": subid.subid}).select("*").first();
            console.log(ticketamount.nooftickets);
            if (!ticketamount) {
              return res.status(404).send("Ticket not found");
            }
            console.log("mimimomo");
            ticketamount.nooftickets = ticketamount.nooftickets + 1;
           const vare = await db("se_project.subsription").where("id", sub.id).update("nooftickets", ticketamount.nooftickets);
           console.log(vare);
           await db("se_project.refund_requests").where({"ticketid":transactionid.id}).update("status","Approve");;
            return res.status(200).send("Refund request accepted and ticket deleted");
          } else if (transactionid && ticketid === transactionid.purchaseid) {
            await db("se_project.tickets").where("id", ticketid).del();
            return res.status(200).send("Refund request accepted and ticket deleted");
          } else {
            return res.status(404).send("Ticket not found");
          }
        } else if (refundstatus === "Decline") {
          await db("se_project.refund_requests").where("id", requestid).update("status","Decline");
          return res.status(200).send("Refund request rejected and deleted");
        } else {
          return res.status(400).send("Invalid refund status");
        }
      }
    } catch (e) {
      console.error(e.message);
      return res.status(500).send("Internal server error");
    }
  });//end of amr's code
  //simulate ride
  app.put("/api/v1/ride/simulate", async function (req, res) {
    try {
      const user = await getUser(req);
      const { origin, destination, tripDate } = req.body;
      if (!origin || !destination || !tripDate) {
        return res.status(400).send("Missing required fields");
      }
      const simulatedride = await db.select("*").from("se_project.rides")
        .where("origin", origin).andWhere("destination", destination).andWhere("tripdate", tripDate)
      simulatedride.status = "completed";
      return res.status(200).json(simulatedride);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Can't Simulate the ride");
    }
  });
  //Delete Station (admin):
  app.delete("/api/v1/station/:stationId", async function (req, res) {
    try {
      const user = await getUser(req);
      if (user.isAdmin) {
        const stationid = req.params.stationId;
        const station = await db("se_project.stations").where("id", stationid).first();
        // console.log(station.stationposition);
        if (!station) {
          return res.status(400).send("station not found");
        }
        if (station.stationtype == "normal" && station.stationposition == "start") {
          //normal & start         
          const route = await db("se_project.routes").where("fromstationid", stationid).first();
          // console.log(route);
          let newrouteid = route.fromstationid;
          let nextroute = route.tostationid;
          await db("se_project.stations").where("id", newrouteid).del();
          await db("se_project.stations").where("id", nextroute).update({ stationposition: "start" });
          nextroute.stationposition = "start";
          // console.log("bekh")
          return res.status(200).send("Station deleted successfully");
        }
        else if (station.stationtype == "normal" && station.stationposition == "end") {
          //normal & end
          const nextStationend = await db("se_project.stations").where("tostationid", stationid);

          //fl end bnbd2 bl to w nnhi bl from, w not affect route brdo 
          let newroute = nextStationend.tostationid;
          let prevroute = nextStationend.fromstationid;
          await db("se_project.stations").where("id", newroute).del();
          await db("se_project.stations").where("id", prevroute).update({ stationposition: "end" });
          return res.status(200).send("Station deleted successfully");

        } else if (station.stationtype == "normal" && station.stationposition == ("middle")) {
          //normal & middle
          const route = await db("se_project.routes").where("fromstationid", stationid);
          // console.log(route);
          let oldroute = route[0].tostationid;
          let newroute = route[1].tostationid;
          const newrouteforward = {
            routename: "hi" + oldroute + "" + newroute,
            fromstationid: oldroute,
            tostationid: newroute,
          };
          let forward = await db("se_project.routes").insert(newrouteforward).returning("*");
          forward = forward[0];
          // console.log(forward[0])

          const newroutebackward = {
            routename: "hi" + newroute + "" + oldroute,
            fromstationid: newroute,
            tostationid: oldroute,
          };
          let backward = await db("se_project.routes").insert(newroutebackward).returning("*");
          backward = backward[0];

          const oldSRf = {
            stationid: oldroute,
            routeid: forward.id,
          };
          let oldSRfor = await db("se_project.stationroutes").insert(oldSRf).returning("*");

          const oldSRb = {
            stationid: oldroute,
            routeid: backward.id,
          };
          let oldSRback = await db("se_project.stationroutes").insert(oldSRb).returning("*");
          const newSRf = {
            stationid: newroute,
            routeid: forward.id,
          };
          let newSRfor = await db("se_project.stationroutes").insert(newSRf).returning("*");

          const newSRb = {
            stationid: newroute,
            routeid: backward.id,
          };
          let newSRback = await db("se_project.stationroutes").insert(newSRb).returning("*");

          const nextStationend = await db("se_project.stations").where("id", stationid).del();
          return res.status(200).send("Station deleted successfully");

        } else if (station.stationtype == "transfer") {
          // Transfer
          const mystation = await db("se_project.stations").where("id", stationid).first();
          console.log(mystation);

          const routes = await db("se_project.routes").where("fromstationid", mystation.id);
          console.log(routes);

          const toStationIds = []; // Array to store the tostationid values


          for (const route of routes) {
            // Get the tostationid value for the current route
            const toStationId = route.tostationid;
            console.log(toStationId);

            if (toStationId !== null) {
              toStationIds.push(toStationId); // Add the tostationid to the array
            }
          }
          console.log(toStationIds); // Log all the tostationid values

          const amount = toStationIds.length;
          console.log(amount);
          for (const toStationId of toStationIds) {
            const prevroute = mystation.id; // Use the 'id' property of mystation

            // Create new object here using toStationId and the amount
            // Example:
            for (let i = 0; i < amount; i++) {
              const newObj = {
                routename: "hi" + prevroute + "" + toStationId,
                fromstationid: prevroute,
                tostationid: toStationId,
              };
              await db("se_project.routes").insert(newObj);
            }
          }
        }

        const deletingStation = await db("se_project.stations").where("id", stationid).del();
        return res.status(200).send("Station deleted successfully");


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

        // const stationToDelete = routeToDelete.toStationid;
        // const nextRoute = await db("se_project.routes").where("fromStationid", routeToDelete.toStationid).first();

        // // Delete the route
        // await db("se_project.routes").where("id", routeId).del();

        // // Update the unconnected station status and position
        // if (nextRoute) {
        //   const unconnectedStation = await db("se_project.stations").where("id", nextRoute.toStationid).first();

        //   if (unconnectedStation) {
        //     // Change the station position to "start" if it was previously "middle"
        //     if (unconnectedStation.stationposition === "middle") {
        //       await db("se_project.stations").where("id", unconnectedStation.id).update({ stationposition: "start" });
        //     }

        //     // Change the station position to "end" if it was previously "middle" and the next route is deleted
        //     if (routeToDelete.toStationid === nextRoute.fromStationid && unconnectedStation.stationposition === "middle") {
        //       await db("se_project.stations").where("id", unconnectedStation.id).update({ stationposition: "end" });
        //     }
        //   }
        // }

        return res.status(200).send("Route deleted successfully");
      } else {
        return res.status(400).send("You are not authorized to delete a route");
      }
    } catch (e) {
      console.error(e.message);
      return res.status(400).send("Could not delete the route");
    }
  });
  //this is martina's code
  //Starting farah's code 

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
    res.status(200).json({ stationsCount: stationsCount, price: price });


  });

  //end of farah's code
  //startof farida's code
  //ADMIN create a station

  app.post("/api/v1/station", async function (req, res) {
    const user = await getUser(req);
    if (user.isAdmin) {
      try {
        const stationname = req.body;
        const userid = user.userid;
        await db("se_project.stations").where("id", userid).insert({ "stationname": stationname, "stationtype": "normal", "stationstatus": "new" });
        return res.status(200).send("Station Created!");
      }
      catch (e) {
        console.log(e.message);
        return res.status(400).send("Could not create station");
      }
    }
    else {
      return res.status(400).send("You can't create station");

    }
  });


  //ADMIN creates a route 
  app.post("/api/v1/route", async function (req, res) {
    try {
      const user = await getUser(req);
      if (user.isAdmin) {
        const {newStationId, connectedStationId, routeName } = req.body;
        if (!newStationId || !connectedStationId || !routeName) {
          return res.status(400).send("Missing required fields");
        } 
        const connectedStationPosition = await db.select("stationposition").from("se_project.stations").where({ "id": connectedStationId }).first();
        console.log("hello");
        const routeid = await db.select("id").from("se_project.routes").where({ "routename": routeName }).first();
        console.log("hello1");
        if (connectedStationPosition.stationposition === "start") {
          console.log("moo");
          const newroute = {
            routename: routeName,
            fromstationid: newStationId,
            tostationid: connectedStationId,
          };
          console.log("hi");
          await db("se_project.stations").where({"id": newStationId}).update({stationposition: "start" });
          console.log("mimmiii");
          await db("se_project.stations").where({"id":connectedStationId}).update({stationposition: "middle"});
          console.log("moomoooo");
          const route = await db("se_project.routes").insert(newroute).returning("*");
          console.log(route);
          const newstationroute = {
            stationid: newStationId,
            routeid:route[0].id,
          };
          console.log("alo");
          await db("se_project.stationroutes").insert(newstationroute);
          console.log(newstationroute);

          return res.status(200).json(route);
        } 
        else if (connectedStationPosition === "end") {
          const newroute = {
            routename: routeName,
            fromstationid: connectedStationId,
            tostationid: newStationId,
          };
          await db("se_project.stations").where("id", newStationId).update({stationposition: "end" });
          await db("se_project.stations").where("id", connectedStationId).update({ stationposition: "middle" });
          const route = await db("se_project.routes").insert(newroute).returning("*");
          const newstationroute = {
            stationid: newStationId,
            routeid: route[0].id,
          };
          await db("se_project.stationroutes").insert(newstationroute);
          return res.status(200).json(route);
        }
      }
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not create route");
    }
  }); ///pay ticket for online:
  app.post("/api/v1/payment/ticket", async function (req, res) {
    try {
      const user = await getUser(req);
      const useridsubscription = await db.select("userid").from("se_project.subsription");
      if (useridsubscription != user.id) {
        const { purchasediid, creditcardnumber, holdername, payedamount, origin, destination, tripdate } = req.body;
        const transaction = { amount: payedamount, userid: user.id, purchasediid: purchasediid };
        const [transactionid] = await db("se_project.transactions").insert(transaction).returning("id");
        //insert ticket into upcoming ride 
        //const ticketinsert = await db("se_project.rides").insert(tripdate).returning("id","tripdate");
        return res.status(200).json({ transactionid });
      } else {
        return res.status(200).send("user has a subscription");
      }
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not subscribe");
    }
  });
  //this is farida's code

//this is eyads code
//Accept/Reject Senior
app.put("/api/v1/requests/senior/:requestId",async function(req,res){
  try{  
    const user = await getUser(req);
    let {seniorstatus}=req.body;
    const userid = user.id;
  if ( seniorstatus == "pending" ){
    const nationalidcheck = db("se_project.senior_requests").select("nationalid");
    if (nationalidcheck != null){
      user.isSenior;
      seniorstatus = "accepted";
      await db("se_project.senior_requests").where("id" , userid).update({status : "accepted"});
      const amountt = await db("se_project.transactions").select("amount")
      const discount = amountt - 0.5;
      return res.status(200).send("senior request is accepted");
    }
  }else if(seniorstatus == "rejected"){
    await db("se_project.senior_requests").where("id" , userid).update({status : "rejected"});
    return res.status(200).send("senior request is rejected");
  }
  }
  catch(e){
    console.log(e.message);
    return res.status(400).send("rejected operation");
  }
  });

  //Update Zone Price 
app.put("/api/v1/zones/:zoneId", async function(req,res){
  try{
    const user = await getUser(req);
    if(user.isAdmin){
    const {zoneid} = req.params;
    const {price}=req.body;
    const updatedprice = await db("se_project.zones").where("id", zoneid).update({price});
    return res.status(200).send(updatedprice, "updated");
    }else{
      return res.status(400).send("You are not authorized to update zone price");
    }
  } catch(e){
    console.log(e.message);
    return res.status(400).send("failed to update");
} 

});


//table viewing routes
app.get("/api/v1/routes", async function(req, res){
  try{
  const getroutes = await db("se_project.routes").select("*");
  return res.status(200).json(getroutes);
  }catch(e){
    console.log(e.message);
    return res.status(400).send("Could not get routes");
  }
});

//view pending refund requests
app.get("/api/v1/refunds", async function(req,res){
  try{
  const getrefund = await db("se_project.refunds").select("*");
  return res.status(200).json(getrefund);
  }catch(e){
    console.log(e.message);
    return res.status(400).send("Could not get refund requests");
  }
});

//view pending senior requests
app.get("/api/v1/seniorrequests", async function(req,res){
  try{
  const getsnior = await db("se_project.senior_requests").select("*");
  return res.status(200).json(getsnior);
  }catch(e){
    console.log(e.message);
    return res.status(400).send("Could not get senior requests");
  }
});

//view all zones
app.get("/api/v1/zones", async function(req,res) {
  try{
const allzones = await db("se_project.zones").select("*")
return res.status(200).json(allzones);
}catch(e){
  console.log(e.message);
  return res.status(400).send("Could not get zones");
}
});

//refubd ticket 
// app.post("/api/v1/refund/:ticketId", async function(req,res){
//   try{
// const ticket = await db("se_project.ticket").select("userid").where(userid => user)






//   }catch(e){
//     console.log(e.message);
//     return res.status(400).send("Could not get ticket");
//   }

// });
};
//end of eyad's code