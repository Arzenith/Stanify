const dotenv = require("dotenv");
dotenv.config();

// Environment Variables
const PORT = process.env.PORT;

// Libraries
const express = require("express");
const axios = require("axios");
const app = express();
const bodyParser = require('body-parser');
const session = require('express-session');

// Application will serve the html and css in the public directory
app.use(express.static("public"));

// Application will use sessions to store user's stats
app.use(session({
    secret: "Do or do not, there is no try",
    resave: false,
    saveUninitialized: true
}))

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

// Routes
app.use('/spotify', require('./routes/spotify'))

// View Engine
app.set('views', './views')
app.set('view engine', 'ejs');

// Start up the server
app.listen(PORT, () =>{
    console.log("Welcome to the server");
})