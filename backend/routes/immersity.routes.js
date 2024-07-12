const express = require('express');
const routerimmersity = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

// Replace with your actual Client ID and Secret Key
const clientId = 'f6bf8c72-5272-4737-8191-817f9c723fee';
const clientSecret = 'gx7ClGzQEXmuSzM5eMs9epiGElpIgqFz';

// Ensure environment variables are set
if (!clientId || !clientSecret) {
    console.error('IMMERSITY_CLIENT_ID or IMMERSITY_SECRET_KEY is not set.');
    process.exit(1); // Exit the process with an error code
}

// Create an 'uploads' directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Function to get access token
async function getAccessToken() {
    try {
        const tokenResponse = await axios.post('https://api.immersity.ai/v1/auth/token', {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'client_credentials'
        });
        return tokenResponse.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get access token');
    }
}

routerimmersity.post('/applyeffects', async (req, res) => {
    const { imageURL, effect, parameters } = req.body;

    // Basic validation
    if (!imageURL || !effect || !parameters) {
        return res.status(400).json({ error: 'Missing required fields: imageURL, effect, or parameters' });
    }

    try {
        // Get access token
        const accessToken = await getAccessToken();

        // Apply 3D effects using Immersity AI API
        const effectResponse = await axios.post('https://api.immersity.ai/v1/effects', {
            image: {
                url: imageURL
            },
            effect: effect,
            parameters: parameters
        }, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const processedImageUrl = effectResponse.data.download_url;

        // Download the processed image
        const imageResponse = await axios.get(processedImageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imageResponse.data, 'binary');

        // Generate a unique filename
        const filename = `processed_image_${Date.now()}.jpg`;
        const filePath = path.join(uploadsDir, filename);

        // Save the image to the uploads folder
        fs.writeFileSync(filePath, buffer);

        // Send the response back to the client
        res.json({
            ...effectResponse.data,
            savedImagePath: `/uploads/${filename}` // Relative path to the saved image
        });
    } catch (error) {
        console.error('Error applying effects:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { routerimmersity };
