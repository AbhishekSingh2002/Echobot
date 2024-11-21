import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [database, setDatabase] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [context, setContext] = useState(null); // Track context (e.g., last topic or question)
  const userInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const dbRef = useRef(database);

  useEffect(() => {
    dbRef.current = database;
  });

  // Fetch CSV data and parse it
  useEffect(() => {
    fetch('/dataset.csv')
      .then((response) => response.text())
      .then((csvData) => {
        Papa.parse(csvData, {
          header: false,
          skipEmptyLines: true,
          complete: (result) => {
            setDatabase(result.data); // Update database with parsed data
          },
        });
      })
      .catch((error) => console.error('Error loading CSV file:', error));
  }, []);

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech Input Detected:', transcript);
        sendMessage(transcript);
      };

      recognitionRef.current = recognition;
    } else {
      console.error('Speech Recognition is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    } else {
      alert('Your browser does not support speech recognition.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Tokenize input string
  const tokenize = (input) => {
    return input.trim().toLowerCase().split(/\s+/); // Splits by whitespace
  };

  // Function to check if tokenized input matches any entry in the dataset
  const matchInputWithDatabase = (tokens) => {
    for (const entry of dbRef.current) {
      const databaseTokens = tokenize(entry[0]); // Tokenize the database query
      if (tokens.some((token) => databaseTokens.includes(token))) {
        return entry[1]; // Return the matched response
      }
    }
    return null; // No match found
  };

  // Function to handle context-based response
  const handleContextBasedResponse = (userInput) => {
    if (context) {
      if (context === 'weather' && userInput.includes('temperature')) {
        return "I can give you the temperature. Please specify the city.";
      }
      // Add more context-based responses as needed
    }
    return null;
  };

  // Function to send a message (either from typing or voice input)
  const sendMessage = (userInput) => {
    const inputText = userInput.trim();
    if (!inputText) {
      alert('Please enter a message!');
      return;
    }

    const tokens = tokenize(inputText); // Tokenize the user input
    const contextResponse = handleContextBasedResponse(inputText); // Check for context-based response

    let botResponse;
    if (contextResponse) {
      botResponse = contextResponse; // Contextual response found
    } else {
      botResponse = matchInputWithDatabase(tokens); // Otherwise, look for a match in the database
    }

    // Add user message
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', text: inputText },
    ]);

    // Update context based on user input (e.g., set context to "weather" if user asks about weather)
    if (inputText.toLowerCase().includes('weather')) {
      setContext('weather');
    } else if (inputText.toLowerCase().includes('temperature')) {
      setContext('temperature');
    } else {
      setContext(null); // Reset context if no specific context is found
    }

    // Add bot response
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        sender: 'bot',
        text: botResponse || "I'm sorry, I don't have an answer for that.",
      },
    ]);
  };

  return (
    <div id="chat-container">
      <div id="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sender === 'user' ? 'user-message' : 'bot-message'}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          id="user-input"
          ref={userInputRef}
          placeholder="Type your message..."
        />
        <button onClick={() => sendMessage(userInputRef.current.value)}>
          Send
        </button>
        <button
          id="audio-btn"
          onClick={isListening ? stopListening : startListening}
          style={{
            backgroundColor: isListening ? '#ff4d4d' : '#4caf50',
            color: 'white',
          }}
        >
          🎤
        </button>
      </div>
    </div>
  );
};

export default App;