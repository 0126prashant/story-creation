import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../styles/landing.css';

const API_URL = 'http://localhost:8080/api/generate';

const Spinner3D = () => (
  <div className="spinner-3d">
    <div className="cube1"></div>
    <div className="cube2"></div>
  </div>
);

const LandingPage = () => {
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [gptResponse, setGptResponse] = useState('');
  const [status, setStatus] = useState('');
  const [audioData, setAudioData] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [narrationChunks, setNarrationChunks] = useState([]);
  const [displayedWords, setDisplayedWords] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasResponse, setHasResponse] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [showInputArea, setShowInputArea] = useState(true);
  const audioRef = useRef(null);

  const MAX_WORDS_DISPLAYED = 15;

  useEffect(() => {
    if (audioData) {
      const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);
    }
  }, [audioData]);

  useEffect(() => {
    if (audioRef.current) {
      const updateNarration = () => {
        if (!audioRef.current || narrationChunks.length === 0 || audioEnded) return;
        
        const currentTime = audioRef.current.currentTime;
        const totalDuration = audioRef.current.duration;
        const allWords = narrationChunks.flat().join(' ').split(' ');
        const wordIndex = Math.floor((currentTime / totalDuration) * allWords.length);
        
        setDisplayedWords(allWords.slice(Math.max(0, wordIndex - MAX_WORDS_DISPLAYED + 1), wordIndex + 1));
      };

      audioRef.current.ontimeupdate = updateNarration;
      audioRef.current.onplay = () => {
        setIsPlaying(true);
        setAudioEnded(false);
        setShowInputArea(false); // Hide input area when audio starts playing
      };
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setAudioEnded(true);
        setDisplayedWords([]); // Clear displayed words when audio ends
        setShowInputArea(true); // Show input area when audio ends
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.ontimeupdate = null;
        audioRef.current.onplay = null;
        audioRef.current.onpause = null;
        audioRef.current.onended = null;
      }
    };
  }, [audioUrl, narrationChunks, audioEnded]);

  useEffect(() => {
    if (audioUrl) {
      audioRef.current.play().catch(error => console.error("Audio playback failed:", error));
    }
  }, [audioUrl]);

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
    setNarrationChunks([]);
    setDisplayedWords([]);
    setHasResponse(false);
    setAudioEnded(false);
    setShowInputArea(true);

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
          switch (data.type) {
            case 'gpt':
              setGptResponse(data.content);
              setHasResponse(true);
              break;
            case 'status':
              setStatus(data.content);
              break;
            case 'image':
              setGeneratedImage(data.content);
              setStatus('');
              setHasResponse(true);
              break;
            case 'audio':
              setAudioData(data.content);
              setHasResponse(true);
              break;
            case 'narration':
              setNarrationChunks(prev => [...prev, data.content]);
              setHasResponse(true);
              break;
            case 'complete':
              setIsLoading(false);
              break;
            case 'error':
              setStatus('Error: ' + data.content);
              setIsLoading(false);
              break;
            default:
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
    <div className="landing-page">
      <div className="background">
        <iframe
          src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
          width="100%"
          height="100%"
          frameBorder="0"
          className="giphy-embed"
          allowFullScreen
        ></iframe>
      </div>

      <audio ref={audioRef} src={audioUrl} className="hidden"></audio>

      <div className="content">
        <h1 className="title">AI Journey Generator</h1>
        
        {!showQueryInput ? (
          <button onClick={handleBeginJourney} className="start-button">
            Begin Your Journey
          </button>
        ) : (
          <div className={`query-container ${hasResponse ? 'with-response' : ''}`}>
            {isLoading && !generatedImage && (
              <div className="spinner-wrapper">
                <Spinner3D />
              </div>
            )}
            {status && (
              <div className="status-message">
                <p>{status}</p>
              </div>
            )}
            <div className={`image-container ${hasResponse ? 'with-response' : ''}`}>
  {generatedImage && (
    <div className="image-wrapper">
      <img 
        src={generatedImage} 
        alt="Generated" 
        className="generated-image"
        onLoad={(e) => e.target.classList.add('loaded')}
      />
    </div>
              )}
              {displayedWords.length > 0 && !audioEnded && (
                <div className="narration-overlay">
                  <p className="single-line-narration">{displayedWords.join(' ')}</p>
                </div>
              )}
            </div>
            {showInputArea && (
              <div className="input-area">
                <input
                  type="text"
                  placeholder="Describe your journey..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="query-input"
                />
                <button
                  onClick={handleSendQuery}
                  disabled={isLoading}
                  className={`generate-button ${isLoading ? 'disabled' : ''}`}
                >
                  Generate
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;










// import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';
// import '../styles/landing.css';

// const API_URL = 'http://localhost:8080/api/generate';

// const Spinner3D = () => (
//   <div className="spinner-3d">
//     <div className="cube1"></div>
//     <div className="cube2"></div>
//   </div>
// );

// const LandingPage = () => {
//   const [showQueryInput, setShowQueryInput] = useState(false);
//   const [query, setQuery] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [generatedImage, setGeneratedImage] = useState(null);
//   const [gptResponse, setGptResponse] = useState('');
//   const [status, setStatus] = useState('');
//   const [audioData, setAudioData] = useState('');
//   const [audioUrl, setAudioUrl] = useState('');
//   const [narrationChunks, setNarrationChunks] = useState([]);
//   const [displayedWords, setDisplayedWords] = useState([]);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [hasResponse, setHasResponse] = useState(false);
//   const audioRef = useRef(null);
//   const chunkIntervalRef = useRef(null);

//   const MAX_WORDS_DISPLAYED = 15; // Adjust this number based on your UI

//   useEffect(() => {
//     if (audioData) {
//       const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
//       const audioUrl = URL.createObjectURL(audioBlob);
//       setAudioUrl(audioUrl);
//     }
//   }, [audioData]);

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.onplay = () => {
//         setIsPlaying(true);
//         startNarrationDisplay();
//       };
//       audioRef.current.onpause = () => {
//         setIsPlaying(false);
//         if (chunkIntervalRef.current) {
//           clearInterval(chunkIntervalRef.current);
//         }
//       };
//       audioRef.current.onended = () => {
//         setIsPlaying(false);
//         if (chunkIntervalRef.current) {
//           clearInterval(chunkIntervalRef.current);
//         }
//       };
//     }

//     return () => {
//       if (chunkIntervalRef.current) {
//         clearInterval(chunkIntervalRef.current);
//       }
//     };
//   }, [audioUrl, narrationChunks]);

//   const startNarrationDisplay = () => {
//     let wordIndex = 0;
//     const allWords = narrationChunks.flatMap(chunk => chunk.split(' '));
    
//     chunkIntervalRef.current = setInterval(() => {
//       if (wordIndex < allWords.length) {
//         setDisplayedWords(prevWords => {
//           const newWords = [...prevWords, allWords[wordIndex]];
//           if (newWords.length > MAX_WORDS_DISPLAYED) {
//             newWords.shift(); // Remove the first word if we exceed the maximum
//           }
//           return newWords;
//         });
//         wordIndex++;
//       } else {
//         clearInterval(chunkIntervalRef.current);
//       }
//     }, 590); // Adjust timing as needed
//   };

//   useEffect(() => {
//     if (audioUrl) {
//       audioRef.current.play().catch(error => console.error("Audio playback failed:", error));
//     }
//   }, [audioUrl]);

//   const handleBeginJourney = () => {
//     setShowQueryInput(true);
//   };

//   const handleSendQuery = async () => {
//     if (!query.trim()) return;

//     setIsLoading(true);
//     setGeneratedImage(null);
//     setGptResponse('');
//     setStatus('');
//     setAudioData('');
//     setAudioUrl('');
//     setNarrationChunks([]);
//     setDisplayedWords([]);
//     setHasResponse(false);

//     try {
//       const response = await axios.post(API_URL, { prompt: query }, {
//         responseType: 'text',
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       });

//       const lines = response.data.split('\n\n');
//       for (let line of lines) {
//         if (line.startsWith('data: ')) {
//           const data = JSON.parse(line.slice(6));
//           console.log('Received data:', data);
//           switch (data.type) {
//             case 'gpt':
//               setGptResponse(data.content);
//               setHasResponse(true);
//               break;
//             case 'status':
//               setStatus(data.content);
//               break;
//             case 'image':
//               setGeneratedImage(data.content);
//               setStatus('');
//               setHasResponse(true);
//               break;
//             case 'audio':
//               setAudioData(data.content);
//               setHasResponse(true);
//               break;
//             case 'narration':
//               setNarrationChunks(prev => [...prev, data.content]);
//               setHasResponse(true);
//               break;
//             case 'complete':
//               setIsLoading(false);
//               break;
//             case 'error':
//               setStatus('Error: ' + data.content);
//               setIsLoading(false);
//               break;
//             default:
//               break;
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setStatus('Connection error. Please try again.');
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="landing-page">
//       <div className="background">
//         <iframe
//           src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
//           width="100%"
//           height="100%"
//           frameBorder="0"
//           className="giphy-embed"
//           allowFullScreen
//         ></iframe>
//       </div>

//       <audio ref={audioRef} src={audioUrl} className="hidden"></audio>

//       <div className="content">
//         <h1 className="title">AI Journey Generator</h1>
        
//         {!showQueryInput ? (
//           <button onClick={handleBeginJourney} className="start-button">
//             Begin Your Journey
//           </button>
//         ) : (
//           <div className={`query-container ${hasResponse ? 'with-response' : ''}`}>
//             {isLoading && !generatedImage && (
//               <div className="spinner-wrapper">
//                 <Spinner3D />
//               </div>
//             )}
//             {status && (
//               <div className="status-message">
//                 <p>{status}</p>
//               </div>
//             )}
//             <div className={`image-container ${hasResponse ? 'with-response' : ''}`}>
//               {generatedImage && (
//                 <div className="image-wrapper">
//                   <img 
//                     src={generatedImage} 
//                     alt="Generated" 
//                     className="generated-image"
//                   />
//                 </div>
//               )}
//               {displayedWords.length > 0 && (
//                 <div className="narration-overlay">
//                   <p className="single-line-narration">{displayedWords.join(' ')}</p>
//                 </div>
//               )}
//             </div>
//             <div className="input-area">
//               <input
//                 type="text"
//                 placeholder="Describe your journey..."
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 className="query-input"
//               />
//               <button
//                 onClick={handleSendQuery}
//                 disabled={isLoading}
//                 className={`generate-button ${isLoading ? 'disabled' : ''}`}
//               >
//                 Generate
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LandingPage;










// import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';

// const API_URL = 'http://localhost:8080/api/generate';

// // Custom 3D Spinner component
// const Spinner3D = () => (
//   <div className="spinner-3d">
//     <div className="cube1"></div>
//     <div className="cube2"></div>
//   </div>
// );

// const LandingPage = () => {
//   const [showQueryInput, setShowQueryInput] = useState(false);
//   const [query, setQuery] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [generatedImage, setGeneratedImage] = useState(null);
//   const [gptResponse, setGptResponse] = useState('');
//   const [status, setStatus] = useState('');
//   const [audioData, setAudioData] = useState('');
//   const [audioUrl, setAudioUrl] = useState('');
//   const [narration, setNarration] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const audioRef = useRef(null);
//   const narrationRef = useRef(null);

//   useEffect(() => {
//     if (audioData) {
//       const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
//       const audioUrl = URL.createObjectURL(audioBlob);
//       setAudioUrl(audioUrl);
//     }
//   }, [audioData]);

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.onplay = () => setIsPlaying(true);
//       audioRef.current.onpause = () => setIsPlaying(false);
//       audioRef.current.onended = () => setIsPlaying(false);
//     }
//   }, [audioUrl]);

//   useEffect(() => {
//     if (audioUrl) {
//       audioRef.current.play().catch(error => console.error("Audio playback failed:", error));
//     }
//   }, [audioUrl]);

//   const handleBeginJourney = () => {
//     setShowQueryInput(true);
//   };

//   const handleSendQuery = async () => {
//     if (!query.trim()) return;

//     setIsLoading(true);
//     setGeneratedImage(null);
//     setGptResponse('');
//     setStatus('');
//     setAudioData('');
//     setAudioUrl('');
//     setNarration('');

//     try {
//       const response = await axios.post(API_URL, { prompt: query }, {
//         responseType: 'text',
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       });

//       const lines = response.data.split('\n\n');
//       for (let line of lines) {
//         if (line.startsWith('data: ')) {
//           const data = JSON.parse(line.slice(6));
//           console.log('Received data:', data);
//           switch (data.type) {
//             case 'gpt':
//               setGptResponse(data.content);
//               break;
//             case 'status':
//               setStatus(data.content);
//               break;
//             case 'image':
//               setGeneratedImage(data.content);
//               setStatus('');
//               break;
//             case 'audio':
//               setAudioData(data.content);
//               break;
//             case 'narration':
//               setNarration(prev => prev + ' ' + data.content);
//               break;
//             case 'complete':
//               setIsLoading(false);
//               break;
//             case 'error':
//               setStatus('Error: ' + data.content);
//               setIsLoading(false);
//               break;
//             default:
//               break;
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setStatus('Connection error. Please try again.');
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isPlaying && narrationRef.current) {
//       const words = narration.split(' ');
//       let currentWord = 0;
//       const interval = setInterval(() => {
//         if (currentWord < words.length) {
//           narrationRef.current.textContent = words.slice(0, currentWord + 1).join(' ');
//           currentWord++;
//         } else {
//           clearInterval(interval);
//         }
//       }, audioRef.current.duration * 1000 / words.length);

//       return () => clearInterval(interval);
//     }
//   }, [isPlaying, narration]);

//   useEffect(() => {
//     if (!isPlaying && !isLoading && generatedImage) {
//       const timer = setTimeout(() => {
//         setShowQueryInput(true);
//       }, 2000);
//       return () => clearTimeout(timer);
//     }
//   }, [isPlaying, isLoading, generatedImage]);

//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* Background GIF */}
//       <div className="absolute inset-0 w-full h-full">
//         <iframe
//           src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
//           width="100%"
//           height="100%"
//           frameBorder="0"
//           className="pointer-events-none"
//           allowFullScreen
//         ></iframe>
//       </div>

//       {/* Hidden audio element */}
//       <audio ref={audioRef} src={audioUrl} className="hidden" />

//       {/* Main content */}
//       <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
//         <h1 className="text-5xl font-bold text-white mb-12 text-center shadow-text">AI Journey Generator</h1>
        
//         {!showQueryInput ? (
//           <button
//             onClick={handleBeginJourney}
//             className="px-10 py-5 text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50"
//           >
//             Begin Your Journey
//           </button>
//         ) : (
//           <div className="w-full max-w-6xl bg-black bg-opacity-60 backdrop-filter backdrop-blur-md rounded-xl shadow-2xl p-12">
//             {isLoading && !generatedImage && (
//               <div className="mb-12 flex justify-center items-center">
//                 <Spinner3D />
//               </div>
//             )}
//             {status && (
//               <div className="mb-8 p-6 bg-yellow-100 bg-opacity-80 rounded-lg text-yellow-800 text-lg">
//                 <p>{status}</p>
//               </div>
//             )}
//             <div className="relative mb-8">
//               {generatedImage && (
//                 <img src={generatedImage} alt="Generated" className="w-full rounded-lg object-cover h-[500px]" />
//               )}
//               {narration && (
//                 <div className="absolute bottom-0 w-full p-6 bg-black bg-opacity-70 text-white text-center rounded-b-lg">
//                   <p ref={narrationRef} className="text-xl"></p>
//                 </div>
//               )}
//             </div>
//             {!isLoading && (
//               <div className="flex items-center space-x-6">
//                 <input
//                   type="text"
//                   placeholder="Describe your journey..."
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                   className="flex-grow text-xl p-6 bg-white bg-opacity-20 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-200"
//                 />
//                 <button
//                   onClick={handleSendQuery}
//                   disabled={isLoading}
//                   className={`py-6 px-10 text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
//                 >
//                   Generate
//                 </button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>

//       {/* Styles for the 3D Spinner */}
//       <style jsx>{`
//         .spinner-3d {
//           width: 80px;
//           height: 80px;
//           position: relative;
//           transform-style: preserve-3d;
//           animation: spin 2.5s linear infinite;
//         }
//         .cube1, .cube2 {
//           background-color: #8B5CF6;
//           width: 60px;
//           height: 60px;
//           position: absolute;
//           top: 0;
//           left: 0;
//           opacity: 0.8;
//         }
//         .cube1 {
//           transform: translateZ(-30px);
//           animation: pulse 1.25s alternate infinite;
//         }
//         .cube2 {
//           transform: translateZ(30px);
//           animation: pulse 1.25s alternate infinite 0.5s;
//         }
//         @keyframes spin {
//           0% { transform: rotate3d(1, 1, 1, 0deg); }
//           100% { transform: rotate3d(1, 1, 1, 360deg); }
//         }
//         @keyframes pulse {
//           0% { opacity: 0.5; }
//           100% { opacity: 1; }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default LandingPage;








// import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';

// const API_URL = 'http://localhost:8080/api/generate';

// const LandingPage = () => {
//   const [showQueryInput, setShowQueryInput] = useState(false);
//   const [query, setQuery] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [generatedImage, setGeneratedImage] = useState(null);
//   const [gptResponse, setGptResponse] = useState('');
//   const [status, setStatus] = useState('');
//   const [audioData, setAudioData] = useState('');
//   const [audioUrl, setAudioUrl] = useState('');
//   const [narration, setNarration] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const audioRef = useRef(null);
//   const narrationRef = useRef(null);

//   useEffect(() => {
//     if (audioData) {
//       const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
//       const audioUrl = URL.createObjectURL(audioBlob);
//       setAudioUrl(audioUrl);
//     }
//   }, [audioData]);

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.onplay = () => setIsPlaying(true);
//       audioRef.current.onpause = () => setIsPlaying(false);
//       audioRef.current.onended = () => setIsPlaying(false);
//     }
//   }, [audioUrl]);

//   useEffect(() => {
//     if (audioUrl) {
//       audioRef.current.play().catch(error => console.error("Audio playback failed:", error));
//     }
//   }, [audioUrl]);

//   const handleBeginJourney = () => {
//     setShowQueryInput(true);
//   };

//   const handleSendQuery = async () => {
//     if (!query.trim()) return;

//     setIsLoading(true);
//     setGeneratedImage(null);
//     setGptResponse('');
//     setStatus('');
//     setAudioData('');
//     setAudioUrl('');
//     setNarration('');

//     try {
//       const response = await axios.post(API_URL, { prompt: query }, {
//         responseType: 'text',
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       });

