const express = require('express');
const env = require('dotenv');

env.config();
const app = express();

const port = process.env.PORT;

app.get('/', (req, res) => res.send('hello world'));

app.listen(port, () => {
    console.log('hai');
})