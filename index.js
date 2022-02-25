const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const MongoClient = require('mongodb').MongoClient;
const { ObjectID } = require('mongodb').ObjectId;
require('dotenv').config();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());
var serviceAccount = require('./configs/book-shelf-4c0d0-firebase-adminsdk-ma8a8-446cf4e413.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uqyqt.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
client.connect((err) => {
    const booksCollection = client.db('bookShelf').collection('books');
    const orders = client.db('bookShelf').collection('orders');

    app.get('/books', (req, res) => {
        booksCollection.find().toArray((err, items) => {
            res.send(items);
        });
    });
    app.post('/addBook', (req, res) => {
        const newBook = req.body;
        console.log('adding', newBook);
        booksCollection.insertOne(newBook).then((result) => {
            console.log(result.insertedCount);
            res.send(result.insertedCount > 0);
        });
    });
    app.get('/book/:id', (req, res) => {
        booksCollection
            .find({ _id: ObjectID(req.params.id) })
            .toArray((err, documents) => {
                res.send(documents[0]);
            });
    });
    app.delete('/deleteBook/:id', (req, res) => {
        booksCollection
            .deleteOne({ _id: ObjectID(req.params.id) })
            .then((result) => {});
    });
    app.post('/addBooking', (req, res) => {
        const newBooking = req.body;
        orders.insertOne(newBooking).then((result) => {
            res.send(result.insertedCount > 0);
        });
        console.log(newBooking);
    });
    app.get('/bookings', (req, res) => {
        const bearer = req.headers.authorization;
        console.log(bearer);
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];
            console.log({ idToken });
            admin
                .auth()
                .verifyIdToken(idToken)
                .then((decodedToken) => {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    if (tokenEmail == queryEmail) {
                        orders
                            .find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            });
                    } else {
                        res.status(401).send('Unauthorized Access');
                    }

                    // ...
                })
                .catch((error) => {
                    res.status(401).send('Unauthorized Access');
                });
        } else {
            res.status(401).send('Unauthorized Access');
        }
    });
    console.log('connected successfully');
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
