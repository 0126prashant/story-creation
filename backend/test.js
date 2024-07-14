const { Leonardo } = require("@leonardo-ai/sdk");
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const leonardo = new Leonardo({
  bearerAuth: "60aa3f8c-3519-44d1-9d02-2b7d2884c4ea",
});

async function generateImage() {
  try {
    const result = await leonardo.generation.createGeneration({
      prompt: "Doodle robot line art",
      modelId: "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3",
      width: 512,
      height: 512,
      numImages: 1,
    });
    console.log("Generation result:", result);
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
        'Authorization': `Bearer 60aa3f8c-3519-44d1-9d02-2b7d2884c4ea`
      }
    });
    console.log('Generation status response:', response.data);
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
    const filePath = path.join(__dirname, 'uploads', filename);
    fs.writeFileSync(filePath, buffer);

    console.log(`Image saved at: ${filePath}`);
  } catch (error) {
    console.error('Error fetching and saving image:', error.response ? error.response.data : error.message);
  }
}

async function main() {
  try {
    const result = await generateImage();
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
    await fetchAndSaveImage(imageUrl);
  } catch (error) {
    console.error("Image generation and saving failed:", error);
  }
}

main();
