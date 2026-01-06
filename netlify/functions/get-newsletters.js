// netlify/functions/get-newsletters.js

exports.handler = async function(event, context) {
  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
  const FOLDER_ID = process.env.MAILCHIMP_FOLDER_ID;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
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
    
    console.log('Looking for folder ID:', FOLDER_ID, 'Type:', typeof FOLDER_ID);
    
    data.campaigns.forEach((campaign, index) => {
      console.log(`Campaign ${index}:`, {
        title: campaign.settings.title || campaign.settings.subject_line,
        folder_id: campaign.settings.folder_id,
        folder_id_type: typeof campaign.settings.folder_id
      });
    });
    
    const campaignsInFolder = data.campaigns.filter(campaign => {
      const campaignFolderId = campaign.settings.folder_id;
      return campaignFolderId == FOLDER_ID || 
             campaignFolderId === FOLDER_ID || 
             String(campaignFolderId) === String(FOLDER_ID);
    });
    
    console.log('Campaigns matched:', campaignsInFolder.length);
    
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
