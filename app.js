const express = require("express");
const ejs = require("ejs");
const mysql = require("mysql2");
const { response } = require("express");
var flash=require("connect-flash");
const bcrypt=require("bcrypt");
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var adminallflights,flightsfound,destinationsfound,flight_id_tmp, user_id, plistres, user_name, isUseradmin, seat_tmp=[], pcount=[],pname=[], 
pgender=[],occupied=[], page=[], flight_dur=[], bookingsoutput=[], ticketsoutput=[], samplestr="samplestr";

app.use(require("express-session")({
    secret:"00000000",
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

app.use(function(req, res, next){
     res.locals.message = req.flash();
    next();
});


function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

var mysqlConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'suratairdb',
    multipleStatements: true
});
    
mysqlConnection.connect((err)=> {
    if(!err)
        console.log('Connection Established Successfully');
    else
        console.log('Connection Failed!'+ JSON.stringify(err,undefined,2));
});

app.get("/test", function(req, res){
    var testproc = "CALL testfunc";
    mysqlConnection.query(testproc, (err, output, fields) => {
        if (!err){
            res.send(output);
        }else
        console.log(err);
    });
});

app.get("/", function(req, res){
    const query = "SELECT city, country FROM airport;";
    mysqlConnection.query(query, (err, destinations, fields) => {
        if (!err){
            destinationsfound=destinations;
        }else
            console.log(err);
    });
    if(user_id===undefined){
        res.redirect("login");
    }else if(isUseradmin==0){
        res.redirect("search");
    }else{
        res.redirect("admin");
    }
});

app.post("/tickets", function(req, res){
    var del_ticket_id=req.body.ticketid;
    var delprocedure = "CALL delticket(?)";
    mysqlConnection.query(delprocedure,[del_ticket_id], (err, delticketres, fields) => {
        if (!err){
            res.redirect("booking");
        }else
            console.log(err);
    });
});

app.get("/signup", function(req, res){
    res.render("signup");
})

app.post("/signup", function(req, res){
    const name = req.body.name;
    user_name=name;
    const email = req.body.email;
    const mobile = req.body.mobile;
    var admin = (req.body.isAdmin=='on')?1:0;
    isUseradmin = (req.body.isAdmin=='on')?1:0;
    var password = req.body.password;
    const saltRounds=bcrypt.genSalt(20);
    //hashing the password;
    bcrypt.genSalt(10, function(err, salt) {
        if (err) return callback(err);
    
        bcrypt.hash(password, salt, function(err, hash) {
            password = hash;
            const chkquery = "SELECT * FROM user WHERE email=?";
            const insquery = "INSERT INTO user (name, email, mobile, password, admin) values(?,?,?,?,?);";

            mysqlConnection.query(chkquery,[email], (err, chkres, fields) => {
                if (!err){
                    if(chkres.length==0){
                        mysqlConnection.query(insquery,[name, email, mobile, password, admin], (err, insres, fields) => {
                            if (!err){
                                user_id=insres.insertId;
                               // res.send("successfully registered");
                                req.flash("success","Registrstion Successful!! To continue please login first.");
                                res.redirect("/");
                            }
                                else
                                console.log(err);
                        });
                    }else{
                        req.flash("error","Email id already used! Try signing up with a different email id");       
                        res.redirect("/signup");
                    }
                }
                    else
                    console.log(err);
            });
        });
    });
    
    
})

app.get("/login", function(req, res){
    res.render("login");
})

app.post("/login", function(req, res){
    const email = req.body.email;
    const password = req.body.password;
    isUseradmin = (req.body.isAdmin=='on')?1:0;
    var flag;
    const chkquery = "SELECT * FROM user WHERE email=?";
    
    mysqlConnection.query(chkquery,[email], (err, chkres, fields) => {
        if (!err){
            if(chkres.length==1){
                bcrypt.compare(password,chkres[0].password, function(err, result) {
                    if(!err){
                        flag=true;
                    }
                    else{
                        flag=false;
                    }
                });
                if(!flag){
                    if(isUseradmin==chkres[0].admin){
                        user_id=chkres[0].user_id;
                        user_name=chkres[0].name;
                        req.flash("success","Login Successful!");
                        return res.redirect("/");
                    }else{
                        req.flash("error","Incorrect information entered");
                        return res.redirect("/login");
                    }
                }else{
                    req.flash("error","Wrong Password/Email");
                    return res.redirect("/login");
                }
                
            }else if(chkres.length==0){
                req.flash("error","No User Found! Please sign up first.");
                return  res.redirect("/login");
            }else{
                //res.send("Multiple users found");
                return res.redirect("/login");
            }
        }
            else
            console.log(err);
    });

})

app.get("/logout", function(req, res){
    user_id=undefined;
    user_name=undefined;
    res.redirect("/login");
})
var allairports,allroutes,allfleet,everyflight;
app.get("/admin", function(req, res){
    var allflightsquery = "SELECT * FROM flight INNER JOIN route ON flight.route_id=route.route_id";
    var  displayairports="SELECT * from airport; ";
    var displayroutes="SELECT * FROM route;";
    var displayfleet="SELECT * FROM fleet;";
    var displayflights="SELECT * FROM flight;"
    
    mysqlConnection.query(allflightsquery, (err, allflights, fields) => {
        if (!err){
            adminallflights=allflights;
            mysqlConnection.query(displayairports, (err, airportres, fields) => {
                if (!err){
                    allairports=airportres;
                    mysqlConnection.query(displayroutes, (err, airroutes, fields) => {
                        if (!err){
                            allroutes=airroutes;
                            mysqlConnection.query(displayfleet, (err, aircrafts, fields) => {
                                if (!err){
                                    allfleet=aircrafts;
                                    mysqlConnection.query(displayflights, (err, airflights, fields) => {
                                        if (!err){
                                            everyflight=airflights;
                                            if(user_id===undefined){
                                                res.redirect("login");
                                            }else{
                                            setTimeout((() => {
                                                res.render("admin" , {user_id:user_id, user_name: user_name});
                                            }), 2000);}
                                        }
                                        else
                                        console.log(err);
                                    });
                                }
                                else
                                console.log(err);
                            });
                        }
                        else
                        console.log(err);
                    });
                }
                else
                console.log(err);
            });
        }
        else
        console.log(err);
    });
})

app.get("/search", function(req, res){
    if(user_id===undefined){
        res.redirect("login");
    }else{
    setTimeout((() => {
        res.render("search", {destinationsfound:destinationsfound, user_id:user_id, user_name: user_name});
    }), 2000);}
})

app.post("/search", function(req, res){
    const dept = req.body.dept;
    const arr = req.body.arr;
    const date = req.body.date;
    pcount = req.body.pcount;
    const query = "SELECT DISTINCT flight_id, fare, dept_date, dept_code, arr_code, dept_time, arr_time, a1.city as dept_city, a1.name as dept_name, a2.city as arr_city, a2.name as arr_name FROM route r INNER JOIN flight f ON f.route_id=r.route_id INNER JOIN airport a1 ON r.dept_code=a1.code_id INNER JOIN airport a2 ON r.arr_code=a2.code_id WHERE f.dept_date=? AND a1.city=? AND a2.city=? AND f.seats_left>=?;";

    mysqlConnection.query(query,[date,dept,arr,pcount], (err, flights, fields) => {
        if (!err){
            if(flights.length==0){
                res.redirect("noflights");
            }else{
                flightsfound=flights;
                flightsfound.forEach((flight)=>flight_dur.push(time_diff (flight.arr_time, flight.dept_time)));
                res.redirect("flights");
            }
        }
            else
            console.log(err);
    });

});

//restict user from direct url entering 
permittedLinker = ['localhost', '127.0.0.1'];  // who can link here?

app.use(function(req, res, next) {
  var i=0, notFound=1, referer=req.get('Referer');

  if ((req.path==='/') || (req.path==='')) next(); // pass calls to '/' always

  if (referer){
      while ((i<permittedLinker.length) && notFound){
      notFound= (referer.indexOf(permittedLinker[i])===-1);
      i++;
      }
  }

  if (notFound) { 
     res.status(403).send('Protected area. Please enter website through "search page"');
  } else {
    next(); // access is permitted, go to the next step in the ordinary routing
  }
});

app.get("/addairport",function(req,res){
    setTimeout((() => {
        res.render("addairport",{allairports:allairports});
    }), 2000);
})

app.post("/addairport",function(req,res){
    var portId=req.body.airportId;
    var portName=req.body.airportName;
    var portCity=req.body.airportCity;
    var portCountry=req.body.airportCountry;
    
    var addairportquery="INSERT INTO airport(code_id, city, name, country) VALUES(?,?,?,?);";
    var checkCodeId="SELECT airport.code_id FROM airport WHERE ?=airport.code_id ;"
    mysqlConnection.query(addairportquery,[portId,portCity,portName,portCountry], (err, airports, fields) => {
        if (!err){
            res.redirect("admin");
        }
        else
        console.log(err);
    });
    console.log(portId);
})

app.get("/addroute",function(req,res){
    setTimeout((() => {
        res.render("addroute",{allairports:allairports,allroutes:allroutes});
    }), 2000);
});

app.post("/addroute",function(req,res){
    var dept_port=req.body.airport_dept;
    var arr_port=req.body.airport_arr;
    var flag=[];
    var addRoutequery="CALL addRoute(?,?);"
    mysqlConnection.query(addRoutequery,[dept_port,arr_port],(err,airroute,fields)=>{
        if(!err)
        {
            res.redirect("admin");
        }
        else{
            console.log(err);
        }
    })
    
})

app.get("/addaircraft",function(req,res){
    setTimeout((() => {
        res.render("addaircraft",{allfleet:allfleet});
    }), 2000);
});

app.post("/addaircraft",function(req,res){
    var isowned=(req.body.isowned=='on')?1:0;
    var insaircraft = "INSERT INTO fleet(type, reg, age, capacity, acquire_date, isowned) values(?,?,?,?,?,?);";
    mysqlConnection.query(insaircraft,[req.body.type, req.body.reg, req.body.age, req.body.capacity, req.body.acquiredate, isowned], (err, insaircraftres, fields) => {
        if (!err){
            res.redirect("/admin");
        }
        else
        console.log(err);
    });
});

app.get("/adminallflights", function(req, res){
    setTimeout((() => {
        res.render("adminallflights", {adminallflights:adminallflights});
    }), 1500);
})

app.post("/adminallflights", function(req, res){
    var flightreq = req.body.flightid;
    var plistview = "CREATE OR REPLACE VIEW passengerlist AS SELECT name, age, gender, seat_no FROM passenger INNER JOIN ticket ON ticket.ticket_id=passenger.ticket_id WHERE flight_id=? ORDER BY seat_no;";
    var plistquery = "SELECT * FROM passengerlist;";
    mysqlConnection.query(plistview,[flightreq], (err, viewres, fields) => {
        if (!err){
            mysqlConnection.query(plistquery, (err, output, fields) => {
                if (!err){
                    plistres=output;
                    res.redirect("plist");
                }
                else
                console.log(err);
            });
        }
        else
        console.log(err);
    });
})

app.get("/addflights", function(req, res){
    setTimeout((() => {
        res.render("addflights", {everyflight:everyflight,allroutes:allroutes,allfleet:allfleet});
        
    }), 1500);
})

app.post("/addflights",function(req,res){

    var aircraftId=req.body.aircraftId;
    var routeId=req.body.routeId;
    var dept_time=req.body.dept_time.substring(0, 5)+":00";
    var arr_time=req.body.arr_time.substring(0, 5)+":00";
    var fare=req.body.fare;
    var date_dept=req.body.dept_date.toString().substring(0,15);
    
    var addflightquery="CALL addFlight(?,?,?,?,?,?);"
    mysqlConnection.query(addflightquery,[aircraftId,routeId,dept_time,arr_time,fare,date_dept], (err, flightsres, fields) => {
        if (!err){
            res.redirect("/admin");
        }
        else
        console.log(err);
    });
});

app.get("/reschedule", function(req, res){
    setTimeout((() => {
        res.render("reschedule", {adminallflights:adminallflights});
    }), 1500);
})

app.post("/reschedule",function(req,res){
    if(req.body.submitbtn=='Reschedule'){
        var newdept=req.body.newdept.substring(0, 5)+":00";
        var newarr=req.body.newarr.substring(0, 5)+":00";
        var newfare=req.body.newfare;
        var rescheduleid=req.body.flightid;
        var reschedulequery = "UPDATE flight SET dept_time=?, arr_time=?, fare=? WHERE flight_id=?;";
        mysqlConnection.query(reschedulequery,[newdept, newarr, newfare, rescheduleid], (err, rescheduleres, fields) => {
            if (!err){
                res.redirect("/admin");
            }
            else
            console.log(err);
        });
    }else if(req.body.submitbtn=='Cancel'){
        var delflightid = req.body.flightid;
        var delflightquery = "DELETE FROM flight WHERE flight_id=?;";
        mysqlConnection.query(delflightquery,[delflightid], (err, rescheduleres, fields) => {
            if (!err){
                res.redirect("/admin");
            }
            else
            console.log(err);
        });
    }
});

app.get("/plist", function(req, res){
    res.render("plist", {plistres:plistres});
})

app.get("/booking", function(req, res){
    bookingsoutput=[], ticketsoutput=[];
    var bookingquery = "select * from booking where user_id =?;";
    
    mysqlConnection.query(bookingquery,[user_id], (err, bookingres, fields) => {
        if (!err){
            for(var i=0; i<bookingres.length; i++){
                bookingsoutput.push(bookingres[i]);
                var ticketsquery = "select name, dept_time, dept_date, dept_code, arr_code, t.ticket_id, f.route_id, f.flight_id, seat_no, b.booking_timestamp from booking b, ticket t, passenger p, flight f, route r where user_id=? and f.flight_id=t.flight_id and b.booking_id=? and b.booking_id=t.booking_id and f.route_id=r.route_id and p.ticket_id=t.ticket_id;";
                mysqlConnection.query(ticketsquery,[user_id,bookingres[i].booking_id], (err, ticketsres, fields) => {
                    if (!err){
                        ticketsoutput.push(ticketsres);
                    }else
                    console.log(err);
                });
                if(ticketsoutput!==undefined){
                }
            }
            res.redirect("tickets");
        }else
        console.log(err);
    });
})

app.get("/tickets", function(req, res){
    setTimeout((() => {
        res.render("tickets", {bookingsoutput: bookingsoutput, ticketsoutput: ticketsoutput, user_id:user_id, user_name: user_name});
    }), 1500)
});


app.get("/noflights", function(req, res){
    res.render("noflights");
});

app.get("/flights", function(req, res){
    res.render("flights", {flights: flightsfound, pcount:pcount, flight_dur:flight_dur});
});

app.post("/flights", function(req, res){
    flight_id_tmp = req.body.flightno;
    const occupied_query = "SELECT seat_no FROM ticket t WHERE flight_id=?;";

    mysqlConnection.query(occupied_query,[flight_id_tmp], (err, occ_seats, fields) => {
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
    res.redirect("pdetails");
});

app.get("/pdetails", function(req, res){
    res.render("pdetails", {pcount: pcount});
});

app.post("/pdetails", function(req, res){
    pname=req.body.name;
    pgender=req.body.gender;
    page=req.body.age;
    var booking_id_tmp;
    var ticket_id_tmp;
    var passenger_id_tmp;
    var inspassenger = "INSERT INTO passenger values";
    var insbooking = "INSERT INTO booking (user_id, booking_timestamp) values(?,CURRENT_TIMESTAMP());";
    if(user_id===undefined){
        res.redirect("login");
    }else{
        mysqlConnection.query(insbooking, [user_id], (err, booking_ins_output, fields) => {
            if (!err){
                booking_id_tmp = booking_ins_output.insertId;
                for(var j=0; j<pcount; j++){
                    var insticket = "INSERT INTO ticket(booking_id, flight_id, seat_no) values("+booking_id_tmp+","+flight_id_tmp+","+seat_tmp.pop()+");";
                    mysqlConnection.query(insticket, (err, ticket_ins_output, fields) => {
                        if(!err){
                            ticket_id_tmp = ticket_ins_output.insertId;
                            var inspassenger = (pcount==1)?"INSERT INTO passenger(ticket_id, name, gender, age) values(" + ticket_id_tmp + ",'" + pname + "','"  + pgender + "'," + page + ");"
                                                            :"INSERT INTO passenger(ticket_id, name, gender, age) values(" + ticket_id_tmp + ",'" + pname.pop() + "','"  + pgender.pop() + "'," + page.pop() + ");"
                            mysqlConnection.query(inspassenger, (err, ticket_ins_output, fields) => {
                                if(!err){
                                    console.log("success");
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
        res.redirect("search");
        
    }
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Airline Server started on port 3000");
});

function time_sec(sec)                                //seconds->HH:MM:SS
      {
          var hrs = Math.floor(sec / 3600);
          var min = Math.floor((sec - (hrs * 3600)) / 60);
          var seconds = sec - (hrs * 3600) - (min * 60);
          seconds = Math.round(seconds * 100) / 100
          
          var result = (hrs < 10 ? "0" + hrs : hrs);
          result += ":" + (min < 10 ? "0" + min : min);
          result += ":" + (seconds < 10 ? "0" + seconds : seconds);
          return result;
        }

      function time_diff(t1,t2)                              //HH:MM:SS->seconds
      {
        var a = t1.split(':'); // split it at the colons
        var b=  t2.split(':');
        var s1 = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]); 
        var s2 = (+b[0]) * 60 * 60 + (+b[1]) * 60 + (+b[2]); 
        var SECONDS=s1-s2;
        var time=time_sec(SECONDS);
        return time;
      }