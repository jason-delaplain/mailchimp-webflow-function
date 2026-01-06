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
    // Fetch all sent campaigns (without folder filter in API call)
    const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns?status=sent&count=100&sort_field=send_time&sort_dir=DESC`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mailchimp API error:', response.status, errorText);
      throw new Error(`Mailchimp API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Total campaigns fetched:', data.campaigns.length);
    
    // Filter campaigns by folder ID manually
    const campaignsInFolder = data.campaigns.filter(campaign => {
      // Check if campaign has a folder and it matches our target folder
      return campaign.settings && campaign.settings.folder_id === FOLDER_ID;
    });
    
    console.log('Campaigns in target folder:', campaignsInFolder.length);
    
    // Transform the data to what we need for display
    const newsletters = campaignsInFolder.map(campaign => ({
      id: campaign.id,
      title: campaign.settings.title || campaign.settings.subject_line,
      subject: campaign.settings.subject_line,
      archiveUrl: campaign.archive_url,
      sendTime: campaign.send_time,
      thumbnailUrl: campaign.settings.preview_url || null,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ newsletters })
    };

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch newsletters',
        message: error.message 
      })
    };
  }
};
