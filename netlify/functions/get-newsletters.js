// netlify/functions/get-newsletters.js

exports.handler = async function(event, context) {
  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX; // e.g., 'us19'
  const FOLDER_ID = process.env.MAILCHIMP_FOLDER_ID; // Your newsletters folder ID
  
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
    // Fetch campaigns from the specific folder
    const response = await fetch(
      `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns?status=sent&folder_id=${FOLDER_ID}&count=20&sort_field=send_time&sort_dir=DESC`,
      {
        headers: {
          'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Mailchimp API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data to what we need for display
    const newsletters = data.campaigns.map(campaign => ({
      id: campaign.id,
      title: campaign.settings.title || campaign.settings.subject_line,
      subject: campaign.settings.subject_line,
      archiveUrl: campaign.archive_url,
      sendTime: campaign.send_time,
      thumbnailUrl: campaign.settings.preview_url || null,
      // Mailchimp doesn't provide direct thumbnails, so we'll need to handle this differently
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
      body: JSON.stringify({ error: 'Failed to fetch newsletters' })
    };
  }
};
