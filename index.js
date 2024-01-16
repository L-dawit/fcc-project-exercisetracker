const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.connect(
  "mongodb+srv://leul:" +
    process.env.PASSD +
    "@cluster15778.roavjkk.mongodb.net/exerUserDB?retryWrites=true&w=majority"
);
// mongoose.connect("mongodb://localhost:27017/exerUserDB");
const exerciseSchema = mongoose.Schema({
  description: String,
  duration: Number,
  date: String,
});
const Exercise = mongoose.model("exercise", exerciseSchema);
const userSchema = mongoose.Schema({
  username: String,
  count: Number,
  log: [exerciseSchema],
});
const User = mongoose.model("user", userSchema);
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app
  .route("/api/users")
  .get((req, res) => {
    User.find({}).then((usersList) => {
      res.send(usersList);
    });
  })
  .post((req, res) => {
    const username = req.body.username;
    console.log(username);
    const newUser = new User({
      username: username,
      count: 0,
    });
    newUser.save().then((savedUser) => {
      res.json({ username: savedUser.username, _id: savedUser._id });
    });
  });

app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;
  const theDate =
    date === ""
      ? new Date()
      : isNaN(Date.parse(date))
      ? new Date()
      : new Date(date);
  User.findById(id)
    .then((foundUser) => {
      if (foundUser === null) {
        res.json({ error: "User does not exist" });
      } else {
        const newExercise = Exercise({
          description: description,
          duration: Number(duration),
          date: theDate.toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        });
        User.findByIdAndUpdate(id, {
          count: foundUser.count + 1,
          $push: { log: { $each: [newExercise], $position: 0 } },
        }).then(() => {
          res.json({
            _id: foundUser._id,
            username: foundUser.username,
            date: newExercise.date,
            duration: newExercise.duration,
            description: newExercise.description,
          });
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.json({ error: "Wrong Id format" });
    });
});
app.get("/api/users/:logId/logs", (req, res) => {
  const logId = req.params.logId;

  User.findById(logId).then((foundUser) => {
    if (foundUser === null) {
      res.json({ error: "User does not exist" });
    } else {
      if (Object.keys(req.query).length === 0) {
        console.log("query empty ");
        res.json(foundUser);
      } else {
        const limit =
          isNaN(Number(req.query.limit)) ||
          Number(req.query.limit) > foundUser.count
            ? foundUser.count
            : Number(req.query.limit);
        const from = isNaN(Date.parse(req.query.from))
          ? new Date(0)
          : new Date(req.query.from);
        let datesList = [];
        foundUser.log.forEach((log) => datesList.push(new Date(log.date)));
        const to = isNaN(Date.parse(req.query.to))
          ? new Date(Math.max(...datesList))
          : new Date(req.query.to);
        let logList = foundUser.log
          .filter(
            (log) =>
              new Date(log.date) >= new Date(from) &&
              new Date(log.date) <= new Date(to)
          )
          .slice(0, limit);
        if (
          !isNaN(Date.parse(req.query.to)) &&
          isNaN(Date.parse(req.query.from))
        ) {
          res.json({
            _id: foundUser._id,
            username: foundUser.username,
            to: to.toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            count: logList.length,
            log: logList,
          });
        } else if (
          isNaN(Date.parse(req.query.to)) &&
          !isNaN(Date.parse(req.query.from))
        ) {
          res.json({
            _id: foundUser._id,
            username: foundUser.username,
            from: from.toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            count: logList.length,
            log: logList,
          });
        }
        if (
          !isNaN(Date.parse(req.query.to)) &&
          !isNaN(Date.parse(req.query.from))
        ) {
          res.json({
            _id: foundUser._id,
            username: foundUser.username,
            to: to.toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            from: from.toLocaleString("en-US", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            count: logList.length,
            log: logList,
          });
        } else {
          res.json({
            _id: foundUser._id,
            username: foundUser.username,
            count: logList.length,
            log: logList,
          });
        }
      }
    }
  });
});
app.get("*", (req, res) => {
  res.status(404).send("Not Found");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
