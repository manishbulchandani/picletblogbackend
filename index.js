const express = require('express');
const app = express();
const { MongoClient } = require("mongodb");
const moment = require('moment-timezone');
require('dotenv').config();

const port = process.env.PORT || 3001;

const cors = require('cors');
app.use(cors());
app.use(express.json());

const url = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.dsmnjou.mongodb.net/clicks`;
const client = new MongoClient(url);


app.use(function (req, res, next) {
    const allowedOrigins = ['https://piclettest.netlify.app', 'https://piclet.in','http://localhost:3000'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
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
const clicksCollection = db.collection("clicks");
const dateCollection=db.collection("lastResetDate")

app.post('/trackPostClicks', async (req, res) => {
    const { slug } = req.body;

    const clicksDocument = await clicksCollection.findOne({ slug });
    if (slug) {
        if (clicksDocument) {
            await clicksCollection.updateOne({ slug }, { $inc: { clickCount: 1 } });
        } else {
            await clicksCollection.insertOne({ slug, clickCount: 1 });
        }
    }

    res.status(200).json({ message: 'Click tracked successfully' });
});

app.get('/getTodaysPick', async (req, res) => {
    try {
        const today = moment().startOf('day');
        const dateDocument = await dateCollection.findOne();
        const lastResetDate = moment(dateDocument.lastResetDate);

        if (today.diff(lastResetDate, 'days') > 7) {
            const prevPopularPost = await clicksCollection.findOne({}, { sort: { clickCount: -1 } });

            await clicksCollection.updateMany({}, { $set: { clickCount: 0 } });

            if (prevPopularPost) {
                await clicksCollection.updateOne({ _id: prevPopularPost._id }, { $set: { clickCount: 1 } });
            }

            await dateCollection.updateOne({}, { $set: { lastResetDate: new Date() } });
        }

        const clicksDocument = await clicksCollection.findOne({}, { sort: { clickCount: -1 } });

        if (clicksDocument) {
            res.status(200).json({ maxClicksPostId: clicksDocument.slug });
        } else {
            res.status(404).json({ message: "No popular posts found" });
        }
    } catch (err) {
        console.error("Error fetching most popular post:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
