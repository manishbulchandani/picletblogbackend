const express = require('express');
const app = express();
const { MongoClient } = require("mongodb");
const cron = require('node-cron');
const moment = require('moment-timezone');
require('dotenv').config();

const port = process.env.PORT || 3001;

const cors = require('cors');
app.use(cors());
app.use(express.json());

const url = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.dsmnjou.mongodb.net/clicks`;
const client = new MongoClient(url);


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "https://piclettest.netlify.app"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
  

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to Atlas");
    } catch (err) {
        console.log(err.stack);
    }
}
run().catch(console.dir);

const db = client.db("clicks");
const collection = db.collection("clicks");

app.post('/trackPostClicks', async (req, res) => {
    const { slug } = req.body;

    const existingDocument = await collection.findOne({ slug });

    if (existingDocument) {
        await collection.updateOne({ slug }, { $inc: { clickCount: 1 } });
    } else {
        await collection.insertOne({ slug, clickCount: 1 });
    }

    res.status(200).json({ message: 'Click tracked successfully' });
});

app.get('/getTodaysPick', async (req, res) => {
    try {
        const existingDocument = await collection.findOne({}, { sort: { clickCount: 1 } });

        if (existingDocument) {
            res.status(200).json({ maxClicksPostId: existingDocument });
        } else {
            res.status(404).json({ message: "No popular posts found" });
        }
    } catch (err) {
        console.error("Error fetching most popular post:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

moment.tz.setDefault('Asia/Kolkata');

cron.schedule('59 23 * * *', async () => {
    try {
        await collection.updateMany({}, { $set: { clickCount: 0 } });
        console.log("Click counts reset successfully.");
    } catch (err) {
        console.error("Error resetting click counts:", err);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
