var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var cookieParser = require('cookie-parser');
var app = express();
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"));
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
    // server: 'WPU5CD929158PLW\\MSSQLSERVER01',
    driver: 'msnodesqlv8',
    database: 'Courier_Management'
};

app.get('/home', function (req, res) {
    res.render('login.ejs')
});

app.get('/home1/:id', function (req, res) {
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();
        var cmd = "Select * from [User] where UserId=" + "\'" + req.params.id + "\';";
        request.query(cmd, function (err, recordset) {

            if (err) console.log(err)
            var result = recordset.recordset.length == 1;
            if (result) {
                loggedInUser = recordset.recordset[0].UserId;
                res.render('userHome', {userData: recordset.recordset})
            } else {
                res.render('message', {data: {'heading': 'Error', 'body': 'Cannot go back to home'},userId:recordset.recordset[0].UserId})
            }


            // send records as a response
        });
    });
});

app.post('/home1', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();
        request.query("Select * from [User] where UserId=" + "\'" + username + "\';", function (err, recordset) {

            if (err) console.log(err)
            var result = recordset.recordset.length == 1;
            if (result) {
                loggedInUser = recordset.recordset[0].UserId;
                res.render('userHome', {userData: recordset.recordset})
            } else {
                res.render('message', {data: {'heading': 'Error', 'body': 'Invalid Credentials'}})
            }


            // send records as a response
        });
    });

});

app.get('/register', function (req, res) {
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
        if (req.body.role === 'Customer') {
            userId = 'CUST_' + userId;
        } else {
            userId = 'USER_' + userId;
        }
        var cmd = "Insert into [User] values (";
        cmd = cmd + "\'" + userId + "\',";
        cmd = cmd + "\'" + req.body.firstName + "\',";
        cmd = cmd + "\'" + req.body.lastName + "\'," +
            +req.body.contactNumber + "," +
            +req.body.aContactNumber + ",";
        cmd += "\'" + req.body.address1 + "\',";
        cmd += "\'" + req.body.address2 + "\',";
        cmd += "\'" + req.body.address3 + "\',";
        cmd += "\'" + req.body.landmark + "\',";
        cmd += "\'" + req.body.cityName + "\',";
        cmd += "\'" + req.body.district + "\',";
        cmd += "\'" + req.body.stateName + "\',";
        cmd += req.body.zipcode + ",";
        cmd += "\'" + req.body.role + "\',";
        cmd += "\'" + req.body.password + "\',";
        cmd += "\'" + req.body.email + "\')";
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err)
            }
            // var result = recordset.recordset.length == 1;
            if (recordset.rowsAffected.length === 1) {
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

app.post('/create', function (req, res) {
    var obj = {'userId': req.body.userId};
    res.render('newOrder', {ordersData: [], obj})
})

app.get('/create', function (req, res) {
    res.render('newOrder', {ordersData: []})
})

app.post('/createOrder', function (req, res) {
    var details = ''
    sql.connect(config, async function (err) {
        if (err) {
            console.log(err);
            displayError(res, err);
        }
        var request = new sql.Request();
        details = req.body;
        details.orderId = Math.floor(Math.random() * 10000);
        details.isFragile = (details.isFragile == 'on');
        details.userId = req.body.userId;
        //
        var date = new Date().toISOString().replace(/T.*/, '').split('-').join('-')
        details.date = date
        var cmd = "select * from [RateList] where ItemCategory=" + "\'" + details.itemcategory + "\'";
        request.query(cmd, function (err, recordset) {

            if (err) {
                console.log(err)
                displayError(res, err)
            }
            //need to inform of success
            var rate = recordset.recordset[0]['Rate/Kg/100km']
            var fragility = recordset.recordset[0].FragilityCharges

            var cost = parseInt(details.weight) * parseInt(rate);
            var total = cost * 0.18 + cost;
            if (details.isFragile) {
                total += parseFloat(fragility);
            }
            details.total = total
            res.render('payment', {details,userId:req.body.userId})
        });
    });

})

app.post('/orderComplete', function (req, res) {
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var isActive = 1
        var details = JSON.parse(req.body.details)
        var request = new sql.Request();
        var cmd = "insert into [Order] values ("
            + details.orderId + ","
            + "\'" + details.date + "\',"
            + "\'" + details.userId + "\',"
            + details.weight + ","
            + details.length + ","
            + details.breadth + ","
            + details.height + ","
            + "\'" + details.receiver + "\',"
            + "\'" + details.isFragile + "\',"
            + "\'" + isActive + "\'"
            + ")";

        completeOrderWithPayment(cmd,details,request,res,'Order placed successfully',req.body.userId)


    });

});

