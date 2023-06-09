const db = require('../../connectors/db');
const roles = require('../../constants/roles');
const { getSessionToken } = require('../../utils/session');

const getUser = async function (req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect('/');
  }

  const user = await db.select('*')
    .from('se_project.sessions')
    .where('token', sessionToken)
    .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
    .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
    .first();

  console.log('user =>', user)
  user.isStudent = user.roleid === roles.student;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;

  return user;
}

module.exports = function (app) {
  // Register HTTP endpoint to render /users page
  app.get('/dashboard', async function (req, res) {
    const user = await getUser(req);
    return res.render('dashboard', user);
  });

  app.get('/dashboardAdmin', async function (req, res) {
    const user = await getUser(req);
    return res.render('dashboardAdmin', { user });
  });

  // Register HTTP endpoint to render /users page
  app.get('/users', async function (req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('users', { users });
  });

  // Register HTTP endpoint to render /courses page
  app.get('/stations', async function (req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('stations_example', { ...user, stations });
  });

  app.get('/tickets', async function (req, res) {
    const user = await getUser(req);
    const tickets = await db.select('*').from('se_project.tickets');
    return res.render('tickets', { ...user, tickets });
  });
  app.get('/newpassword', async function (req, res) {
    const user = await getUser(req);
    return res.render('newpassword', { user: user });
  });
  app.get('/prices', async function (req, res) {
    const stations = await db.select('*').from('se_project.stations');
    return res.render('prices', { stations });
  });
  app.get('/senior', async function (req, res) {
    const seniorRequest = await db.select('*').from('se_project.senior_requests');
    return res.render('senior', { seniorRequest });

  });
  app.get('/paymentMethod', async function (req, res) {
    return res.render('paymentMethod');
  });
  app.get('/creditInfo', async function (req, res) {
    return res.render('creditInfo');
  });
  app.get('/paybysub', async function (req, res) {
    return res.render('paybysub');
  });
  app.get('/stations_example', async function (req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('stations_example', { ...user, stations });
  });
  app.get('/addStation', async function (req, res) {
    const station = await db.select('*').from('se_project.stations');
    return res.render('addStation', { station });
  });
  app.get('/updateStation', async function (req, res) {
    const station = await db.select('*').from('se_project.stations');
    return res.render('updateStation', { station });
  });
  app.get('/routes', async function (req, res) {
    const user = await getUser(req);
    const routes = await db.select('se_project.routes.id', 'se_project.routes.routename', 'fromstation.stationname AS FromStation', 'tostation.stationname AS ToStation')
      .from('se_project.routes')
      .innerJoin("se_project.stations AS fromstation", 'fromstation.id', '=', 'se_project.routes.fromstationid')
      .innerJoin("se_project.stations AS tostation", 'tostation.id', '=', 'se_project.routes.tostationid');
    console.log(routes)
    return res.render('routes', { ...user, routes });
  });
  app.get('/addRoute', async function (req, res) {
    const routes = await db.select('*').from('se_project.routes');
    return res.render('addRoute', { routes });
  });
  app.get('/updateRoute', async function (req, res) {
    const routes = await db.select('*').from('se_project.routes');
    return res.render('updateRoute', { routes });
  });
  app.get('/updateZones', async function (req, res) {
    const routes = await db.select('*').from('se_project.routes');
    return res.render('updateZones', { routes });
  });
  app.get('/subscriptions', async function (req, res) {
    const user = await getUser(req);
    const subscriptions = await db.select('*').from('se_project.subsription');
    return res.render('Subscriptions', { ...user, subscriptions });

  });
  app.get('/zones', async function (req, res) {
    const user = await getUser(req);
    const zones = await db.select('*').from('se_project.zones');
    return res.render('zones', { ...user, zones });

  });
  app.get('/rides', async function (req, res) {
    const rides = await db.select('*').from('se_project.rides');
    return res.render('rides', { rides });
  });
};
