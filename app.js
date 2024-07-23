//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const uuid = require("uuid");
const path = require('path');
const shortid = require('shortid');
const cors = require('cors');
const multer = require('multer');
const { Console, log } = require('console');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now()
    cb(null, file.originalname)
  }
});
const upload = multer({ storage: storage });

const app = express();

app.set('view engine', 'ejs');

app.use(cors())

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());

app.use(express.static("public"));
app.use('/uploads', express.static("uploads"));

app.use(cookieParser());

app.use(session({
    secret: process.env.RANDOM,
    saveUninitialized:false,
    resave: false
}));

mongoose.set('strictQuery', false);
//mongoose.connect("mongodb://localhost:27017/relianceDB", {useNewUrlParser: true});
mongoose.connect("mongodb+srv://alex-dan:Admin-12345@cluster0.wirm8.mongodb.net/", {useNewUrlParser: true});

const d = new Date();
let year = d.getFullYear();
let month = d.getMonth() + 1;
let date = d.getDate();
let hour = d.getHours() ;
let minutes = d.getMinutes();


const earningSchema = new mongoose.Schema({
  currentShare: Number,
  totalShare: Number,
  availableBalance: Number
});
const kycSchema = new mongoose.Schema({
  number: Number,
  aadhar: String,
  bankDetails: {
    name: String,
    accountNumber: String,
    bankName: String,
    ifsc: String
  }
});
const historySchema = new mongoose.Schema({
  paymentType: String,
  mode: String,
  modeColor: String,
  amount: String,
  amountColor: String
});
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  userID: {
    type: String,
    required: true
  },

  sponsorID: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  earnings: earningSchema,

  kycDetails: kycSchema,

  history: [historySchema],

  time: {
    type: String,
    required: true
  }



});
const adminSchema = new mongoose.Schema({
  email: String,
  qrName: String,
  upiId: String,
});  


userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

const Admin = new mongoose.model("Admin", adminSchema);

//ROUTES
app.get("/", function(req, res){
  res.render("login")
});

app.get("/register", function(req, res){
  if(req.session.sponsorID){
    res.render("register3", {sponID:req.session.sponsorID })
  }else {
    res.render("register");
  }
});

app.get("/dashboard", function(req, res){
  if(!req.session.user){
    res.redirect("/")
  }else{
    User.findOne({username: req.session.user.username}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        const name = foundUser.username;
        const currentShare = foundUser.earnings.currentShare;
        const totalShare = foundUser.earnings.totalShare;
        const availableBalance = foundUser.earnings.availableBalance;


        res.render("dashboard", {name, currentShare, totalShare, availableBalance});
      }
    });
  }

});

app.get("/profile", function(req, res){
  if(!req.session.user){
    res.redirect("/");
  }else{
    User.findOne({username: req.session.user.username}, function(err, foundUser){
     if(err){
       console.log(err);
     }else{
       User.find({sponsorID: foundUser.userID}, function(error, users){
         if(error){
           console.log(error);
         }else{
           if(!foundUser.kycDetails){
             if(users.length === 0){
               //No bank Details and users
               res.render("profile", {
                 name: foundUser.name,
                 username: foundUser.username,
                 email: foundUser.email,
                 sponsorID: foundUser.sponsorID,
                 userID: foundUser.userID

               });
             }else{

               // With directs and No bank Details
               res.render("profile1", {
                 name: foundUser.name,
                 username: foundUser.username,
                 email: foundUser.email,
                 sponsorID: foundUser.sponsorID,
                 users: users,
                 userID: foundUser.userID

               });
             }
           }else {
             if(users.length === 0){
               //With Bank details and No directs
               res.render("profile2", {
                 name: foundUser.name,
                 username: foundUser.username,
                 email: foundUser.email,
                 sponsorID: foundUser.sponsorID,
                 number: foundUser.kycDetails.number,
                 accountHoldersName: foundUser.kycDetails.bankDetails.name,
                 bankName: foundUser.kycDetails.bankDetails.bankName,
                 aadhar: foundUser.kycDetails.aadhar,
                 ifsc: foundUser.kycDetails.bankDetails.ifsc,
                 accountNumber: foundUser.kycDetails.bankDetails.accountNumber,
                 userID: foundUser.userID
                 });
             }else{
               //With Directs and Bank details
               res.render("profile3", {
                 name: foundUser.name,
                 username: foundUser.username,
                 email: foundUser.email,
                 sponsorID: foundUser.sponsorID,
                 number: foundUser.kycDetails.number,
                 accountHoldersName: foundUser.kycDetails.bankDetails.name,
                 bankName: foundUser.kycDetails.bankDetails.bankName,
                 aadhar: foundUser.kycDetails.aadhar,
                 ifsc: foundUser.kycDetails.bankDetails.ifsc,
                 accountNumber: foundUser.kycDetails.bankDetails.accountNumber,
                 users: users,
                 userID: foundUser.userID
                 });
             }
           }
         }
       });
     }
    });


  }
});

