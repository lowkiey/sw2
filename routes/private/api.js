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

  //reset password:
  app.put("/api/v1/password/reset", async function (req, res) {
    try {
      const { newpassword } = req.body;
      const user = await getUser(req);
      const useridn = user.userid;

      if (!newpassword) {
        return res.status(400).send("Please provide a new password");
      }

      if (newpassword === user.password) {
        return res.status(400).send("New password cannot be the same as the old password");
      }

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
  app.get("/api/v1/zones", async function (req, res) {
    try {
      const zones = await db.select("*").from("se_project.zones");
      return res.status(200).json(zones);
    } catch (e) {
      console.log(e.message);
      return res.status(400).send("Could not get zones");
    }
  });

  // simulate a ride : 
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
        //   const prevStation = await db("se_project.stations").where("stationposition", "end").first();
        //   const nextStations = await db("se_project.routes")
        //     .where("fromstationid", stationid)
        //     .pluck("tostationid");

        //   for (const nextStationId of nextStations) {
        //     const newObj = {
        //       routename: "route_" + prevStation.id + "_" + nextStationId,
        //       fromstationid: prevStation.id,
        //       tostationid: nextStationId,
        //     };

        //     await db("se_project.routes").insert(newObj);
        //   }
        // }

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

};

