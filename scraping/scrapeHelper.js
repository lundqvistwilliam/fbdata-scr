import fs from "fs/promises";
import puppeteer from "puppeteer";
import connection from "./db.js";
import { NATIONALITY_MAP } from "./NATIONALITY_MAP.js";
import pLimit from "p-limit";

const limit = pLimit(5); // Limit concurrency to 5

// Used in /scrape/club
export async function scrapeClubDataFromURL() {
  try {
    // Read club URLs from the JSON file
    const clubUrls = JSON.parse(
      await fs.readFile("../src/teams.json", "utf-8")
    );

    if (clubUrls.length === 0) {
      console.log("no teams to scrape.");
      res.status(500).send("Error scraping data. Error: No teams added");
      return null;
    }

    for (const url of clubUrls) {
      console.log(`Scraping URL: ${url}...`);

      // Fetch data from the URL
      const { clubNameText, clubLogo } = await fetchClubData(url);
      console.log({ clubNameText, clubLogo });

      /*
      // Insert fetched data into the database
      if (clubNameText && clubLogo) {
        console.log(`Inserting ${clubNameText} data..`);
        await insertClubData(clubNameText, clubLogo);
      }
      */
    }

    // Respond with a success message after all clubs are scraped
    console.log("ALL CLUBS SCRAPED AND DATA INSERTED!");
    res.send("All clubs scraped and data inserted");
  } catch (error) {
    console.error("Error scraping data:", error);
    res.status(500).send("Error scraping data");
  }
}

export async function scrapePlayerDataFromJSONFile2() {
  try {
    // Read club URLs from the JSON file
    const playersUrl = JSON.parse(await fs.readFile("./players.json", "utf-8"));

    if (playersUrl.length === 0) {
      console.log("no players to scrape.");
      res.status(500).send("Error scraping data. Error: No players added");
      return null;
    }

    for (const url of playersUrl) {
      console.log(`Scraping URL for player: ${url}...`);

      // Fetch data from the URL
      const playerData = await scrapePlayerData(url);
      console.log("playerdata", playerData);

      // Insert fetched data into the database
      if (playerData && playerData?.full_name) {
        console.log(`Inserting ${playerData.full_name}..`);
        await insertPlayerData(playerData);
      }
    }

    // Respond with a success message after all clubs are scraped
    console.log("ALL CLUBS SCRAPED AND DATA INSERTED!");
    console.log(
      "------------------------------------------------------------------------------------------------------------------------------------------"
    );
    console.log(
      "--                                                                                                                                     --"
    );
    console.log(
      "------------------------------------------!! E   N  D !!----------------------------------------------------------------------------------"
    );
    console.log(
      "--                                                                                                                                     --"
    );
    console.log(
      "------------------------------------------------------------------------------------------------------------------------------------------"
    );
    //res.send('All clubs scraped and data inserted');
  } catch (error) {
    console.error("Error scraping data:", error);
    //res.status(500).send('Error scraping data');
  }
}

export async function scrapePlayerDataFromJSONFile() {
  try {
    // Read club URLs from the JSON file
    const playersUrl = JSON.parse(await fs.readFile("./players.json", "utf-8"));

    if (playersUrl.length === 0) {
      console.log("No players to scrape.");
      // Assuming `res` is defined somewhere in your code
      res.status(500).send("Error scraping data. Error: No players added");
      return null;
    }

    const scrapePromises = playersUrl.map((url) =>
      limit(() => scrapeAndInsertPlayerData(url))
    );

    await Promise.all(scrapePromises);

    console.log("ALL CLUBS SCRAPED AND DATA INSERTED!");
    console.log(
      "------------------------------------------------------------------------------------------------------------------------------------------"
    );
    console.log(
      "--                                                                                                                                     --"
    );
    console.log(
      "------------------------------------------!! E   N  D !!----------------------------------------------------------------------------------"
    );
    console.log(
      "--                                                                                                                                     --"
    );
    console.log(
      "------------------------------------------------------------------------------------------------------------------------------------------"
    );
  } catch (error) {
    console.error("Error scraping data:", error);
    // Assuming `res` is defined somewhere in your code
    res.status(500).send("Error scraping data");
  }
}

