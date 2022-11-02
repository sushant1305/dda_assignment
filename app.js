var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.use( express.static( "public" ) );
app.set('view engine', 'ejs');
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: false}));
var sql = require('mssql/msnodesqlv8');

var loggedInUser = ''

var config = {
    user: 'admin123',
    password: 'admin123',
    server: 'LAPTOP-HIVECADV',
    driver: 'msnodesqlv8',
    database: 'Courier_Management'
};

app.get('/home', function (req,res){
    loggedInUser = ''
    res.render('login.ejs')
});

app.post('/home1', function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res,err)
        }

        var request = new sql.Request();
        console.log(username + " "+password)
        request.query("Select * from [User] where UserId="+"\'"+username+"\';", function (err, recordset) {

            if (err) console.log(err)
            var result = recordset.recordset.length == 1;
            console.log(recordset)
            if (result) {
                loggedInUser = recordset.recordset[0].UserId;
                console.log(loggedInUser);
                console.log(recordset.recordset)
                res.render('userHome', {userData: recordset.recordset})
            } else {
                res.render('error',{data: {'heading':'Error','body': 'Invalid Credentials'}})
            }


            // send records as a response
        });
    });

});

app.get('/register', function (req,res){
    res.render('user')
});

app.post('/createUser', function (req, res) {
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err);
        }

        var request = new sql.Request();
        var userId = Math.floor(Math.random() * 1000);
        if(req.body.role === 'Customer'){
            userId = 'CUST_' + userId;
        } else {
            userId = 'USER_' + userId;
        }
        var cmd = "Insert into [User] values (";
           cmd = cmd + "\'" + userId + "\',";
            cmd = cmd + "\'" +req.body.firstName + "\',";
            cmd = cmd + "\'" +req.body.lastName + "\'," +
            + req.body.contactNumber + "," +
            + req.body.aContactNumber + ",";
            cmd+= "\'" +req.body.address1 + "\',";
            cmd+= "\'" +req.body.address2 + "\',";
            cmd+= "\'" +req.body.address3 + "\',";
            cmd+= "\'" +req.body.landmark + "\',";
            cmd+= "\'" +req.body.cityName + "\',";
            cmd+= "\'" +req.body.district + "\',";
            cmd+= "\'" +req.body.stateName + "\',";
            cmd+= req.body.zipcode + ",";
            cmd+= "\'" +req.body.role + "\',";
            cmd+= "\'" +req.body.password + "\',";
            cmd+= "\'" +req.body.email + "\')";
        console.log(cmd)
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err)
            }
            // var result = recordset.recordset.length == 1;
            console.log(recordset)
           if (recordset.rowsAffected.length === 1){
               res.render('message', {
                   'data': {
                       'heading': 'Success',
                       'body': 'Successfully registered user ' + req.body.firstName + ' with user'
                   }
               })
           }
        });
    });
});

app.post('/create', function(req, res){
    res.render('newOrder',{ordersData: []})
})

app.get('/create', function(req, res){
    res.render('newOrder',{ordersData: []})
})

app.post('/createOrder', function(req,res){
    var details=''
    sql.connect(config, async function (err) {
        if (err) {
            console.log(err);
            displayError(res, err);
        }
        var request = new sql.Request();
        details = req.body;
        details.orderId = Math.floor(Math.random() * 10000);
        details.isFragile = (details.isFragile == 'on');
        console.log("Details")
        console.log(details)
        var date = new Date().toISOString().replace(/T.*/,'').split('-').join('-')
        details.date = date
        var cmd = "select * from [RateList] where ItemCategory="+"\'"+details.itemcategory+"\'";
        request.query(cmd, function (err, recordset) {

            if (err) {
                console.log(err)
                displayError(res, err)
            }
            //need to inform of success
            var rate = recordset.recordset[0]['Rate/Kg/100km']
            var fragility = recordset.recordset[0].FragilityCharges
            var cost = parseInt(details.weight)*parseInt(rate);
            var total = cost * 0.18 + cost;
            if (details.isFragile){
                total += parseFloat(fragility);
            }
            details.total = total
            res.render('payment',{details})
        });
    });

})

