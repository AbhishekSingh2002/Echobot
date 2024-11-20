import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [database, setDatabase] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const userInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const dbRef = useRef(database)

  useEffect(() => { dbRef.current = database })

  // Fetch CSV data and parse it
  useEffect(() => {
    fetch('/dataset.csv')
      .then((response) => response.text())
      .then((csvData) => {
        Papa.parse(csvData, {
          header: false,
          skipEmptyLines: true,
          complete: (result) => {
            setDatabase(result.data); // Updated database with parsed data
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

      // Set up event listeners for recognition events
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech Input Detected:', transcript); // Debugging: log the detected speech
        // userInputRef.current.value = transcript;
        console.log(transcript)
        sendMessage(transcript); // Send recognized speech as a message
      };

      recognitionRef.current = recognition;
    } else {
      console.error('Speech Recognition is not supported in this browser.');
    }

    // Cleanup the speech recognition on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Start listening for voice input
  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('Speech recognition started'); // Debugging: log when speech recognition starts
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    } else {
      alert('Your browser does not support speech recognition.');
    }
  };

  // Stop listening for voice input
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Function to send message (either from typing or voice input)
  const sendMessage = (userInput) => {
    const inputText = userInput.trim().toLowerCase(); // Trim and lowercase user input
  
    if (!inputText) {
      alert('Please enter a message!');
      return;
    }
  
    console.log('User input:', inputText); // Debugging: log the user input
  
    // Update message state with user message
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: 'user', text: inputText },
    ]);

  
    // Check if user input matches any entry in the database
    const matchedResponse = dbRef.current.find((entry) => {
      // Normalize both input and CSV entry
      const databaseQuery = entry[0].trim().toLowerCase();
      return databaseQuery.includes(inputText);
    });
  
    // If match found, send bot response, otherwise send default response
    if (matchedResponse) {
      console.log('Bot response:', matchedResponse[1]); // Debugging: log the bot's response
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', text: matchedResponse[1] },
      ]);
    } else {
      console.log("No match found in database, sending default response"); // Debugging: log if no match is found
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: 'bot', text: "I'm sorry, I don't have an answer for that." },
      ]);
    }
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
        <button onClick={() => sendMessage(userInputRef.current.value)}>Send</button>
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