app.post('/view', function (req, res) {
    console.log('View orders called')
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();
        var cmd = "Select O.OrderId,O.OrderDate,O.SenderId,O.RecipientId,ID.ItemName,ID.ItemCategory,O.[WeightofItem (in Kg)],O.[LengthofItem (ft)],O.[BreadthofItem (ft)],O.[HeightofItem (ft)],O.isActive,SD.IsFragile from [Order] as O inner join [ShipmentDetails] as SD on O.OrderId = SD.OrderId inner join [ItemDetails] as ID on O.OrderId=ID.OrderId and SenderId=" + "\'" + req.body.userId + "\'"
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err)
            }
            var result = '';
            console.log(recordset);
            if (recordset) {
                // send records as a response
                res.render('orders', {ordersData: recordset.recordset, userId: req.body.userId})
            }
        });
    });
});

app.get('/order/modify/:orderId/:userId', function (req,res){
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();
        var cmd = "Select O.OrderId,O.OrderDate,O.SenderId,O.RecipientId,ID.ItemName,ID.ItemCategory,O.[WeightofItem (in Kg)],O.[LengthofItem (ft)],O.[BreadthofItem (ft)],O.[HeightofItem (ft)],O.isActive,SD.IsFragile,SD.DestinationCity,SD.SourceCity,SD.[Subtotal Amount] from [Order] as O inner join [ShipmentDetails] as SD on O.OrderId = SD.OrderId inner join [ItemDetails] as ID on O.OrderId=ID.OrderId and O.OrderId=" + "\'" + req.params.orderId + "\'"
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err)
            }
            if (recordset) {
                res.render('newOrder', {ordersData: recordset.recordset, obj:{userId: req.params.userId, orderId:req.params.orderId}})
            }
        });
    });
});

app.post('/modifyOrder', function (req,res){
    console.log(req.body.isFragile)
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();
        var cmd = "Update [Order] set IsFragile=";
        cmd+= "\'"+(req.body.isFragile=='on')+"\',";
        cmd+= "RecipientId=\'"+req.body.receiver+"\' where OrderId=\'"+req.body.orderId+"\';";
        console.log(cmd)
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err)
            }
            if (recordset) {
                var date = new Date().toISOString().replace(/T.*/, '').split('-').join('-');
                req.body.orderDate = date;
                var cmd = 'Update [ShipmentDetails] SET ';
                cmd = cmd +"SourceCity=\'"+ req.body.sourceCity + "\',[DestinationCity]=\'"+ req.body.destCity + "\'";
                cmd = cmd + ",[isFragile]=\'" + (req.body.isFragile=='on') + "\'";
                cmd = cmd + " where OrderId="+"\'"+req.body.orderId+"\';";
                console.log(cmd)
                request.query(cmd, function (err, recordset){
                    if (err) {
                        console.log(err)
                        displayError(res, err)
                    }
                    if(recordset) {
                        res.render('message',{data:{heading:'Order modified successfully',body:'Order '+req.body.orderId+' has been modified'},userId:req.body.userId})
                    }
                });
            }
        });
    });
});