app.post('/orderComplete', function(req,res){
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }
        var details = JSON.parse(req.body.details)
        console.log("orderComplete")
        console.log(details)
        var request = new sql.Request();

        var cmd = "insert into [Order] values ("
        + details.orderId +","
        + "\'"+details.date+"\',"
        + "\'"+loggedInUser+"\',"
        + details.weight+","
        + details.length+","
        + details.breadth+","
        + details.height+","
        + "\'"+details.receiver+"\',"
        + "\'"+details.isFragile+"\'"
        + ")";
        console.log(cmd)
       //paymentid
        details.paymentId = Math.random().toString(36).slice(2);
        console.log("PaymentID")
        console.log(details.paymentId)
         request.query(cmd, function (err, recordset) {

             if (err) {
                 console.log(err)
                 displayError(res,err);
             }
                var result = recordset
                console.log(result);
             // send records as a response
             if(result.rowsAffected.length === 1) {
                 res.render('message', {
                     'data': {
                         'heading': 'Order placed successfully',
                         'body': "Order Id : " + details.orderId + " | PaymentId : " + details.paymentId
                     }
                 })
             }
         });
    });

});

app.post('/view', function(req,res){
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();
        // Select O.OrderId,O.OrderDate,O.SenderId,O.RecipientId,ID.ItemName,ID.ItemCategory,SD.[Total Weight],O.[LengthofItem (ft)],O.[BreadthofItem (ft)],O.[HeightofItem (ft)],SD.IsFragile from [Order] as O inner join [ShipmentDetails] as SD on O.OrderId = SD.OrderId inner join [ItemDetails] as ID on O.OrderId=ID.OrderId
        //request.query("Select * from [Order] as O inner join [ShipmentDetails] as SD on O.OrderId = SD.OrderId inner join [ItemDetails] as ID on O.OrderId=ID.OrderId and SenderId="+"\'"+loggedInUser+"\'", function (err, recordset) {
        request.query("Select O.OrderId,O.OrderDate,O.SenderId,O.RecipientId,ID.ItemName,ID.ItemCategory,O.[WeightofItem (in Kg)],O.[LengthofItem (ft)],O.[BreadthofItem (ft)],O.[HeightofItem (ft)],SD.IsFragile from [Order] as O inner join [ShipmentDetails] as SD on O.OrderId = SD.OrderId inner join [ItemDetails] as ID on O.OrderId=ID.OrderId and SenderId="+"\'"+loggedInUser+"\'", function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err)
            }
            var result = '';
            console.log(recordset.recordset);
            if(recordset.recordset.rowsAffected.length === 1) {
                // send records as a response
                res.render('orders', {ordersData: recordset.recordset})
            }
        });
    });
});

app.get('/order/modify/:orderId', function (req,res){
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();

        request.query("Select * from [Order] as O inner join [ShipmentDetails] as SD on O.OrderId = SD.OrderId inner join [ItemDetails] as ID on O.OrderId=ID.OrderId and O.OrderId="+"\'"+req.params.orderId+"\'", function (err, recordset) {

            if (err) {
                console.log(err)
                displayError(res, err);
            }
            var result = '';
            console.log(recordset.recordset);

            // send records as a response
            res.render('newOrder', {ordersData: recordset.recordset})

        });
    });
});

app.get('/order/cancel/:orderId', function (req,res){
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();

        request.query("Select * from [Order] as O inner join [ShipmentDetails] as SD on O.OrderId = SD.OrderId inner join [ItemDetails] as ID on O.OrderId=ID.OrderId and O.SenderId="+"\'"+loggedInUser+"\'", function (err, recordset) {

            if (err) {
                console.log(err)
                displayError(res, err)
            }
            var result = '';
            console.log(recordset.recordset);

            // send records as a response
            res.render('orders', {ordersData: recordset.recordset})

        });
    });
});

function displayError(res, error) {
    res.render('message',{'data':{'heading':'Error Occured','body':error}});
}



var server = app.listen(5000, function () {
    console.log('Server is running..');
});