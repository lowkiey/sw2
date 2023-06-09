const path = require('path');
const express = require('express');
const app = express();
const authMiddleware = require('./middleware/auth');
const privateApiRoutes = require('./routes/private/api');
const publicApiRoutes = require('./routes/public/api');
const publicViewRoutes = require('./routes/public/view');
const privateViewRoutes = require('./routes/private/view');

// view engine setup
<<<<<<< HEAD
app.set('views', path.join(__dirname, 'views'));   //only time I want to retrieve HTML will be from views folder
app.set('view engine', 'hjs');    //connect view with hjs
=======
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');  //which page im gonna load, using which extention of the pages
>>>>>>> d03dac7554b3ec10b2dc3f0dc035431b275ded3e
// Config setup to allow our HTTP server to serve static files from our public directory
app.use(express.static('public'));  //el folder el esmo public khlih static 
// Config setup to parse JSON payloads from HTTP POST request body
<<<<<<< HEAD
app.use(express.json());    //allows us to setup view 
app.use(express.urlencoded({extended:true}));
=======
app.use(express.json());
app.use(express.urlencoded({extended:true}));  //btsm7 en a pass array 
>>>>>>> d03dac7554b3ec10b2dc3f0dc035431b275ded3e

// All public routes can be accessible without authentication
//endpoints ll frontend w kolgoum type get
publicViewRoutes(app);
publicApiRoutes(app);// uncomment

// If the request is not for a public view/api, then it must pass
// through our authentication middleware first
 app.use(authMiddleware); // uncomment

// The routes/views below can only be accessed if the user is authenticated
privateViewRoutes(app);
privateApiRoutes(app);

// If request doesn't match any of the above routes then render the 404 page
app.use(function(req, res, next) {
  return res.status(404).render('404');
});

// Create HTTP Server and Listen for Requests
app.listen(3000);