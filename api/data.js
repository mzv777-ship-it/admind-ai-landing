export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    const { access_token, error } = await tokenRes.json();
    if (error) return res.status(401).json({ error: 'Token refresh failed: ' + error });

    const customerId = '8739154686';
    const devToken = process.env.GOOGLE_DEVELOPER_TOKEN;

    const campaignQuery = `
      SELECT campaign.id, campaign.name, campaign.status,
        metrics.impressions, metrics.clicks, metrics.cost_micros,
        metrics.conversions, metrics.ctr, metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
    `;

    const campaignRes = await fetch(
      `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'developer-token': devToken,
          'Content-Type': 'application/json',
          'login-customer-id': customerId,
        },
        body: JSON.stringify({ query: campaignQuery }),
      }
    );
    const campaignData = await campaignRes.json();

    const rows = campaignData.results || [];
    const totals = rows.reduce((acc, row) => {
      acc.impressions += Number(row.metrics?.impressions || 0);
      acc.clicks += Number(row.metrics?.clicks || 0);
      acc.cost += Number(row.metrics?.costMicros || 0) / 1_000_000;
      acc.conversions += Number(row.metrics?.conversions || 0);
      return acc;
    }, { impressions: 0, clicks: 0, cost: 0, conversions: 0 });

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : 0;
    const cpc = totals.clicks > 0 ? (totals.cost / totals.clicks).toFixed(2) : 0;

    res.json({
      totals: { ...totals, ctr, cpc },
      campaigns: rows.map(row => ({
        name: row.campaign?.name,
        status: row.campaign?.status,
        impressions: row.metrics?.impressions,
        clicks: row.metrics?.clicks,
        cost: (Number(row.metrics?.costMicros || 0) / 1_000_000).toFixed(2),
        conversions: row.metrics?.conversions,
        ctr: (Number(row.metrics?.ctr || 0) * 100).toFixed(2),
        cpc: (Number(row.metrics?.averageCpc || 0) / 1_000_000).toFixed(2),
      })),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
