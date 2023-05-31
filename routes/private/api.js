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
};
