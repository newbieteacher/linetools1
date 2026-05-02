export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    try {
        const { image } = req.body;

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': process.env.REMOVE_BG_KEY
            },
            body: new URLSearchParams({
                image_file_b64: image,
                size: 'auto'
            })
        });

        const buffer = await response.arrayBuffer();

        res.setHeader('Content-Type', 'image/png');
        res.send(Buffer.from(buffer));

    } catch (error) {
        res.status(500).json({ error: 'RemoveBG failed' });
    }
}
