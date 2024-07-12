const express = require('express');
const axios = require('axios');
const { OpenAI } = require('@langchain/openai');
const dotenv = require('dotenv');
const { Leonardo } = require('@leonardo-ai/sdk');
const { createAudioFileFromText } = require('../fucntions/elevenlabs');
const { checkGenerationStatus, generateImage, fetchImageAsBase64 } = require('../fucntions/lenardo');

dotenv.config();

const routergpt = express.Router();

const openaiApiKey = process.env.OPENAI_API_KEY;

const model = new OpenAI({
  apiKey: openaiApiKey,
  model: 'gpt-4',
});


routergpt.post('/generate', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  try {
    const { prompt } = req.body;
    const aiprompt = `You are a master storyteller specializing in creating interactive, Twilight Zone-style narratives. Your task is to generate a detailed, atmospheric story scenario based on a given theme. The story should be eerie, thought-provoking, and contain unexpected twists or moral dilemmas.

    Input: ${prompt}
    
    Output your response in the following JSON format:
    {
      "narration": "Two paragraphs of narration. The first paragraph should set the scene and introduce the main character or situation, written in a style reminiscent of Rod Serling's Twilight Zone introductions. The second paragraph should present the user with a situation that requires a decision, subtly suggesting possible paths without explicitly listing options.",
      "image_prompt": "A detailed text prompt for generating an image that captures the essence of the current scene. Include important visual elements, mood, and style."
    }
    
    After the user makes a decision by entering text, generate the next part of the story following the same format. Each choice should lead to a unique narrative branch, eventually culminating in a twist ending or moral revelation.
    
    Key points to remember:
    1. Maintain a consistent tone and atmosphere throughout the story, emphasizing the uncanny, mysterious, or morally ambiguous elements that make Twilight Zone narratives compelling.
    2. Present choices organically within the narration, allowing the user to make decisions based on the situation described.
    3. Be prepared to interpret a wide range of user inputs and continue the story accordingly.
    4. Ensure that each decision point leads to meaningfully different outcomes.
    5. Gradually build tension and intrigue, leading to a powerful twist or revelation at the story's conclusion.`
  
    if (!prompt) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Prompt is required' })}\n\n`);
      return res.end();
    }

    // Generate GPT response
    const gptResponse = await model.invoke(aiprompt);
    const jsonObject = JSON.parse(gptResponse);
    const imagePrompt = jsonObject.image_prompt;
    res.write(`data: ${JSON.stringify({ type: 'gpt', content: gptResponse.content })}\n\n`);

    // Generate Image and Audio in parallel
    res.write(`data: ${JSON.stringify({ type: 'status', content: 'Generating image and audio...' })}\n\n`);

    const [imageResult, audioBase64] = await Promise.all([
      generateImage(imagePrompt),
      createAudioFileFromText(imagePrompt)
    ]);

    const generationId = imageResult.object.sdGenerationJob.generationId;

    let generationStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      generationStatus = await checkGenerationStatus(generationId);
      res.write(`data: ${JSON.stringify({ type: 'status', content: 'Still generating image...' })}\n\n`);
    } while (generationStatus.status !== 'COMPLETE');

    if (generationStatus.generated_images.length === 0) {
      throw new Error('No generated images found');
    }

    const imageUrl = generationStatus.generated_images[0].url;
    const base64Image = await fetchImageAsBase64(imageUrl);

    res.write(`data: ${JSON.stringify({ type: 'image', content: base64Image })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'audio', content: audioBase64 })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
  } catch (error) {
    console.error('Error generating response:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate response' })}\n\n`);
  } finally {
    res.end();
  }
});

module.exports = { routergpt };








// const express = require('express');
// const axios = require('axios');
// const { OpenAI } = require('@langchain/openai');
// const dotenv = require('dotenv');
// const { Leonardo } = require('@leonardo-ai/sdk');
// const { createAudioFileFromText } = require('../fucntions/elevenlabs');

// dotenv.config();

// const routergpt = express.Router();

// const openaiApiKey = process.env.OPENAI_API_KEY;
// const leonardoApiKey = process.env.LEONARDO_API_KEY;

// const model = new OpenAI({
//   apiKey: openaiApiKey,
//   model: 'gpt-4',
// });

// const leonardo = new Leonardo({
//   bearerAuth: leonardoApiKey,
// });

// async function generateImage(prompt) {
//   console.log("Generating image for prompt:", prompt);
//   try {
//     const result = await leonardo.generation.createGeneration({
//       "prompt": prompt,
//       "modelId": "d69c8273-6b17-4a30-a13e-d6637ae1c644",
//       "width": 512,
//       "height": 512,
//       "numImages": 1
//     });
//     return result;
//   } catch (error) {
//     console.error("Error in image generation:", error);
//     throw error;
//   }
// }

