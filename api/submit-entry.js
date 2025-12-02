// api/submit-entry.js
import { google } from "googleapis";

// CORS headers helper
function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
}

export default async function handler(req, res) {
  // Enable CORS
  setCorsHeaders(res);

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Received data:", req.body);

    // Load environment variables
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
    const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!GOOGLE_PRIVATE_KEY || !GOOGLE_CLIENT_EMAIL || !GOOGLE_SHEET_ID) {
      throw new Error("Missing Google Sheets environment variables");
    }

    // Parse submitted entry
    const entry = req.body;

    // Add timestamp + convert values
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,
      entry.description || "",
      entry.user || "",
      entry.dept || "",
      entry.function || "",
      entry.costCentre || "",
      parseFloat(entry.mprValue) || 0,
      parseFloat(entry.poValue) || 0,
      entry.isPoReleased ? "Yes" : "No",
      entry.isMaterialReceived ? "Yes" : "No",
      entry.materialDate || "",
      entry.remarks || "",
      entry.addedBy || "Unknown",
    ];

    // Authenticate service account
    const auth = new google.auth.JWT(
      GOOGLE_CLIENT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    const sheets = google.sheets({ version: "v4", auth });

    // Write to Google Sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A:M",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [rowData],
      },
    });

    console.log("Saved to Google Sheets:", response.data);

    // Success response
    return res.status(200).json({
      success: true,
      message: "Entry saved to Google Sheets",
      rowNumber: response.data.updates?.updatedRange || null,
    });
  } catch (error) {
    console.error("Error saving to Google Sheets:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to save data to Google Sheets",
    });
  }
}
