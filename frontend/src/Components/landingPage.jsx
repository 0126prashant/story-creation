import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8080/api/generate';

const LandingPage = () => {
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [gptResponse, setGptResponse] = useState('');
  const [status, setStatus] = useState('');
  const [audioData, setAudioData] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioData) {
      console.log("Base64 Audio Data:", audioData); // Log the base64 audio data for debugging
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);
    }
  }, [audioData]);

  const handleBeginJourney = () => {
    setShowQueryInput(true);
  };

  const handleSendQuery = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setGeneratedImage(null);
    setGptResponse('');
    setStatus('');
    setAudioData('');
    setAudioUrl('');

    try {
      const response = await axios.post(API_URL, { prompt: query }, {
        responseType: 'text',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const lines = response.data.split('\n\n');
      for (let line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          console.log('Received data:', data);
          switch(data.type) {
            case 'gpt':
              setGptResponse(data.content);
              break;
            case 'status':
              setStatus(data.content);
              break;
            case 'image':
              setGeneratedImage(data.content);
              setStatus('');
              break;
            case 'audio':
              setAudioData(data.content);
              break;
            case 'complete':
              setIsLoading(false);
              break;
            case 'error':
              setStatus('Error: ' + data.content);
              setIsLoading(false);
              break;
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background GIF */}
      <div className="absolute inset-0 w-full h-full">
        <iframe
          src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
          width="100%"
          height="100%"
          frameBorder="0"
          className="pointer-events-none"
          allowFullScreen
        ></iframe>
      </div>

      {/* HTML5 Audio Player */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} controls autoPlay />
      )}

      {/* Main content */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {!showQueryInput ? (
          <button 
            onClick={handleBeginJourney}
            className="px-6 py-3 text-lg font-semibold bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
          >
            Click to Begin Journey
          </button>
        ) : (
          <div className="w-full max-w-2xl px-4">
            <div className="bg-white bg-opacity-80 p-6 rounded-lg shadow-lg">
              {isLoading && !generatedImage && (
                <div className="mb-4 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              {status && (
                <div className="mb-4 p-3 bg-yellow-100 rounded-lg">
                  <p>{status}</p>
                </div>
              )}
              {generatedImage && (
                <div className="mb-4">
                  <img src={generatedImage} alt="Generated" className="w-full rounded-lg" />
                </div>
              )}
              {gptResponse && (
                <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                  <p>{gptResponse}</p>
                </div>
              )}
              <input
                type="text"
                placeholder="Enter your query here..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full mb-4 text-lg p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleSendQuery}
                disabled={isLoading}
                className={`w-full py-3 text-lg font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Generating...' : 'Generate'}
                {!isLoading && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
