// netlify/functions/get-newsletters.js

exports.handler = async function(event, context) {
  const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
  const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;
  const FOLDER_ID = process.env.MAILCHIMP_FOLDER_ID;
  
  // Images to skip (logo, spacers, etc.)
  const SKIP_IMAGES = [
    'https://mcusercontent.com/147f3bacaff61bd7b5f703d60/images/afceb223-5180-5a16-c5ef-d67cbb77e779.jpg'
  ];
  
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
    
    const newslettersWithImages = await Promise.all(
      campaignsInFolder.map(async (campaign) => {
        let thumbnailUrl = null;
        const title = campaign.settings.title || campaign.settings.subject_line;
        
        try {
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
            
            const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
            let match;
            const allImages = [];
            
            while ((match = imgRegex.exec(html)) !== null) {
              allImages.push(match[1]);
            }
            
            // Debug for the specific newsletter
            if (title.includes('1 Big Thing')) {
              console.log('=== DEBUG: 1 Big Thing newsletter ===');
              console.log('Total images found:', allImages.length);
              console.log('All images:', allImages);
              console.log('First non-skipped image:', allImages.find(img => !SKIP_IMAGES.includes(img)));
            }
            
            thumbnailUrl = allImages.find(img => !SKIP_IMAGES.includes(img)) || null;
          }
        } catch (error) {
          console.error(`Error fetching content for campaign ${campaign.id}:`, error.message);
        }
        
        return {
          id: campaign.id,
          title: title,
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
