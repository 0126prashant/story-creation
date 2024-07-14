const { ElevenLabsClient } = require("elevenlabs");
const { v4: uuid } = require("uuid");
const dotenv = require('dotenv');
const fs = require('fs');
const { promisify } = require('util');

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

const readFileAsync = promisify(fs.readFile);

const createAudioFileFromText = async (text) => {
  try {
    const audio = await client.generate({
      voice: "Rachel",
      model_id: "eleven_turbo_v2",
      text,
    });

    const fileName = `${uuid()}.mp3`;
    const fileStream = fs.createWriteStream(fileName);

    return new Promise((resolve, reject) => {
      audio.pipe(fileStream);
      fileStream.on("finish", async () => {
        try {
          const data = await readFileAsync(fileName, { encoding: 'base64' });
          fs.unlinkSync(fileName); 
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });
      fileStream.on("error", reject);
    });
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { createAudioFileFromText };




// const { ElevenLabsClient } = require("elevenlabs");
// const { createWriteStream } = require("fs");
// const { v4: uuid } = require("uuid");
// const dotenv = require('dotenv');
// dotenv.config();

// const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// const client = new ElevenLabsClient({
//   apiKey: ELEVENLABS_API_KEY,
// });

// const createAudioFileFromText = async (text) => {
//   try {
//     const audio = await client.generate({
//       voice: "Rachel",
//       model_id: "eleven_turbo_v2",
//       text,
//     });

//     const fileName = `${uuid()}.mp3`;
//     const fileStream = createWriteStream(fileName);

//     return new Promise((resolve, reject) => {
//       audio.pipe(fileStream);
//       fileStream.on("finish", () => resolve(fileName)); 
//       fileStream.on("error", reject);
//     });
//   } catch (error) {
//     throw new Error(error);
//   }
// };


// module.exports = {createAudioFileFromText}