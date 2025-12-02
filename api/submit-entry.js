// api/submit-entry.js
const { google } = require('googleapis');

// CORS headers helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
}

export default async function handler(req, res) {
  // Set CORS headers
  setCorsHeaders(res);
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Received data:', req.body);
    
    // 1. Get environment variables
    const {
      GOOGLE_PRIVATE_KEY,
      GOOGLE_CLIENT_EMAIL,
      GOOGLE_SHEET_ID
    } = process.env;
    
    if (!GOOGLE_PRIVATE_KEY || !GOOGLE_CLIENT_EMAIL || !GOOGLE_SHEET_ID) {
      throw new Error('Missing Google Sheets configuration');
    }
    
    // 2. Parse the request body
    const entry = req.body;
    
    // 3. Prepare data for Google Sheets
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,
      entry.description || '',
      entry.user || '',
      entry.dept || '',
      entry.function || '',
      entry.costCentre || '',
      parseFloat(entry.mprValue) || 0,
      parseFloat(entry.poValue) || 0,
      entry.isPoReleased ? 'Yes' : 'No',
      entry.isMaterialReceived ? 'Yes' : 'No',
      entry.materialDate || '',
      entry.remarks || '',
      entry.addedBy || 'Unknown'
    ];
    
    // 4. Authenticate with Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: 'capex-tracker',
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: GOOGLE_CLIENT_EMAIL,
        client_id: ''
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 5. Append to Google Sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A:M', // Adjust if your sheet has different columns
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });
    
    console.log('Successfully saved to Google Sheets:', response.data);
    
    // 6. Return success response
    res.status(200).json({ 
      success: true, 
      message: 'Entry saved to Google Sheets',
      rowNumber: response.data.updates.updatedRange
    });
    
  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Failed to save data to Google Sheets'
    });
  }
}