const dotenv = require("dotenv");
dotenv.config();

// Environment Variables
const PORT = process.env.PORT;

// Libraries
const express = require("express");
const app = express();
const path = require("path");

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "/views"));

app.get("/", (req, res) => {
    res.render("index")
})

// Application will serve the html and css in the public directory
app.use('/public', express.static("public"));
app.use('/spotify', require('./routes/Spotify'));

// Body Parser
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended: true
// }));

// Start up the server
app.listen(PORT, () =>{
    console.log("Welcome to the server");
})