async function scrapeAndInsertPlayerData(url) {
  console.log(`Scraping URL for player: ${url}...`);

  try {
    const playerData = await scrapePlayerData(url);

    if (playerData && playerData.full_name) {
      console.log(`Inserting ${playerData.full_name}..`);
      await insertPlayerData(playerData);
    }
  } catch (error) {
    console.error(
      `Error scraping or inserting player data from ${url}:`,
      error
    );
  }
}

async function fetchClubDataForLaLiga(url) {
  // LEAGUE NAME : LALIGA EA SPORTS
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  let clubs = await page.evaluate(() => {
    let clubNameElements1 = [
      ...document.querySelectorAll(".styled__TextStyled-sc-1mby3k1-0.eaZimx"),
    ];
    let clubNameElements2 = [
      ...document.querySelectorAll(".styled__TextStyled-sc-1mby3k1-0.kYCCIm"),
    ];
    let clubLogoElements = [
      ...document.querySelectorAll(".styled__ImageStyled-sc-17v9b6o-0.coeclD"),
    ];

    let clubNameElements = [...clubNameElements1, ...clubNameElements2];

    return clubNameElements.map((clubNameElement, index) => {
      let club_name = clubNameElement.textContent.trim();
      let image_url = clubLogoElements[index]?.getAttribute("src") || null;
      if (!image_url) {
        console.log(`No logo found for club: ${club_name}`);
      }
      return { club_name, image_url };
    });
  });

  await browser.close();
  return clubs;
}

export async function fetchClubData(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  let clubs = await page.evaluate(() => {
    let clubNameElements = [...document.querySelectorAll(".card-title")];
    let clubLogoElements = [...document.querySelectorAll(".loaded")];

    return clubNameElements.map((clubNameElement, index) => {
      let club_name = clubNameElement.textContent.trim();
      let image_url = clubLogoElements[index]?.getAttribute("src") || null;
      if (!image_url) {
        console.log(`No logo found for club: ${club_name}`);
      }
      return { club_name, image_url };
    });
  });

  await browser.close();
  return clubs;
}

async function convertNationality(adjective) {
  return NATIONALITY_MAP[adjective] || adjective;
}

export async function scrapePlayerData(url) {
  // USED FOR LALIGA EA SPORTS and Bundesliga (2024-06-12)
  const CURRENT_CLUB_ID = 96;
  const SEASON = "2023/2024";
  // DONT FORGET UPDATE TEAM ID
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // full_name, first_name, last_name, nation, position, image_url, club_id, kit_number, season

  const [firstNameEl] = await page.$$('xpath/.//*[@id="ClubPageNameClub"]');
  const firstText = await firstNameEl?.getProperty("textContent");
  const firstNameText = await firstText?.jsonValue();

  /*
  const [lastNameEl] = await page.$$('xpath/.//*[@id="main"]/div[2]/div[2]/div/div/h3');  
  const lastText = await lastNameEl?.getProperty("textContent");
  const lastNameText = await lastText?.jsonValue();
  */

  const [nationEl] = await page.$$('xpath/./html/body/main/div[5]/div[1]/div/div/ul/li[4]/div[2]/span');
  const nation = await nationEl?.getProperty("textContent");
  const nationText = await nation?.jsonValue();

  const [positionEl] = await page.$$('xpath/./html/body/main/div[5]/div[1]/div/div/ul/li[2]/div[2]');
  const position = await positionEl?.getProperty("textContent");
  const positionText = await position?.jsonValue();

  const [imageEl] = await page.$$('xpath/./html/body/main/div[1]/div/div[1]/div/div[1]/img');
  const playerImage = await imageEl?.getProperty("src");
  const playerImageUrl = await playerImage?.jsonValue();

  const [numberEl] = await page.$$('xpath/./html/body/main/div[5]/div[1]/div/div/ul/li[3]/div[2]');
  const playerNumber = await numberEl?.getProperty("textContent");
  const playerNumberText = await playerNumber?.jsonValue();

  const nationConverted = await convertNationality(nationText.trim());

  if (playerImageUrl === "https://www.ligue1.com/-/media/Project/LFP/shared/Images/Players/squad_default_img.png") {
    await browser.close();
    console.log("No player image, ending");
    return null;
  }

  if (!playerNumberText) {
    await browser.close();
    console.log("No kit number, ending");
    return null;
  }

  const [firstName, ...lastNameArray] = firstNameText.split(' ');
  let lastName = lastNameArray.join(' ');
  lastName = lastName.charAt(0) + lastName.slice(1).toLowerCase();

  const playerData = {
    full_name: `${firstName} ${lastName}` || null,
    first_name: firstName || null,
    last_name: lastName || null,
    nation: nationConverted || null,
    position: positionText || null,
    image_url: playerImageUrl || null,
    kit_number: playerNumberText || null,
    club_id: CURRENT_CLUB_ID,
    season: SEASON,
  };
  //console.log("player: ", playerData)
  await browser.close();
  return playerData;
  //return players;
  res.send(content);
}

