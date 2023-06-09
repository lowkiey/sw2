const db = require('../../connectors/db');

module.exports = function (app) {
  //Register HTTP endpoint to render /index page
  app.get('/', function (req, res) {
    return res.render('index');
  });
  // example of passing variables with a page
  app.get('/register', async function (req, res) {
    const stations = await db.select('*').from('se_project.stations');
    return res.render('register', { stations });
  });
    // Register HTTP endpoint to render /users page
    app.get('/users', async function (req, res) {
      const users = await db.select('*').from('se_project.users');
      return res.render('user', { users });
    });
    app.get('/tickets', async function (req, res) {
      const tickets = await db.select('*').from('se_project.tickets');
      return res.render('tickets', {tickets});
    });
    app.get('/subscriptions', async function(req, res) {
      const subscriptions = await db.select('*').from('se_project.subsription');
      return res.render('Subscriptions', {subscriptions});

    });
    app.get('/zones', async function(req, res) {
      const zones = await db.select('*').from('se_project.zones');
      return res.render('zones', {zones});

    });
    
    };