app.post('/viewRates', function(req,res){
    sql.connect(config, async function (err) {
        if (err) {
            console.log(err);
            displayError(res, err)
        }
        var request = new sql.Request();
        var cmd = 'Select * from [RateList]'
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err);
            }
            var result = '';
            // send records as a response
            res.render('rates', {rates: recordset.recordset,userId:req.body.userId})

        });
    });
});

app.post('/addRate', function (req,res){
    res.render('newRates',{rates:[],userId:req.body.userId});
});

app.post('/rate/new', function (req, res){
    sql.connect(config, async function (err) {
        if (err) {
            console.log(err);
            displayError(res, err)
        }
        var request = new sql.Request();
        var cmd = 'Insert into [RateList] values (';
        cmd = cmd + req.body.sgstPercent + "," + req.body.cgstPercent + "," + req.body.rateKgKm;
        cmd = cmd + ",\'"+req.body.itemCategory+"\',";
        cmd = cmd +req.body.fragilityCharges + ");";
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err);
            }
            var result = '';
            // send records as a response
            var data = {'heading':"Rate added successfully",'body':'New Rate added '+req.body.itemCategory};
            res.render('message', {data,userId:req.body.userId});

        });
    });
});

app.get('/rate/modify/:itemCat/:userId', function (req, res){
    sql.connect(config, async function (err) {
        if (err) {
            console.log(err);
            displayError(res, err)
        }
        var request = new sql.Request();
        var cmd = "Select * from [RateList] where ItemCategory="+"\'"+req.params.itemCat+"\';"
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err);
            }
            var result = '';
            // send records as a response
            res.render('newRates', {rates: recordset.recordset,userId:req.params.userId})

        });
    });
});

app.get('/rate/delete/:itemCat/:userId', function (req, res){
    sql.connect(config, async function (err) {
        if (err) {
            console.log(err);
            displayError(res, err)
        }
        var request = new sql.Request();
        var cmd = "Delete from [RateList] where ItemCategory="+"\'"+req.params.itemCat+"\';"
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err);
            }
            var result = '';
            // send records as a response
            res.render('message', {data: {'heading': "Rate deleted successfully", 'body':'Rate '+req.params.itemCat+' has been deleted'},userId:req.params.userId})

        });
    });
});

app.post('/rate/modify', function (req, res) {
    sql.connect(config, async function (err) {
        if (err) {
            console.log(err);
            displayError(res, err)
        }
        var request = new sql.Request();
        var cmd = 'Update [RateList] SET ';
        cmd = cmd +"[SGST Percent]="+ req.body.sgstPercent + ",[CGST Percent]="+ + req.body.cgstPercent + ",[Rate/Kg/100km]=" + req.body.rateKgKm;
        cmd = cmd + " ,FragilityCharges=" + req.body.fragilityCharges + " where ItemCategory="+"\'"+req.body.itemCategory+"\';";
        console.log("Modify rate")
        console.log(cmd)
        request.query(cmd, function (err, recordset) {
            if (err) {
                console.log(err)
                displayError(res, err);
            }
            var result = '';
            console.log(recordset);
            // send records as a response
            var data = {'heading':"Rate updated successfully",'body':'Rate updated -> '+req.body.itemCategory};
            res.render('message', {data,userId:req.body.userId});

        });
    });
});

app.get('/order/cancel/:orderId/:userId', function (req, res) {
    sql.connect(config, async function (err) {

        if (err) {
            console.log(err);
            displayError(res, err)
        }

        var request = new sql.Request();
        var cmd = "Update [Order] set isActive="+"\'"+false+"\'";

        request.query(cmd, function (err, recordset) {

            if (err) {
                console.log(err)
                displayError(res, err)
            }
            var result = '';
            console.log(recordset.recordset);

            // send records as a response
            res.render('message', {data:{'heading':'Order cancelled successfully','body':'Package will not be delivered, refund will not be provided'},userId:req.params.userId})

        });
    });
});

