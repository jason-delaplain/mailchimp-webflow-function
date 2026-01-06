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
    
    const campaignsInFolder = data.campaigns.filter(campaign => {
      return campaign.settings.folder_id === FOLDER_ID;
    });
    
    // Fetch content for each campaign to get first image
    const newslettersWithImages = await Promise.all(
      campaignsInFolder.map(async (campaign) => {
        let thumbnailUrl = null;
        
        try {
          // Fetch campaign content
          const contentResponse = await fetch(
            `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaign.id}/content`,
            {
              headers: {
                'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            const html = contentData.html || '';
            
            // Extract first image URL from HTML
            const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch && imgMatch[1]) {
              thumbnailUrl = imgMatch[1];
            }
          }
        } catch (error) {
          console.error(`Failed to fetch content for campaign ${campaign.id}:`, error);
        }
        
        return {
          id: campaign.id,
          title: campaign.settings.title || campaign.settings.subject_line,
          subject: campaign.settings.subject_line,
          archiveUrl: campaign.archive_url,
          sendTime: campaign.send_time,
          thumbnailUrl: thumbnailUrl
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ newsletters: newslettersWithImages })
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
