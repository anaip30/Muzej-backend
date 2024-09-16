import express from 'express';
import bodyParser from "body-parser";
import cors from "cors";
import auth from "./auth.js";
import dbconnection from "./connection.js";
import { ObjectId } from 'mongodb';
const app = express();
const port = 3000;

app.use(cors())
app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.send('Hello world!')
})

app.post("/authuser", async (req, res) => {
    let user = req.body;
    try{
      let result = await auth.authencticateUser(user.email, user.password);
      res.json(result);
    }catch(e){
      console.log(e)
       res.status(403).json({error:e.message});
    }
  });

app.post("/createuser", async (req, res) => {
    let user = req.body;
    try{
      let id = await auth.registerUser(user);
      res.json(id)
    }catch(e){
      res.status(500).json({error: e.message});
    }
  });


  app.post("/rezervacija", async (req, res) => {
    try {
      const { firstName, lastName, phone, museum, datum } = req.body;
      const collectionData = await dbconnection("Rezervacije");
  
      const novaRezervacija = {
        firstName,
        lastName,
        phone,
        museum, 
        datum
      };
  
      const result = await collectionData.insertOne(novaRezervacija);
      res.status(201).json({ message: "Rezervacija uspješno dodana!", id: result.insertedId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Greška prilikom dodavanja rezervacije." });
    }
  });
  

  app.get("/muzeji", async (req, res) => {
    try {
      const collectionData = await dbconnection("Muzeji");
      const cursor = collectionData.find();
      let pData =  await cursor.toArray()
      return res.json(pData);
    } catch (error) {
      console.error(error);
    }
  });

  app.delete('/muzeji/:id', async (req, res) => {
    const museumId = req.params.id;
  
    try {
      const collectionData = await dbconnection('Muzeji');
      
      const result = await collectionData.deleteOne({ _id: new ObjectId(museumId) });
  
      if (result.deletedCount === 1) {
        res.status(200).json({ message: 'Muzej uspješno obrisan.' });
      } else {
        res.status(404).json({ message: 'Muzej nije pronađen.' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Došlo je do greške pri brisanju muzeja.' });
    }
  });

  app.post('/muzeji', async (req, res) => {
    try {
      const { name, address, hours, image } = req.body;
  
      // Validacija podataka
      if (!name || !address || !hours || !image) {
        return res.status(400).json({ error: 'Svi podaci su obavezni' });
      }
  
      // Kreiranje novog muzeja
      const newMuseum = {
        name,
        address,
        hours,
        image,
        comments:  [] 
      };
  
 
      const collectionData = await dbconnection("Muzeji");
      const result = await collectionData.insertOne(newMuseum);
  
      res.status(201).json({ message: 'Muzej uspesno dodat', museumId: result.insertedId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Greska pri dodavanju muzeja' });
    }
  });

  app.post('/muzeji/:id/ratings', async (req, res) => {
    const museumId = req.params.id;
    const { user, rating } = req.body;
  
    if (!user || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Invalid rating data' });
    }
  
    try {
      const collection = await dbconnection("Muzeji");
  
      const museum = await collection.findOne({ _id: new ObjectId(museumId) });
      if (!museum) {
        return res.status(404).json({ error: 'Museum not found' });
      }

      // Inicijalizuj ratings ako ne postoji
      if (!museum.ratings) {
        museum.ratings = [];
      }
  
      const existingRatingIndex = museum.ratings.findIndex(r => r.user === user);
      if (existingRatingIndex >= 0) {
        museum.ratings[existingRatingIndex].rating = rating;
      } else {
        museum.ratings.push({ user, rating });
      }
  
      // Izracunaj novu prosecnu ocenu
      const totalRatings = museum.ratings.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = totalRatings / museum.ratings.length;
  
      await collection.updateOne(
        { _id: new ObjectId(museumId) },
        { $set: { ratings: museum.ratings, averageRating } }
      );
  
      res.status(200).json({ message: 'Rating added successfully', averageRating });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error adding rating' });
    }
  });

  
  app.get("/sverezervacije", async (req, res) => {
    try {
      const collectionData = await dbconnection("Rezervacije");
      const cursor = collectionData.find();
      let pData =  await cursor.toArray()
      return res.json(pData);
    } catch (error) {
      console.error(error);
    }
  });


  app.post('/muzeji/:id/comments', async (req, res) => {
    try {
      const museumId = req.params.id;
      const newComment = req.body;  
  
      if (!newComment || !newComment.user || !newComment.text) {
        return res.status(400).json({ message: 'Neispravan format podataka' });
      }
  
      // Pronalazimo muzej prema ID-u
      const collectionData = await dbconnection("Muzeji");
      const result = await collectionData.updateOne(
        { _id: new ObjectId(museumId) },  
        { $push: { comments: newComment } }
      );
  
      if (result.modifiedCount === 1) {
        return res.status(200).json({ message: 'Komentar dodan' });
      } else {
        return res.status(404).json({ message: 'Muzej nije pronađen' });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Greška na serveru' });
    }
  });
  
   


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