//       const lines = response.data.split('\n\n');
//       for (let line of lines) {
//         if (line.startsWith('data: ')) {
//           const data = JSON.parse(line.slice(6));
//           console.log('Received data:', data);
//           switch (data.type) {
//             case 'gpt':
//               setGptResponse(data.content);
//               break;
//             case 'status':
//               setStatus(data.content);
//               break;
//             case 'image':
//               setGeneratedImage(data.content);
//               setStatus('');
//               break;
//             case 'audio':
//               setAudioData(data.content);
//               break;
//             case 'narration':
//               setNarration(prev => prev + ' ' + data.content);
//               break;
//             case 'complete':
//               setIsLoading(false);
//               break;
//             case 'error':
//               setStatus('Error: ' + data.content);
//               setIsLoading(false);
//               break;
//             default:
//               break;
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setStatus('Connection error. Please try again.');
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isPlaying && narrationRef.current) {
//       const words = narration.split(' ');
//       let currentWord = 0;
//       const interval = setInterval(() => {
//         if (currentWord < words.length) {
//           narrationRef.current.textContent = words.slice(0, currentWord + 1).join(' ');
//           currentWord++;
//         } else {
//           clearInterval(interval);
//         }
//       }, audioRef.current.duration * 1000 / words.length);

//       return () => clearInterval(interval);
//     }
//   }, [isPlaying, narration]);

//   useEffect(() => {
//     if (!isPlaying && !isLoading && generatedImage) {
//       const timer = setTimeout(() => {
//         setShowQueryInput(true);
//       }, 2000);
//       return () => clearTimeout(timer);
//     }
//   }, [isPlaying, isLoading, generatedImage]);

//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* Background GIF */}
//       <div className="absolute inset-0 w-full h-full">
//         <iframe
//           src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
//           width="100%"
//           height="100%"
//           frameBorder="0"
//           className="pointer-events-none"
//           allowFullScreen
//         ></iframe>
//       </div>

//       {/* Hidden audio element */}
//       <audio ref={audioRef} src={audioUrl} className="hidden" />

//       {/* Main content */}
//       <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
//         <h1 className="text-4xl font-bold text-white mb-8 text-center shadow-text">AI Journey Generator</h1>
        
//         {!showQueryInput ? (
//           <button
//             onClick={handleBeginJourney}
//             className="px-8 py-4 text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50"
//           >
//             Begin Your Journey
//           </button>
//         ) : (
//           <div className="w-full max-w-4xl bg-black bg-opacity-50 backdrop-filter backdrop-blur-md rounded-xl shadow-2xl p-8">
//             {isLoading && !generatedImage && (
//               <div className="mb-8 flex justify-center items-center">
//                 <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
//               </div>
//             )}
//             {status && (
//               <div className="mb-6 p-4 bg-yellow-100 bg-opacity-80 rounded-lg text-yellow-800">
//                 <p>{status}</p>
//               </div>
//             )}
//             <div className="relative mb-6">
//               {generatedImage && (
//                 <img src={generatedImage} alt="Generated" className="w-full rounded-lg object-cover h-[400px]" />
//               )}
//               {narration && (
//                 <div className="absolute bottom-0 w-full p-4 bg-black bg-opacity-70 text-white text-center rounded-b-lg">
//                   <p ref={narrationRef} className="text-lg"></p>
//                 </div>
//               )}
//             </div>
//             {!isLoading && (
//               <div className="flex items-center space-x-4">
//                 <input
//                   type="text"
//                   placeholder="Describe your journey..."
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                   className="flex-grow text-lg p-4 bg-white bg-opacity-20 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-200"
//                 />
//                 <button
//                   onClick={handleSendQuery}
//                   disabled={isLoading}
//                   className={`py-4 px-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
//                 >
//                   Generate
//                 </button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LandingPage;






// ----------------------code with new UI-------------------

// import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';

// const API_URL = 'http://localhost:8080/api/generate';

// const LandingPage = () => {
//   const [showQueryInput, setShowQueryInput] = useState(false);
//   const [query, setQuery] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [generatedImage, setGeneratedImage] = useState(null);
//   const [gptResponse, setGptResponse] = useState('');
//   const [status, setStatus] = useState('');
//   const [audioData, setAudioData] = useState('');
//   const [audioUrl, setAudioUrl] = useState('');
//   const [narration, setNarration] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const audioRef = useRef(null);
//   const narrationRef = useRef(null);

//   useEffect(() => {
//     if (audioData) {
//       const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
//       const audioUrl = URL.createObjectURL(audioBlob);
//       setAudioUrl(audioUrl);
//     }
//   }, [audioData]);

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.onplay = () => setIsPlaying(true);
//       audioRef.current.onpause = () => setIsPlaying(false);
//       audioRef.current.onended = () => setIsPlaying(false);
//     }
//   }, [audioUrl]);

//   const handleBeginJourney = () => {
//     setShowQueryInput(true);
//   };

//   const handleSendQuery = async () => {
//     if (!query.trim()) return;

//     setIsLoading(true);
//     setGeneratedImage(null);
//     setGptResponse('');
//     setStatus('');
//     setAudioData('');
//     setAudioUrl('');
//     setNarration('');

//     try {
//       const response = await axios.post(API_URL, { prompt: query }, {
//         responseType: 'text',
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       });

