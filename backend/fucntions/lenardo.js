const express = require('express');
const axios = require('axios');
const { OpenAI } = require('@langchain/openai');
const dotenv = require('dotenv');
const { Leonardo } = require('@leonardo-ai/sdk');

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;
const leonardoApiKey = process.env.LEONARDO_API_KEY;

const model = new OpenAI({
  apiKey: openaiApiKey,
  model: 'gpt-4',
});

const leonardo = new Leonardo({
  bearerAuth: leonardoApiKey,
});

async function generateImage(prompt) {
  console.log("Generating image for prompt:", prompt);
  try {
    const result = await leonardo.generation.createGeneration({
      prompt: prompt,
      modelId: "d69c8273-6b17-4a30-a13e-d6637ae1c644",
      width: 512,
      height: 512,
      numImages: 1
    });
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
        'Authorization': `Bearer ${leonardoApiKey}`
      }
    });
    return response.data.generations_by_pk;
  } catch (error) {
    console.error('Error checking generation status:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function fetchImageAsBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

module.exports = {fetchImageAsBase64,checkGenerationStatus,generateImage}