import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connection from '../backend/db.js';
import { insertClubData, scrapePlayerDataFromJSONFile, fetchClubData, scrapePlayerDataForBundesliga } from './scrapeHelper.js';

const app = express();
const port = process.env.PORT;

app.use(cors());

app.get('/scrape/team', async (req, res) => {
  try {
    // https://www.ligue1.com/clubs/List
    const url = '';
    if (!url) return;
    console.log(`Scraping URL: ${url}...`);

    // Fetch data from the URL
    const clubs = await fetchClubData(url);
    console.log("get", clubs);


    for (const club of clubs) {
      console.log("Sending ", club + "...");
      await insertClubData(connection, club.club_name, club.image_url);
    }

    // Respond with a success message after all clubs are scraped
    console.log('ALL CLUBS SCRAPED AND DATA INSERTED!');
    res.send('All clubs scraped and data inserted');
  } catch (error) {
    console.error('Error scraping data:', error);
    res.status(500).send('Error scraping data');
  }

});


app.get('/scrape/player', async (req, res) => {
  await scrapePlayerDataFromJSONFile();
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

