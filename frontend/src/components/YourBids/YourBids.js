import React, { useState, useEffect } from "react";
import axios from "axios";
import{ jwtDecode } from "jwt-decode"; // Correct import for jwt-decode
import "./YourBids.css";

const YourBidsPage = () => {
  const [bids, setBids] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch the token from localStorage
    const token = localStorage.getItem("token");

    if (!token) {
      setError("Token is missing. Please log in again.");
      return;
    }

    let buyerId;
    try {
      // Decode token to get buyerId
      const decodedToken = jwtDecode(token);
      console.log(decodedToken)
      buyerId = decodedToken.userId; // Ensure this matches the key in your JWT payload
    } catch (err) {
      setError("Failed to decode token. Please log in again.");
      return;
    }

    if (!buyerId) {
      setError("Buyer ID is missing in the token. Please log in again.");
      return;
    }

    const fetchBids = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/bids/your-bids/${buyerId}`, // Adjusted URL to match backend route
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log("Response Data: ", response.data);
        setBids(response.data); // Set fetched bids
      } catch (error) {
        setError(
          error.response?.data?.message || "Failed to fetch bids. Try again later."
        );
      }
    };

    fetchBids();
  }, []); // Empty dependency array ensures it only runs once

  return (
    <div className="your-bids-page">
      <h1>Your Bids</h1>

      {error && <div className="error-message">{error}</div>}

      {!error && bids.length === 0 && (
        <div className="no-bids-message">You have not placed any bids yet.</div>
      )}

      <div className="bids-container">
        {bids.map((bid) => (
          <div key={bid.bidId} className="bid-card">
            <h3>{bid.productName}</h3>
            {/* <p>{bid.productDescription}</p> */}
            <p>
              <strong>Bid Amount:</strong> ₹{bid.bidAmount}
            </p>
            <p>
              <strong>Status:</strong> {bid.status}
            </p>
            <p>
              <strong>Winning Bid:</strong> {bid.isWinningBid ? "Yes" : "No"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default YourBidsPage;