export async function scrapePlayerDataForBundesliga(url) {
  const CURRENT_CLUB_ID = 79;
  const SEASON = "2023/2024";
  // DONT FORGET UPDATE TEAM ID
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  // full_name, first_name, last_name, nation, position, image_url, club_id, kit_number, season
  const players = await page.evaluate(() => {
    const playerFirstNameElements = [
      ...document.querySelectorAll(".SquadTeamTable-playerName"),
    ];
    const playerLastNameElements = [
      ...document.querySelectorAll(".playerName .lastName"),
    ];
    const playerNationElements = [
      ...document.querySelectorAll(".SquadTeamTable-nationalityName"),
    ];
    const playerPositionElements = [
      ...document.querySelectorAll(".SquadTeamTable-position"),
    ];
    const playerImageElements = [
      ...document.querySelectorAll(".SquadTeamTable-player-picture"),
    ]; // Assuming there's an img tag within .playerImage
    const playerKitNumberElements = [
      ...document.querySelectorAll(
        ".SquadTeamTable-detail .SquadTeamTable-detail--number"
      ),
    ];

    return playerFirstNameElements.map((firstNameElement, index) => {
      const full_name = `${firstNameElement?.textContent.trim()} ${playerLastNameElements?.[
        index
      ]?.textContent.trim()}`;
      const first_name = firstNameElement?.textContent.trim();
      const last_name = playerLastNameElements?.[index]?.textContent.trim();
      const nation = playerNationElements[index]?.textContent.trim() || "";
      const position = playerPositionElements[index]?.textContent.trim() || "";
      const image_url = playerImageElements[index]?.getAttribute("src") || "";
      const kit_number =
        playerKitNumberElements[index]?.textContent.trim() || "";

      return {
        full_name,
        first_name,
        last_name,
        nation,
        position,
        image_url,
        club_id: CURRENT_CLUB_ID,
        kit_number,
        season: SEASON,
      };
    });
  });

  console.log("players", players);

  await browser.close();
  return players;
}

// ----------------------------------------------------------- //
export async function insertClubData(connection, clubNameText, clubLogo) {
  const insertQuery = `
    INSERT INTO club (club_name, league, nation, logo, season)
    VALUES (?, ?, ?, ?, ?)
  `;
  console.log("Inserting: ", clubNameText);
  await connection
    .promise()
    .query(insertQuery, [
      clubNameText,
      "Bundesliga",
      "Germany",
      clubLogo,
      "2023/2024",
    ]);
  console.log("Scraped data inserted into the club table");
}

async function insertPlayerData(playerData) {
  const {
    full_name,
    first_name,
    last_name,
    nation,
    position,
    image_url,
    club_id,
    kit_number,
    season,
  } = playerData;

  const insertQuery = `
    INSERT INTO player (full_name, first_name, last_name, nation, position, image, club_id, kit_number, season)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await connection
    .promise()
    .query(insertQuery, [
      full_name,
      first_name,
      last_name,
      nation,
      position,
      image_url,
      club_id,
      kit_number,
      season,
    ]);
  console.log(`Player ${full_name} inserted into the player table`);
}
