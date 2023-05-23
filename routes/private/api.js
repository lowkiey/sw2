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
  return user;
};

module.exports = function (app) {
  // example
  app.put("/users", async function (req, res) {
    try {
      const user = await getUser(req);
      console.log("hiiiiiiiiiii");
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
      return res.status(200).json(simulatedRide);
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
        const stationid = req.params.stationid;
        const station = await db("se_project.stations").where("id", stationid);
        if (!station) {
          return res.status(400).send("station not found");
        }
        if (station.stationtype == "normal" && station.stationpostition == "start") {
          await db("se_project.stations").where("id", stationid).del();
          const nextStation = await db("se_project.stations")
            .where("id", ">", stationid)
            .andWhere("stationpostition", "=", "middle")
            .orderBy("id", "asc")
            .first();
          if (nextStation) {
            await db("se_project.stations")
              .where("id", nextStation.id)
              .update({ stationposition: "start" });
            //////done the station////
          }
          const editedroutes = await db("se_project.routes")
            .join("se_project.stationRoutes", "se_project.routes.id", "se_project.stationRoutes.routeid")
            .where("se_project.stationRoutes.stationid", stationid)
            .select("se_project.routes.id");

          for (const route of editedroutes) {
            await db("se_project.stationRoutes")
              .where("routeid", route.id)
              .andwhere("stationid", nextStation.id)
              .update({ stationposition: "start" });

            await db("se_project.routes")
              .where("id", route.id)
              .update({ fromstationid: nextStation.id });
          }
          //////done the routes & stationRoutes////
          // await db("se_project.stations").where("id",stationid).del();

        }
        else if (station.stationtype == "normal" && station.stationpostition == "end") {
          await db("se_project.stations").where("id", stationid).del(); // msh di a7sn eni a3mlha fl akher?? 
          const nextStationend = await db("se_project.stations")
            .where("id", "<", stationid)
            .andWhere(stationpostition, "=", "middle")
            .orderBy("id", "desc")   //wla hena ascending?
            .first();
          if (nextStationend) {
            await db("se_project.stations")
              .where("id", nextStationend.id)
              .update({ stationposition: "end" });
            //////done the station////

            //el ana fhmto fl route eni ha7tag a delete el route el 3ndi bta3 el station el adima abl mattms7
            const laststationid = stationid.id;
            const lastroute = await db("se_project.routes")
              .where("fromstationid", laststationid)
              .orderBy("id", "desc")
              .first();
            if (lastroute) {
              await db("se_project.routes").where("id", lastroute.id).del();
            }
            const lastStationRoute = await db("se_project.stationRoutes")
              .where("stationid", laststationid)
              .orderBy("id", "desc")
              .first();

            if (lastStationRoute) {
              await db("se_project.stationRoutes")
                .where("id", lastStationRoute.id)
                .del();
            }
            //////done the routes & stationRoutes////
          }
        } else if (station.stationtype == "normal" && station.stationpostition == "middle") {



        } else if (station.stationtype == "transfer") {



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

};