app.get("/shares", function(req, res){
  if(!req.session.user){
    res.redirect("/");
  }else{
    User.findOne({username: req.session.user.username}, function(err, foundUser){
      res.render("shares", {
        name: foundUser.username,
        email: foundUser.email,
        sponsorID: foundUser.sponsorID

      });
    });
  }
});

app.get("/withdrawal", function(req, res){
  if(!req.session.user){
    res.redirect("/");
  }else{

      User.findOne({username: req.session.user.username}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          res.render("withdrawal", {
            name: foundUser.username,
            email: foundUser.email,
            sponsorID: foundUser.sponsorID,
            history: foundUser.history,
            availableBalance: foundUser.earnings.availableBalance

          });
        }
        });
        }
});

app.get("/payment", function(req, res){
  if(!req.session.user){
    res.redirect("/");
  }else{

      User.findOne({username: req.session.user.username}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          Admin.findOne({}, function(err, foundAdmin){
            if(err){
              console.log(err)
            }else{
              res.render("payment", {
                name: foundUser.username,
                email: foundUser.email,
                qrPath: foundAdmin.qrName,
                upi: foundAdmin.upiId
              });
            }
          })
        }
        });
        }
});

app.get("/adminLogin", function(req, res){
  res.render("adminLogin");
});

app.get("/admin", function(req, res){
  if(!req.session.admin){
    res.redirect("/adminLogin");
  }else{
    res.render("admin");
  }
});

app.get("/register/:sponsorID", function(req, res){

  req.session.sponsorID = req.params.sponsorID;
  res.redirect("/register")
});

app.get("/register2", function(req, res){
  if(req.session.sponsorID){
    res.render("register3", {sponID:req.session.sponsorID })
  }else {
    res.redirect("/register");
  }
});

app.get("/log-out", function(req, res){
  req.session.destroy();
  res.redirect("/");
});





//POSTS
app.post("/register", function(req, res){
  let userID = "RNS" + String(Math.floor(Math.random()*9999));
  const newUser = new User ({
    name: req.body.name,
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    sponsorID: req.body.sponsorID,
    userID: userID,
    earnings: {
      currentShare: 0,
      totalShare: 0,
      availableBalance: 0
    },
    time: date + "/" + month + "/" + year

  });

  // Unique User Id
  User.findOne({userID: userID}, function(err, foundUser){
    if(err){
      console.log(err);
    } else{
      if(foundUser){
        userID = "RNS" + String(Math.floor(Math.random()*9999));
      }
    }
  });
  User.findOne({username: req.body.username}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        //User already exist
        const alertType = "warning";
        const alert = "Username already exist"
        const icon = "bi-exclamation-triangle"

        res.render("register2", {alertType, alert, icon});
      }else {
        //Save user
        const alertType = "success";
        const alert = "Successfully created your Account"
        const icon = "bi-check-circle"

        newUser.save();

        res.render("login2", {alertType, alert, icon});
      }
    }
  });
});

app.post("/login", function(req, res){
  User.findOne({username: req.body.username}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(!foundUser){
        const alertType = "warning";
        const alert = "No User found!"
        const icon = "bi-exclamation-triangle"

        res.render("login2", {alertType, alert, icon});
      }else {
        if(req.body.password === foundUser.password){
          req.session.user = req.body;
          res.redirect("/dashboard");
        }else{
          const alertType = "warning";
          const alert = "Password don't match!"
          const icon = "bi-exclamation-triangle"

          res.render("login2", {alertType, alert, icon});
        }
      }
    }
  })
});

