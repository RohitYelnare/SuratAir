const express = require("express");
const ejs = require("ejs");
const mysql = require("mysql2");
const { response } = require("express");

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var flightsfound,destinationsfound,flight_id_tmp, seat_tmp=[], pcount=[],pname=[], pgender=[],occupied=[], page=[];
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

var mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'suratair',
    multipleStatements: true
});
    
mysqlConnection.connect((err)=> {
    if(!err)
        console.log('Connection Established Successfully');
    else
        console.log('Connection Failed!'+ JSON.stringify(err,undefined,2));
});

app.get("/", function(req, res){
    const query = "SELECT city, country FROM airport;";

    mysqlConnection.query(query, (err, destinations, fields) => {
        if (!err){
            destinationsfound=destinations;
            // res.send(destinationsfound);
        }else
            console.log(err);
    });
    res.redirect("search");
});

app.get("/booking", function(req, res){
    res.render("booking");
})

app.get("/register", function(req, res){
    res.render("register");
})

app.post("/register", function(req, res){
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const chkquery = "SELECT * FROM user WHERE email='" + email + "'";
    const query = "INSERT INTO user (name, email, password) values('" + name + "', '" + email + "', '" + password + "')";

    mysqlConnection.query(chkquery, (err, rows, fields) => {
        if (!err){
            if(rows.length==0){
                mysqlConnection.query(query, (err, rows, fields) => {
                    if (!err){
                        res.send("successfully registered");
                    }
                        else
                        console.log(err);
                });
            }else{
                res.send("already exists");
            }
        }
            else
            console.log(err);
    });

})

app.get("/login", function(req, res){
    res.render("login");
})

app.post("/login", function(req, res){
    const email = req.body.email;
    const password = req.body.password;
    const chkquery = "SELECT * FROM user WHERE email='" + email + "'";

    mysqlConnection.query(chkquery, (err, rows, fields) => {
        if (!err){
            if(rows.length==1){
                if(rows[0].password==password){
                    res.send("successful login");
                }else{
                    res.send("wrong password");
                }
            }else if(rows.length==0){
                res.send("No such user found");
            }else{
                res.send("Multiple users found");
            }
        }
            else
            console.log(err);
    });

})

app.get("/search", function(req, res){

    res.render("search", {destinationsfound:destinationsfound});
})

app.post("/search", function(req, res){
    const dept = req.body.dept;
    const arr = req.body.arr;
    const date = req.body.date;
    pcount = req.body.pcount;
    const query = "SELECT DISTINCT * FROM route r, flight f, airport a1, airport a2 WHERE  f.route_id=r.route_id AND r.dept_code=a1.code_id AND r.arr_code=a2.code_id AND f.dept_date='" + date + "' AND a1.city='" + dept +"' AND a2.city='" + arr + "';";

    mysqlConnection.query(query, (err, flights, fields) => {
        if (!err){
            if(flights.length==0){
                res.send("no flights found");
            }else{
                flightsfound=flights;
                res.redirect("flights");
            }
        }
            else
            console.log(err);
    });

});

//restict user from direct url entering 
// permittedLinker = ['localhost', '127.0.0.1'];  // who can link here?

// app.use(function(req, res, next) {
//   var i=0, notFound=1, referer=req.get('Referer');

//   if ((req.path==='/') || (req.path==='')) next(); // pass calls to '/' always

//   if (referer){
//       while ((i<permittedLinker.length) && notFound){
//       notFound= (referer.indexOf(permittedLinker[i])===-1);
//       i++;
//       }
//   }

//   if (notFound) { 
//      res.status(403).send('Protected area. Please enter website through "search page"');
//   } else {
//     next(); // access is permitted, go to the next step in the ordinary routing
//   }
// });

//

app.get("/flights", function(req, res){
    res.render("flights", {flights: flightsfound});
});

app.post("/flights", function(req, res){
    console.log(req.body);
    // const query = "SELECT ac.capacity FROM fleet ac, flight f WHERE f.aircraft_id=ac.aircraft_id AND f.flight_id=" + req.body.flightno + ";";
    flight_id_tmp = req.body.flightno;
    const occupied_query = "SELECT seat_no FROM ticket t WHERE flight_id=" + flight_id_tmp + ";";

    mysqlConnection.query(occupied_query, (err, occ_seats, fields) => {
        if (!err){
            occ_seats.forEach((obj)=>occupied.push(obj.seat_no))
        }
            else
            console.log(err);
    });
    res.redirect("seat");
});

app.get("/seat", function(req, res){
    res.render("seat", {pcount: pcount, occupied:occupied});
});

app.post("/seat", function(req, res){
    for(var i=0; i<=180; i++){
        if(req.body[i]=='on')
        seat_tmp.push(i);
    }
    console.log()
    res.redirect("pdetails");
});

app.get("/pdetails", function(req, res){
    res.render("pdetails", {pcount: pcount});
});

app.post("/pdetails", function(req, res){
    console.log(req.body);
    pname = req.body.name;
    pgender = req.body.gender;
    page = req.body.age;
    var booking_id_tmp, user_id=1;
    var ticket_id_tmp;
    var passenger_id_tmp;
    var inspassenger = "INSERT INTO passenger values";
    var insbooking = "INSERT INTO booking (user_id, booking_timestamp) values(" + user_id + ",CURRENT_TIMESTAMP());";
    mysqlConnection.query(insbooking, (err, booking_ins_output, fields) => {
        if (!err){
            booking_id_tmp = booking_ins_output.insertId;
            for(var j=0; j<pcount; j++){
                var insticket = "INSERT INTO ticket(booking_id, flight_id, seat_no) values(" + booking_id_tmp + "," + flight_id_tmp + "," + seat_tmp.pop() + ");";
                mysqlConnection.query(insticket, (err, ticket_ins_output, fields) => {
                    if(!err){
                        ticket_id_tmp = ticket_ins_output.insertId;
                        var inspassenger = "INSERT INTO passenger(ticket_id, name, gender, age) values(" + ticket_id_tmp + ",'" + pname.pop() + "','"  + pgender.pop() + "'," + page.pop() + ");";
                        mysqlConnection.query(inspassenger, (err, ticket_ins_output, fields) => {
                            if(!err){
                                console.log(req.body);
                            }else
                            console.log(err)
                        });
                    }else
                    console.log(err)
                })
            }

        }else
        console.log(err);
    });
    
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Airline Server started on port 3000");
});