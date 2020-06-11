const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();

app.use(express.static('public'));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

const cors = require('cors');
app.use(cors());

const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const uri = process.env.DATABASE;
const dbName= 'urls_shortened';

const dns = require('dns');

let generateString = () => {
  let charSet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  let string = "";
  for (let i = 0; i < 5; i++) {
      let n = Math.floor(Math.random() * 62);
      string += charSet[n];
  }
  return string;
}

MongoClient.connect(uri, {useUnifiedTopology: true}, (err, client) => {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);
  const urls = db.collection('urls'); 
  
  app.get('/', (req, res) => res.send("/public/index.html"));

  app.post('/api/shorturl/new', (req, res) => {

    let createDocument = (str) => {
      urls.countDocuments({"short_url": str}).then(m => {
        if (m === 0) {
          urls.insertOne({"original_url": original_url, "short_url": str}).then(() => res.json({"original_url": original_url, "short_url": str}));
        }
        else {
          let newStr = generateString();
          createDocument(newStr);
        }
      });
    }

    let original_url = req.body.url;
    let regex = /^(?:http(s)?:\/\/)?w{3,}[\a-z.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/g;

    if (!(regex.test(original_url))) res.json({"error":"invalid URL"});
    else {
      let urlObj = new URL(original_url);
      dns.lookup(urlObj.hostname, 4, (err, address, family) => {
        if (err) res.json({"error":"invalid URL"});
        else {
          urls.countDocuments({"original_url": original_url}).then(n => {
            if (n > 0) urls.findOne({"original_url": original_url}).then(url => res.json({"original_url": url["original_url"], "short_url": url["short_url"]}));
            else {
              let short_url = generateString();
              createDocument(short_url);
            }
          });
        }
      });
    }
  });

  app.get('/:url', (req, res) => {
    let short_url = req.params.url;
    console.log(typeof short_url);
    urls.findOne({"short_url": short_url}).then((url) => res.redirect(url["original_url"])).catch((err) => {
      console.log(err);
      res.send("Sorry ! This url has not been recognized by our system.");
    });
  });

  app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send('Something broke!');
  });

  app.use((req, res, next) => {
      res.status(404).send('Sorry cant find that!');
  });

  app.listen(3000);

});