//       const lines = response.data.split('\n\n');
//       for (let line of lines) {
//         if (line.startsWith('data: ')) {
//           const data = JSON.parse(line.slice(6));
//           console.log('Received data:', data);
//           switch (data.type) {
//             case 'gpt':
//               setGptResponse(data.content);
//               break;
//             case 'status':
//               setStatus(data.content);
//               break;
//             case 'image':
//               setGeneratedImage(data.content);
//               setStatus('');
//               break;
//             case 'audio':
//               setAudioData(data.content);
//               break;
//             case 'narration':
//               setNarration(prev => prev + ' ' + data.content);
//               break;
//             case 'complete':
//               setIsLoading(false);
//               break;
//             case 'error':
//               setStatus('Error: ' + data.content);
//               setIsLoading(false);
//               break;
//             default:
//               break;
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setStatus('Connection error. Please try again.');
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isPlaying && narrationRef.current) {
//       const words = narration.split(' ');
//       let currentWord = 0;
//       const interval = setInterval(() => {
//         if (currentWord < words.length) {
//           narrationRef.current.textContent = words.slice(0, currentWord + 1).join(' ');
//           currentWord++;
//         } else {
//           clearInterval(interval);
//         }
//       }, audioRef.current.duration * 1000 / words.length);

//       return () => clearInterval(interval);
//     }
//   }, [isPlaying, narration]);

//   useEffect(() => {
//     if (!isPlaying && !isLoading && generatedImage) {
//       const timer = setTimeout(() => {
//         setShowQueryInput(true);
//       }, 2000);
//       return () => clearTimeout(timer);
//     }
//   }, [isPlaying, isLoading, generatedImage]);

//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* Background GIF */}
//       <div className="absolute inset-0 w-full h-full">
//         <iframe
//           src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
//           width="100%"
//           height="100%"
//           frameBorder="0"
//           className="pointer-events-none"
//           allowFullScreen
//         ></iframe>
//       </div>

//       {/* Main content */}
//       <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8">
//         <h1 className="text-4xl font-bold text-white mb-8 text-center shadow-text">AI Journey Generator</h1>
        
//         {!showQueryInput ? (
//           <button
//             onClick={handleBeginJourney}
//             className="px-8 py-4 text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50"
//           >
//             Begin Your Journey
//           </button>
//         ) : (
//           <div className="w-full max-w-4xl bg-black bg-opacity-50 backdrop-filter backdrop-blur-md rounded-xl shadow-2xl p-8">
//             {isLoading && !generatedImage && (
//               <div className="mb-8 flex justify-center items-center">
//                 <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
//               </div>
//             )}
//             {status && (
//               <div className="mb-6 p-4 bg-yellow-100 bg-opacity-80 rounded-lg text-yellow-800">
//                 <p>{status}</p>
//               </div>
//             )}
//             <div className="relative mb-6">
//               {generatedImage && (
//                 <img src={generatedImage} alt="Generated" className="w-full rounded-lg object-cover h-[400px]" />
//               )}
//               {narration && (
//                 <div className="absolute bottom-0 w-full p-4 bg-black bg-opacity-70 text-white text-center rounded-b-lg">
//                   <p ref={narrationRef} className="text-lg"></p>
//                 </div>
//               )}
//             </div>
//             {audioUrl && (
//               <div className="mb-6 flex justify-center">
//                 <audio ref={audioRef} src={audioUrl} controls className="w-full max-w-md" />
//               </div>
//             )}
//             {!isLoading && (
//               <div className="flex items-center space-x-4">
//                 <input
//                   type="text"
//                   placeholder="Describe your journey..."
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                   className="flex-grow text-lg p-4 bg-white bg-opacity-20 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-200"
//                 />
//                 <button
//                   onClick={handleSendQuery}
//                   disabled={isLoading}
//                   className={`py-4 px-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
//                 >
//                   Generate
//                 </button>
//               </div>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LandingPage;










// import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';

// const API_URL = 'http://localhost:8080/api/generate';

// const LandingPage = () => {
//   const [showQueryInput, setShowQueryInput] = useState(false);
//   const [query, setQuery] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [generatedImage, setGeneratedImage] = useState(null);
//   const [gptResponse, setGptResponse] = useState('');
//   const [status, setStatus] = useState('');
//   const [audioData, setAudioData] = useState('');
//   const [audioUrl, setAudioUrl] = useState('');
//   const [narration, setNarration] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const audioRef = useRef(null);
//   const narrationRef = useRef(null);

//   useEffect(() => {
//     if (audioData) {
//       const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
//       const audioUrl = URL.createObjectURL(audioBlob);
//       setAudioUrl(audioUrl);
//     }
//   }, [audioData]);

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.onplay = () => setIsPlaying(true);
//       audioRef.current.onpause = () => setIsPlaying(false);
//       audioRef.current.onended = () => setIsPlaying(false);
//     }
//   }, [audioUrl]);

//   const handleBeginJourney = () => {
//     setShowQueryInput(true);
//   };

//   const handleSendQuery = async () => {
//     if (!query.trim()) return;

//     setIsLoading(true);
//     setGeneratedImage(null);
//     setGptResponse('');
//     setStatus('');
//     setAudioData('');
//     setAudioUrl('');
//     setNarration('');

//     try {
//       const response = await axios.post(API_URL, { prompt: query }, {
//         responseType: 'text',
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       });