// async function checkGenerationStatus(generationId) {
//   try {
//     const response = await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
//       headers: {
//         'Authorization': `Bearer ${leonardoApiKey}`
//       }
//     });
//     return response.data.generations_by_pk;
//   } catch (error) {
//     console.error('Error checking generation status:', error.response ? error.response.data : error.message);
//     throw error;
//   }
// }

// async function fetchImageAsBase64(imageUrl) {
//   try {
//     const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
//     const base64 = Buffer.from(response.data, 'binary').toString('base64');
//     return `data:image/jpeg;base64,${base64}`;
//   } catch (error) {
//     console.error('Error fetching image:', error);
//     throw error;
//   }
// }

// routergpt.post('/generate', async (req, res) => {
//   res.writeHead(200, {
//     'Content-Type': 'text/event-stream',
//     'Cache-Control': 'no-cache',
//     'Connection': 'keep-alive'
//   });

//   try {
//     const { prompt } = req.body;
//     const aiprompt = `You are a master storyteller specializing in creating interactive, Twilight Zone-style narratives. Your task is to generate a detailed, atmospheric story scenario based on a given theme. The story should be eerie, thought-provoking, and contain unexpected twists or moral dilemmas.

//     Input: ${prompt}
    
//     Output your response in the following JSON format:
//     {
//       "narration": "Two paragraphs of narration. The first paragraph should set the scene and introduce the main character or situation, written in a style reminiscent of Rod Serling's Twilight Zone introductions. The second paragraph should present the user with a situation that requires a decision, subtly suggesting possible paths without explicitly listing options.",
//       "image_prompt": "A detailed text prompt for generating an image that captures the essence of the current scene. Include important visual elements, mood, and style."
//     }
    
//     After the user makes a decision by entering text, generate the next part of the story following the same format. Each choice should lead to a unique narrative branch, eventually culminating in a twist ending or moral revelation.
    
//     Key points to remember:
//     1. Maintain a consistent tone and atmosphere throughout the story, emphasizing the uncanny, mysterious, or morally ambiguous elements that make Twilight Zone narratives compelling.
//     2. Present choices organically within the narration, allowing the user to make decisions based on the situation described.
//     3. Be prepared to interpret a wide range of user inputs and continue the story accordingly.
//     4. Ensure that each decision point leads to meaningfully different outcomes.
//     5. Gradually build tension and intrigue, leading to a powerful twist or revelation at the story's conclusion.`
  
//     if (!prompt) {
//       res.write(`data: ${JSON.stringify({ type: 'error', content: 'Prompt is required' })}\n\n`);
//       return res.end();
//     }

//     // Generate GPT response
//     const gptResponse = await model.invoke(aiprompt);
//     const jsonObject = JSON.parse(gptResponse);
//     const imagePrompt = jsonObject.image_prompt;
//     const narrationPrompt = jsonObject.narration;
//     res.write(`data: ${JSON.stringify({ type: 'gpt', content: gptResponse.content })}\n\n`);

//     // Generate Image and Audio in parallel
//     res.write(`data: ${JSON.stringify({ type: 'status', content: 'Generating image and audio...' })}\n\n`);

//     const [imageResult, audioFilePath] = await Promise.all([
//       generateImage(imagePrompt),
//       createAudioFileFromText(narrationPrompt)
//     ]);

//     const generationId = imageResult.object.sdGenerationJob.generationId;

//     let generationStatus;
//     do {
//       await new Promise(resolve => setTimeout(resolve, 5000));
//       generationStatus = await checkGenerationStatus(generationId);
//       res.write(`data: ${JSON.stringify({ type: 'status', content: 'Still generating image...' })}\n\n`);
//     } while (generationStatus.status !== 'COMPLETE');

//     if (generationStatus.generated_images.length === 0) {
//       throw new Error('No generated images found');
//     }

//     const imageUrl = generationStatus.generated_images[0].url;
//     const base64Image = await fetchImageAsBase64(imageUrl);

//     res.write(`data: ${JSON.stringify({ type: 'image', content: base64Image })}\n\n`);
//     res.write(`data: ${JSON.stringify({ type: 'audio', content: audioFilePath })}\n\n`);
//     res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
//   } catch (error) {
//     console.error('Error generating response:', error);
//     res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate response' })}\n\n`);
//   } finally {
//     res.end();
//   }
// });

// module.exports = { routergpt };















// const express = require('express');
// const axios = require('axios');
// const { OpenAI } = require('@langchain/openai');
// const { Leonardo } = require('@leonardo-ai/sdk');
// const dotenv = require('dotenv');
// dotenv.config();

// const routergpt = express.Router();

// const openaiApiKey = process.env.OPENAI_API_KEY;
// const leonardoApiKey = process.env.LEONARDO_API_KEY;

// const model = new OpenAI({
//   apiKey: openaiApiKey,
//   model: 'gpt-4',
// });

