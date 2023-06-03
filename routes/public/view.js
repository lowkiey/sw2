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


};