//       const lines = response.data.split('\n\n');
//       for (let line of lines) {
//         if (line.startsWith('data: ')) {
//           const data = JSON.parse(line.slice(6));
//           console.log('Received data:', data);
//           switch (data.type) {
//             case 'gpt':
//               setGptResponse(data.content);
//               break;
//             case 'status':
//               setStatus(data.content);
//               break;
//             case 'image':
//               setGeneratedImage(data.content);
//               setStatus('');
//               break;
//             case 'audio':
//               setAudioData(data.content);
//               break;
//             case 'narration':
//               setNarration(prev => prev + ' ' + data.content);
//               break;
//             case 'complete':
//               setIsLoading(false);
//               break;
//             case 'error':
//               setStatus('Error: ' + data.content);
//               setIsLoading(false);
//               break;
//             default:
//               break;
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setStatus('Connection error. Please try again.');
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isPlaying && narrationRef.current) {
//       const words = narration.split(' ');
//       let currentWord = 0;
//       const interval = setInterval(() => {
//         if (currentWord < words.length) {
//           narrationRef.current.textContent = words.slice(0, currentWord + 1).join(' ');
//           currentWord++;
//         } else {
//           clearInterval(interval);
//         }
//       }, audioRef.current.duration * 1000 / words.length);

//       return () => clearInterval(interval);
//     }
//   }, [isPlaying, narration]);

//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* Background GIF */}
//       <div className="absolute inset-0 w-full h-full">
//         <iframe
//           src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
//           width="100%"
//           height="100%"
//           frameBorder="0"
//           className="pointer-events-none"
//           allowFullScreen
//         ></iframe>
//       </div>

//       {/* Main content */}
//       <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
//         {!showQueryInput ? (
//           <button
//             onClick={handleBeginJourney}
//             className="px-6 py-3 text-lg font-semibold bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
//           >
//             Click to Begin Journey
//           </button>
//         ) : (
//           <div className="relative z-10 w-[70%] h-[80vh] max-w-6xl  overflow-y-auto">
//             <div className="bg-white bg-opacity-80 p-6 rounded-lg shadow-lg h-full">
//               {isLoading && !generatedImage && (
//                 <div className="mb-4 flex justify-center items-center">
//                   <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
//                 </div>
//               )}
//               {status && (
//                 <div className="mb-4 p-3 bg-yellow-100 rounded-lg">
//                   <p>{status}</p>
//                 </div>
//               )}
//               <div className="relative mb-4">
//                 {generatedImage && (
//                   <img src={generatedImage} alt="Generated" className="w-full rounded-lg h-[650px]" />
//                 )}
//                 {narration && (
//                   <div className="absolute bottom-0 w-full p-3 bg-black bg-opacity-50 text-white text-center rounded-b-lg">
//                     <p ref={narrationRef}></p>
//                   </div>
//                 )}
//               </div>
//               {audioUrl && (
//                 <audio ref={audioRef} src={audioUrl} controls autoPlay className="w-full mb-4 hidden" />
//               )}
//               <input
//                 type="text"
//                 placeholder="Enter your query here..."
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 className="w-full mb-4 text-lg p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               <button
//                 onClick={handleSendQuery}
//                 disabled={isLoading}
//                 className={`w-full py-3 text-lg font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
//               >
//                 {isLoading ? 'Generating...' : 'Generate'}
//                 {!isLoading && (
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
//                   </svg>
//                 )}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LandingPage;


























// import React, { useState, useRef, useEffect } from 'react';
// import axios from 'axios';

// const API_URL = 'http://localhost:8080/api/generate';

// const LandingPage = () => {
//   const [showQueryInput, setShowQueryInput] = useState(false);
//   const [query, setQuery] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [generatedImage, setGeneratedImage] = useState(null);
//   const [gptResponse, setGptResponse] = useState('');
//   const [status, setStatus] = useState('');
//   const [audioData, setAudioData] = useState('');
//   const [audioUrl, setAudioUrl] = useState('');
//   const [narration, setNarration] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const audioRef = useRef(null);
//   const narrationRef = useRef(null);

//   useEffect(() => {
//     if (audioData) {
//       const audioBlob = new Blob([Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
//       const audioUrl = URL.createObjectURL(audioBlob);
//       setAudioUrl(audioUrl);
//     }
//   }, [audioData]);

//   useEffect(() => {
//     if (audioRef.current) {
//       audioRef.current.onplay = () => setIsPlaying(true);
//       audioRef.current.onpause = () => setIsPlaying(false);
//       audioRef.current.onended = () => setIsPlaying(false);
//     }
//   }, [audioUrl]);

//   const handleBeginJourney = () => {
//     setShowQueryInput(true);
//   };

//   const handleSendQuery = async () => {
//     if (!query.trim()) return;

//     setIsLoading(true);
//     setGeneratedImage(null);
//     setGptResponse('');
//     setStatus('');
//     setAudioData('');
//     setAudioUrl('');
//     setNarration('');

//     try {
//       const response = await axios.post(API_URL, { prompt: query }, {
//         responseType: 'text',
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       });