function displayError(res, error) {
    res.render('message', {'data': {'heading': 'Error Occured', 'body': error}});
}

function completeOrderWithPayment(cmd, details, request, res, heading, userId) {
    console.log(details);
    //paymentid
    details.paymentId = Math.random().toString(36).slice(2);
    request.query(cmd, function (err, recordset) {
        if (err) {
            console.log(err)
            displayError(res, err);
        }
        var result = recordset
        // send records as a response
        var dateObj = new Date();
        var sourceDate = dateObj.toISOString().slice(0, 19).replace('T', ' ');
        var pad = function(num) { return ('00'+num).slice(-2) };
        var destinationDate = dateObj.getUTCFullYear() + '-' +
            pad(dateObj.getUTCMonth() + 2)  + '-' +
            pad(dateObj.getUTCDate())       + ' ' +
            pad(dateObj.getUTCHours())      + ':' +
            pad(dateObj.getUTCMinutes())    + ':' +
            pad(dateObj.getUTCSeconds());
        var currentDate = dateObj.getUTCFullYear() + '-' +
            pad(dateObj.getUTCMonth())  + '-' +
            pad(dateObj.getUTCDate())       + ' ' +
            pad(dateObj.getUTCHours() + 2)      + ':' +
            pad(dateObj.getUTCMinutes())    + ':' +
            pad(dateObj.getUTCSeconds());
        console.log("OrderId ",details.orderId);
        if (result.rowsAffected.length === 1) {
            // var sp_cmd = "EXEC dbo.UDSP_Insert_ShipmentDetails " + details.orderId + "," + details.sourceCity + "," + details.destCity + ",\'"+sourceTime+"\'," + details.sourceCity + ",'Int_City'," + details.weight + "," + details.total + "," + details.isFragile + ",\'"+destinationDeliveryTime+"\',123,456,\'"+currentTime+"\',0,0,0,123," + details.sourceCity + ",'State';"
            var sp_cmd = "EXEC dbo.UDSP_Insert_ShipmentDetails \'"+details.orderId+"\',\'"+details.sourceCity+"\',\'"+details.destCity+"\',\'"+sourceDate+"\',"+details.sourceCity+",'Int_City',"+details.weight+","+details.total+","+details.isFragile+",\'"+destinationDate+"\',123,456,\'"+currentDate+"\',0,0,0,123,"+details.sourceCity+",'State';";
            console.log(sp_cmd)
            request.query(sp_cmd, function (err, recordset) {

                if (err) {
                    console.log(err)
                    displayError(res, err);
                }
                console.log(recordset)
                if (recordset.recordset[0].retCode == 1) {
                    var id_cmd = "EXEC dbo.UDSP_Insert_ItemDetails " + details.orderId + "," + details.itemName + ",'',10," + details.itemcategory + ";"
                    console.log(id_cmd)
                    request.query(id_cmd, function (err, recordset) {
                        if (err) {
                            console.log(err)
                            displayError(res, err);
                        }
                        if (recordset.recordset[0].retCode == 1) {
                            var pmt_cmd = "EXEC dbo.UDSP_Insert_PaymentDetails " + details.orderId + ", 'Credit Card','SBI','2022-10-08 05:25:00','Success',"+details.paymentId+";"
                            console.log(pmt_cmd)
                            request.query(pmt_cmd, function (err, recordset) {
                                if (err) {
                                    console.log(err)
                                    displayError(res, err);
                                }
                                res.render('message', {
                                    'data': {
                                        'heading': heading,
                                        'body': "Order Id : " + details.orderId + " | PaymentId : " + details.paymentId + " | Should reach destination by "+destinationDate
                                    },
                                    userId: userId
                                });
                            });
                        }
                    });
                }

            });
        }

    });
}

var server = app.listen(5000, function () {
    console.log('Server is running..');
});