// const leonardo = new Leonardo({
//   bearerAuth: leonardoApiKey,
// });

// async function generateImage(prompt) {
//   console.log("Generating image for prompt:", prompt);
//   try {
//     const result = await leonardo.generation.createGeneration({
//       "prompt": prompt,
//       "modelId": "d69c8273-6b17-4a30-a13e-d6637ae1c644",
//       "width": 512,
//       "height": 512,
//       "numImages": 1
//     });
//     return result;
//   } catch (error) {
//     console.error("Error in image generation:", error);
//     throw error;
//   }
// }

// async function checkGenerationStatus(generationId) {
//   try {
//     const response = await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
//       headers: {
//         'Authorization': `Bearer ${leonardoApiKey}`
//       }
//     });
//     return response.data.generations_by_pk;
//   } catch (error) {
//     console.error('Error checking generation status:', error.response ? error.response.data : error.message);
//     throw error;
//   }
// }

// async function fetchImageAsBase64(imageUrl) {
//   try {
//     const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
//     const base64 = Buffer.from(response.data, 'binary').toString('base64');
//     return `data:image/jpeg;base64,${base64}`;
//   } catch (error) {
//     console.error('Error fetching image:', error);
//     throw error;
//   }
// }

// routergpt.post('/generate', async (req, res) => {
//   res.writeHead(200, {
//     'Content-Type': 'text/event-stream',
//     'Cache-Control': 'no-cache',
//     'Connection': 'keep-alive'
//   });

//   try {
//     const { prompt } = req.body;
//     const aiprompt = `You are a master storyteller specializing in creating interactive, Twilight Zone-style narratives. Your task is to generate a detailed, atmospheric story scenario based on a given theme. The story should be eerie, thought-provoking, and contain unexpected twists or moral dilemmas.

//     Input: ${prompt}
    
//     Output your response in the following JSON format:
//     {
//       "narration": "Two paragraphs of narration. The first paragraph should set the scene and introduce the main character or situation, written in a style reminiscent of Rod Serling's Twilight Zone introductions. The second paragraph should present the user with a situation that requires a decision, subtly suggesting possible paths without explicitly listing options.",
//       "image_prompt": "A detailed text prompt for generating an image that captures the essence of the current scene. Include important visual elements, mood, and style."
//     }
    
//     After the user makes a decision by entering text, generate the next part of the story following the same format. Each choice should lead to a unique narrative branch, eventually culminating in a twist ending or moral revelation.
    
//     Key points to remember:
//     1. Maintain a consistent tone and atmosphere throughout the story, emphasizing the uncanny, mysterious, or morally ambiguous elements that make Twilight Zone narratives compelling.
//     2. Present choices organically within the narration, allowing the user to make decisions based on the situation described.
//     3. Be prepared to interpret a wide range of user inputs and continue the story accordingly.
//     4. Ensure that each decision point leads to meaningfully different outcomes.
//     5. Gradually build tension and intrigue, leading to a powerful twist or revelation at the story's conclusion.`
  
//     if (!prompt) {
//       res.write(`data: ${JSON.stringify({ type: 'error', content: 'Prompt is required' })}\n\n`);
//       return res.end();
//     }

//     // Generate GPT response
//     const gptResponse = await model.invoke(aiprompt);
//     // console.log("GPT Response:", gptResponse);
//     const jsonObject = JSON.parse(gptResponse);
//     const imagePrompt = jsonObject.image_prompt;
//     res.write(`data: ${JSON.stringify({ type: 'gpt', content: gptResponse.content })}\n\n`);

//     // Generate Image with Leonardo
//     res.write(`data: ${JSON.stringify({ type: 'status', content: 'Generating image...' })}\n\n`);
//     const imageResult = await generateImage(imagePrompt);
//     const generationId = imageResult.object.sdGenerationJob.generationId;

//     let generationStatus;
//     do {
//       await new Promise(resolve => setTimeout(resolve, 5000));
//       generationStatus = await checkGenerationStatus(generationId);
//       res.write(`data: ${JSON.stringify({ type: 'status', content: 'Still generating...' })}\n\n`);
//     } while (generationStatus.status !== 'COMPLETE');

//     if (generationStatus.generated_images.length === 0) {
//       throw new Error('No generated images found');
//     }

//     const imageUrl = generationStatus.generated_images[0].url;
//     const base64Image = await fetchImageAsBase64(imageUrl);

//     res.write(`data: ${JSON.stringify({ type: 'image', content: base64Image })}\n\n`);
//     res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
//   } catch (error) {
//     console.error('Error generating response:', error);
//     res.write(`data: ${JSON.stringify({ type: 'error', content: 'Failed to generate response' })}\n\n`);
//   } finally {
//     res.end();
//   }
// });

// module.exports = { routergpt };