//       const lines = response.data.split('\n\n');
//       for (let line of lines) {
//         if (line.startsWith('data: ')) {
//           const data = JSON.parse(line.slice(6));
//           console.log('Received data:', data);
//           switch(data.type) {
//             case 'gpt':
//               setGptResponse(data.content);
//               break;
//             case 'status':
//               setStatus(data.content);
//               break;
//             case 'image':
//               setGeneratedImage(data.content);
//               setStatus('');
//               break;
//             case 'audio':
//               setAudioData(data.content);
//               break;
//             case 'narration':
//               setNarration(prev => prev + ' ' + data.content);
//               break;
//             case 'complete':
//               setIsLoading(false);
//               break;
//             case 'error':
//               setStatus('Error: ' + data.content);
//               setIsLoading(false);
//               break;
//           }
//         }
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setStatus('Connection error. Please try again.');
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isPlaying && narrationRef.current) {
//       const words = narration.split(' ');
//       let currentWord = 0;
//       const interval = setInterval(() => {
//         if (currentWord < words.length) {
//           narrationRef.current.textContent = words.slice(0, currentWord + 1).join(' ');
//           currentWord++;
//         } else {
//           clearInterval(interval);
//         }
//       }, audioRef.current.duration * 1000 / words.length); // Adjust timing based on audio duration

//       return () => clearInterval(interval);
//     }
//   }, [isPlaying, narration]);

//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* Background GIF */}
//       <div className="absolute inset-0 w-full h-full">
//         <iframe
//           src="https://giphy.com/embed/7LlTPKOMCov3lLFW2B"
//           width="100%"
//           height="100%"
//           frameBorder="0"
//           className="pointer-events-none"
//           allowFullScreen
//         ></iframe>
//       </div>

//       {/* Main content */}
//       <div className="relative z-10 w-full h-full flex flex-col items-center justify-center ">
//         {!showQueryInput ? (
//           <button 
//             onClick={handleBeginJourney}
//             className="px-6 py-3 text-lg font-semibold bg-blue-500 text-white rounded-lg shadow-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105"
//           >
//             Click to Begin Journey
//           </button>
//         ) : (
//           <div className="w-full max-w-2xl px-4">
//             <div className="bg-white bg-opacity-80 p-6 rounded-lg shadow-lg">
//               {isLoading && !generatedImage && (
//                 <div className="mb-4 flex justify-center items-center">
//                   <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
//                 </div>
//               )}
//               {status && (
//                 <div className="mb-4 p-3 bg-yellow-100 rounded-lg">
//                   <p>{status}</p>
//                 </div>
//               )}
//               {generatedImage && (
//                 <div className="mb-4">
//                   <img src={generatedImage} alt="Generated" className="w-full rounded-lg" />
//                 </div>
//               )}
//               {narration && (
//                 <div className="mb-4 p-3 bg-gray-100 rounded-lg">
//                   <p ref={narrationRef}></p>
//                 </div>
//               )}
//               {audioUrl && (
//                 <audio ref={audioRef} src={audioUrl} controls autoPlay  className="w-full mb-4" />
//               )}
//               <input
//                 type="text"
//                 placeholder="Enter your query here..."
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 className="w-full mb-4 text-lg p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               <button 
//                 onClick={handleSendQuery}
//                 disabled={isLoading}
//                 className={`w-full py-3 text-lg font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
//               >
//                 {isLoading ? 'Generating...' : 'Generate'}
//                 {!isLoading && (
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
//                   </svg>
//                 )}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default LandingPage;