app.post("/kycDetails", function(req, res){
  User.updateOne({username: req.session.user.username}, {$set:{kycDetails:{number: req.body.number, aadhar: req.body.aadhar, bankDetails:{name: req.body.holdersName, accountNumber: req.body.accountNumber, bankName: req.body.bankName, ifsc: req.body.ifsc}}}}, function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect("profile");
});

app.post("/adminLogin", function(req, res){
  if(process.env.ADMIN === req.body.username){
    if(process.env.PASSWORD === req.body.password){
      req.session.admin = req.body;

      res.render("admin")
    }else{
      //Not an User
    }
  }else{
    //Not an User
  }
});

app.post("/shareCredit", function(req, res){

  User.findOne({username: req.body.username}, function(err, foundUser){
    let newValue = foundUser.earnings.totalShare + Number(req.body.shares);
    
    User.updateOne({username: req.body.username}, {$set:{
      earnings:{
        currentShare: req.body.shares, 
        totalShare: newValue, 
        availableBalance: foundUser.earnings.availableBalance 
      }}}, function(error){
      if(error){
        console.log(error);
      }
    });
  });
  res.redirect("/admin");
});

app.post("/amountCredit", function(req, res){
  User.findOne({username: req.body.username}, function(err, foundUser){
    let newValue = foundUser.earnings.availableBalance + Number(req.body.amount);

    User.updateOne({username: req.body.username}, {$set:{
      earnings:{
        currentShare: foundUser.earnings.currentShare, 
        totalShare: foundUser.earnings.totalShare, 
        availableBalance: newValue 
      }}}, function(error){
      if(error){
        console.log(error);
      }
    });
  });
  res.redirect("/admin");
});

app.post("/transactions", function(req, res){
  User.findOne({username: req.body.username}, function(err, foundUser){
    let history = foundUser.history;
    const newHistory = {
      paymentType: req.body.paymentType,
      mode: req.body.sentOrReceived,
      modeColor: req.body.messageColor,
      amount: req.body.amount,
      amountColor: req.body.amountColor
    }
    history.push(newHistory);

    User.updateOne({username: req.body.username}, {$set:{history:history}}, function(error){
      if(error){
        console.log(error);
      }
    });
  });
  res.redirect("/admin");
});

app.post("/userDetails", function(req, res){
  User.findOne({username: req.body.username}, function(err, foundUser){
    if(foundUser){
      req.session.user = req.body;
      res.redirect("/dashboard");
    }else{
      res.redirect("/admin");
    }

  });
});

app.post("/withdrawal", function(req, res){

    User.findOne({username: req.session.user.username}, function(err, foundUser){
      const newValue =  foundUser.earnings.availableBalance - req.body.amount;
      if(req.body.amount<999){
        //Minimum Withdrawal
        const alertType = "warning";
        const alert = "Amount is less than Minimum Withdrawal"
        const icon = "bi-exclamation-triangle"

        res.render("withdrawal2", {alertType, alert, icon,
        name: foundUser.username,
        email: foundUser.email,
        sponsorID: foundUser.sponsorID,
        history: foundUser.history,
        availableBalance: foundUser.earnings.availableBalance
      });
      }  else{
        if(foundUser.earnings.availableBalance < req.body.amount){
          //lOW BALANCE
          const alertType = "warning";
          const alert = "Low balance!!"
          const icon = "bi-exclamation-triangle"

          res.render("withdrawal2", {alertType, alert, icon,
            name: foundUser.username,
            email: foundUser.email,
            sponsorID: foundUser.sponsorID,
            history: foundUser.history,
            availableBalance: foundUser.earnings.availableBalance
          });
        }else{
          if(!foundUser.kycDetails){
            //No kyc
            const alertType = "warning";
            const alert = "Complete your KYC to proceed"
            const icon = "bi-exclamation-triangle"

            res.render("withdrawal2", {alertType, alert, icon,
              name: foundUser.username,
              email: foundUser.email,
              sponsorID: foundUser.sponsorID,
              history: foundUser.history,
              availableBalance: foundUser.earnings.availableBalance
            });
          }else{
            User.updateOne({username: req.session.user.username}, {$set:{earnings:{currentShare: foundUser.earnings.currentShare, totalShare: foundUser.earnings.totalShare, availableBalance: newValue }}}, function(error){
              if(error){
                console.log(error);
              }else{

              }
            });
            res.redirect("/withdrawal");
          }
        }
      }

    });
});

app.post("/payment", function(req, res){
  User.findOne({username: req.session.user.username}, function(err, foundUser){
    if(err){
      console.log(err)
    }else{
      Admin.findOne({}, function(err, foundAdmin){
        if(err){
          console.log(err)
        }else{
            res.render("payment2", {
              name: foundUser.username,
              email: foundUser.email,
              qrPath: foundAdmin.qrName,
              upi: foundAdmin.upiId
            })
          }
        })
    }
  })
})

app.post("/updateUPIID", function(req, res){
  Admin.findOne({}, function(err, foundAdmin){
    Admin.updateOne({email:foundAdmin.email}, {$set:{
      email: foundAdmin.email,
      qrName: foundAdmin.qrName,
      upiId: req.body.upiId,
    }}, function(err){
      if(err){
        console.log(err)
      }else{
        console.log("Update Successful")
      }
    });
  })
  res.redirect("/admin");
});

app.post("/updateQRNAME", function(req, res){
  Admin.findOne({}, function(err, foundAdmin){
    Admin.updateOne({email:foundAdmin.email}, {$set:{
      email: foundAdmin.email,
      qrName: req.body.qrName,
      upiId: foundAdmin.upiId,
    }}, function(err){
      if(err){
        console.log(err)
      }else{
        console.log("Update Successful")
      }
    });
  })
  res.redirect("/admin");
});



app.post("/upload", upload.single("file"), (req, res) => {
  // Handle the uploaded file here
  res.redirect("/admin");
});






app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000 | http://localhost:3000");
});
