// netlify/functions/get-newsletters.js

exports.handler = async function(event, context) {
  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
  const FOLDER_ID = process.env.MAILCHIMP_FOLDER_ID;
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Fetch all sent campaigns
    const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns?status=sent&count=100&sort_field=send_time&sort_dir=DESC`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Mailchimp API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the folder IDs we're seeing
    console.log('Looking for folder ID:', FOLDER_ID, 'Type:', typeof FOLDER_ID);
    
    data.campaigns.forEach((campaign, index) => {
      console.log(`Campaign ${index}:`, {
        title: campaign.settings.title || campaign.settings.subject_line,
        folder_id: campaign.settings.folder_id,
        folder_id_type: typeof campaign.settings.folder_id
      });
    });
    
    // Try both string and number comparison
    const campaignsInFolder = data.campaigns.filter(campaign => {
      const campaignFolderId = campaign.settings.folder_id;
      return campaignFolderId == FOLDER_ID || // Loose comparison
             campaignFolderId === FOLDER_ID || // Strict comparison
             String(campaignFolderId) === String(FOLDER_ID); // String comparison
    });
    
    console.log('Campaigns matched:', campaignsInFolder.length);
    
    // Transform the data
    const newsletters = campaignsInFolder.map(campaign => ({
      id: campaign.id,
      title: campaign.settings.title || campaign.settings.subject_line,
      subject: campaign.settings.subject_line,
      archiveUrl: campaign.archive_url,
      sendTime: campaign.send_time,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ newsletters })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
