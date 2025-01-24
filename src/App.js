import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; // Use Routes instead of Switch
import io from "socket.io-client";
import Login from "./pages/Login"; // Adjusted import path based on file location
import Signup from "./pages/SignUp"; // Assuming you have Signup component
import "./styles.css";

// Chat interface component
const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const socket = io("http://localhost:1337");

  // Fetch previous messages from the backend
  const fetchMessages = async () => {
    try {
      const response = await fetch("http://localhost:1337/api/chat-messages", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      const data = await response.json();
      const user = JSON.parse(localStorage.getItem("user"));

  
      if (data && data.data) {
        const formattedMessages = data.data.map((item) => ({
          sender: user,
          text: item.message,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Listen for new messages from the server
  useEffect(() => {
    socket.on("message", (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: data.sender || "Server", text: data.text },
      ]);
    });
    
  
    return () => {
      socket.off("message");
    };
  }, [socket]);
  

  const handleSendMessage = async () => {
    if (message.trim()) {
      try {
        // Retrieve user and token from localStorage
        const user = JSON.parse(localStorage.getItem("user")); // Stored as a JSON object
        const token = localStorage.getItem("token");
  
        if (!user || !token) {
          alert("You are not logged in. Please log in to send messages.");
          return;
        }
  
        const username = user; // Extract username from user object
  
        // Send message to the WebSocket server
        socket.emit("message", { username, text: message, token });
        console.log("message sent to backend server");
  
        // Save the message to the backend
        const response = await fetch("http://localhost:1337/api/chat-messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Pass the token in the Authorization header
          },
          body: JSON.stringify({
            data: {
              // "username": username, // Include username
              "message": message,  // The message text
            },
          }),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to save message:", errorData);
          alert("Failed to send the message. Please try again.");
          return;
        }
  
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: username, text: message },
        ]);
        setMessage(""); // Clear the input box
      } catch (error) {
        console.error("An error occurred:", error);
        alert("An unexpected error occurred while sending the message.");
      }
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-box">
        <div className="messages">
          {messages.map((msg, index) => {
            const currentUser = JSON.parse(localStorage.getItem("user"));
            return (
              <div key={index} className={`message ${msg.sender === currentUser ? "sent" : "received"}`}>
                <strong>{msg.sender}: </strong> {msg.text}
              </div>
            );
          })}
        </div>
        <div className="input-area">
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button onClick={handleSendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

// Main App component with routing
const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");


  return (
    <Router>
      <Routes>
        {/* Protect the chat route by checking if the user is logged in */}
        <Route
          path="/chat"
          element={token ? <Chat /> : <Navigate to="/login" />}
        />
        
        {/* Login route */}
        <Route
          path="/login"
          element={!token ? <Login setToken={setToken} /> : <Navigate to="/chat" />}
        />
        
        {/* Signup route */}
        <Route path="/signup" element={<Signup />} />

        {/* Default route: Navigate to login if no route matches */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default App;
