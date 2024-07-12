const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Leonardo } = require('@leonardo-ai/sdk');

dotenv.config();

const routerLeonardo = express.Router();
const apiKey = process.env.LEONARDO_API_KEY;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const leonardo = new Leonardo({
  bearerAuth: apiKey,
});

async function generateImage(prompt) {
  try {
    const result = await leonardo.generation.createGeneration({
      "prompt": prompt,
      "modelId": "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",
      "width": 512,
      "height": 512,
      "numImages": 1
    });
    // console.log("Generation result:", result);
    return result;
  } catch (error) {
    console.error("Error in image generation:", error);
    throw error;
  }
}

async function checkGenerationStatus(generationId) {
  try {
    const response = await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    // console.log('Generation status response:', response.data);
    return response.data.generations_by_pk;
  } catch (error) {
    console.error('Error checking generation status:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function fetchAndSaveImage(imageUrl) {
  try {
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(imageResponse.data, 'binary');

    const filename = `generated_image_${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    // console.log(`Image saved at: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error fetching and saving image:', error.response ? error.response.data : error.message);
    throw error;
  }
}

routerLeonardo.post('/generate-image', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Missing required fields: prompt, modelId, width, height, or numImages' });
  }

  try {
    const result = await generateImage(prompt);
    const generationId = result.object.sdGenerationJob.generationId;

    let generationStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before polling again
      generationStatus = await checkGenerationStatus(generationId);
    } while (generationStatus.status !== 'COMPLETE');

    if (generationStatus.generated_images.length === 0) {
      throw new Error('No generated images found');
    }

    const imageUrl = generationStatus.generated_images[0].url;
    const filePath = await fetchAndSaveImage(imageUrl);

    res.json({
      message: 'Image generated and saved successfully',
      imageUrl: filePath,
    });
  } catch (error) {
    console.error("Image generation and saving failed:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = { routerLeonardo };
