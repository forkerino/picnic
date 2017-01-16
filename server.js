'use strict';

const express = require('express');
const mongo = require('mongodb').MongoClient;
const dotenv = require('dotenv');
const searchImages = require('node-google-image-search');
const path = require('path');

const app = express();

dotenv.config();
const dburl = process.env.MONGOLAB_URI;

app.use(express.static(path.join(__dirname, 'public')));

mongo.connect(dburl, function(err,db){
    if (err) throw err;
    db.createCollection('searchhistory',{capped: true, size: 10});
});

app.get('/api/imagesearch/:searchquery', function(req, res){
    let term = req.params.searchquery;
    let offset = req.query.offset || 0;
    let when = new Date;
    
    let searchResults = searchImages(term, showResults, offset, 10);
    
    function showResults(results){
        let displayResults = results.map(function(item){
            let url = item.link;
            let snippet = item.snippet;
            let thumbnail = item.image.thumbnailLink;
            let context = item.image.contextLink;
            return {
                url,
                snippet,
                thumbnail,
                context
            };
        });
        res.end(JSON.stringify(displayResults));
    }    
    
    mongo.connect(dburl,function(err,db){
       if (err) throw err;
       let history = db.collection('searchhistory');
       history.insert({term, when}, function(err,data){
           if (err) throw err;
           db.close();
       });
    });
});

app.get('/api/latest/imagesearch', function(req, res){
    mongo.connect(dburl, function(err,db){
       if (err) throw err;
       let history = db.collection('searchhistory');
       history.find().sort({when: -1}).limit(10).toArray(function(err,docs){
            if (err) throw err;
            let displayTerms = docs.map(function(doc){
                return { term: doc.term, when: doc.when };   
            });
            res.end(JSON.stringify(displayTerms));
            db.close();
       });
    });
});

app.get('*', function(req, res){
    res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

app.listen(process.env.PORT || 8080, function(){
    console.log("listening...");
});

