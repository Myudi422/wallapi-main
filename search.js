const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { AnimeWallpaper, AnimeSource } = require("./dist"); // Sesuaikan path ini sesuai dengan lokasi anime-wallpaper.js atau library yang digunakan
const app = express();
const port = 3000;

// Inisialisasi AnimeWallpaper untuk menggunakan sumber WallHaven
const wall = new AnimeWallpaper();

/**
 * API Endpoint untuk mendapatkan gambar dari WallHaven berdasarkan judul
 * Contoh: http://localhost:3000/wallhaven?title=anime&page=2
 */
app.get('/wallhaven', async (req, res) => {
    const title = req.query.title;
    const page = parseInt(req.query.page) || 1;
    const numImages = parseInt(req.query.numImages) || 24;
    const type = req.query.type || 'both';
    const aiArt = req.query.aiArt === 'true' || false;

    if (!title) {
        return res.status(400).json({ error: "Parameter 'title' harus disertakan." });
    }

    try {
        // Pencarian gambar dari WallHaven dengan judul tertentu
        const wallpapers = await wall.search({ title, page, type, aiArt }, AnimeSource.WallHaven);

        // Tentukan apakah masih ada halaman berikutnya
        const hasNextPage = wallpapers.length > numImages;

        // Format hasil pencarian menjadi JSON
        const result = wallpapers.slice(0, numImages).map(img => ({
            thumbnail: img.thumbnail || null,
            full: img.image || null,
        }));

        if (result.length === 0) {
            return res.status(404).json({ message: 'Gambar tidak ditemukan' });
        }

        // Kirim hasil sebagai respon, dengan informasi halaman selanjutnya
        res.json({
            images: result,
            nextPage: hasNextPage ? page + 1 : null // Jika ada halaman berikutnya, berikan nomor halaman
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat pencarian gambar.' });
    }
});



// Endpoint `/latest` untuk mendapatkan wallpaper terbaru
@app.route('/latest', methods=['GET'])
def latest():
    source = request.args.get('source')  # 'motionbg' atau 'mylivewallpaper'
    page = request.args.get('page', '1')  # Default ke halaman 1 jika tidak ada parameter page
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
    }

    if source == 'motionbg':
        # URL untuk MotionBG
        base_url = "https://motionbgs.com/latest/page/"
        url = f"{base_url}{page}"
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch data from MotionBG"}), 500

        soup = BeautifulSoup(response.content, 'html.parser')
        wallpapers = []

        # Menemukan container wallpaper
        container = soup.select_one('div.wp-block-post-template')
        if not container:
            return jsonify({"error": "No wallpapers found on MotionBG"}), 404

        # Mengekstrak data wallpaper
        for item in container.find_all('a', href=True):
            thumbnail = item.find('img')['src'] if item.find('img') else None
            title = item.find('h2').text.strip() if item.find('h2') else None
            link = item['href']

            if title and link and thumbnail:
                wallpapers.append({
                    "title": title,
                    "link": link,
                    "thumbnail": thumbnail
                })

        return jsonify({
            "source": "motionbg",
            "page": page,
            "wallpapers": wallpapers
        })

    elif source == 'mylivewallpaper':
        # URL untuk MyLiveWallpaper
        base_url = "https://mylivewallpapers.com/"
        url = f"{base_url}page/{page}/"
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch data from MyLiveWallpaper"}), 500

        soup = BeautifulSoup(response.content, 'html.parser')
        wallpapers = []

        # Menemukan container wallpaper
        container = soup.select_one('main > div:nth-of-type(3) > div:nth-of-type(1)')
        if not container:
            return jsonify({"error": "No wallpapers found on MyLiveWallpaper"}), 404

        # Mengekstrak data wallpaper
        for item in container.find_all('a', href=True):
            link = item['href']
            title = link.split('/')[-2]  # Mengambil bagian terakhir dari URL sebagai judul
            thumbnail_style = item.get('style', '')

            # Mengambil URL thumbnail dari atribut style
            thumbnail_start = thumbnail_style.find('url(') + 4
            thumbnail_end = thumbnail_style.find(')', thumbnail_start)
            thumbnail = thumbnail_style[thumbnail_start:thumbnail_end].strip()

            if title and link and thumbnail:
                wallpapers.append({
                    "title": title,
                    "link": link,
                    "thumbnail": thumbnail
                })

        return jsonify({
            "source": "mylivewallpaper",
            "page": page,
            "wallpapers": wallpapers
        })

    else:
        return jsonify({"error": "Invalid source parameter"}), 400



app.get('/detail', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "URL parameter is required" });
    }

    // Header User-Agent
    const headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36"
    };

    try {
        // Permintaan HTTP ke URL
        const response = await axios.get(url, { headers });

        if (response.status !== 200) {
            return res.status(500).json({ error: "Failed to fetch data from the website" });
        }

        // Parsing HTML dengan Cheerio
        const $ = cheerio.load(response.data);

        // Ekstrak judul
        const titleElement = $('h1 span');
        const title = titleElement.length ? titleElement.text().trim() : null;

        // Ekstrak link video wallpaper
        const videoWallpaperElement = $('a[rel="nofollow"][target="_blank"]');
        const videoWallpaper = videoWallpaperElement.length 
            ? `https://motionbgs.com${videoWallpaperElement.attr('href')}` 
            : null;

        // Ekstrak link preview video
        const previewElement = $('video source');
        const previewVideo = previewElement.length 
            ? `https://motionbgs.com${previewElement.attr('src')}` 
            : null;

        // Pastikan semua detail berhasil diekstrak
        if (!title || !videoWallpaper || !previewVideo) {
            return res.status(500).json({ error: "Failed to extract necessary details" });
        }

        // Kirim hasil sebagai JSON
        res.json({
            title,
            video_wallpaper: videoWallpaper,
            preview_video: previewVideo
        });
    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ error: "Terjadi kesalahan saat mengambil data dari website." });
    }
});




/**
 * API Endpoint untuk mendapatkan gambar secara acak dari WallHaven
 * Contoh: http://localhost:3000/homepage
 */
app.get('/homepage', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const numImages = parseInt(req.query.numImages) || 24;
    const aiArt = req.query.aiArt === 'true' || false;

    try {
        // Mengambil gambar dari WallHaven secara acak
        const wallpapers = await wall.scrapeFromWallHaven({
            title: "", // Kosongkan untuk mendapatkan gambar acak
            page: page,
            type: "both", // Bisa diganti dengan 'anime' atau 'general'
            aiArt: aiArt
        });

        // Tentukan apakah masih ada halaman berikutnya
        const hasNextPage = wallpapers.length > numImages;

        // Format hasil pencarian menjadi JSON
        const result = wallpapers.slice(0, numImages).map(img => ({
            thumbnail: img.thumbnail || null,
            full: img.image || null,
        }));

        if (result.length === 0) {
            return res.status(404).json({ message: 'Gambar tidak ditemukan' });
        }

        // Kirim hasil sebagai respon, dengan informasi halaman selanjutnya
        res.json({
            images: result,
            nextPage: hasNextPage ? page + 1 : null // Jika ada halaman berikutnya, berikan nomor halaman
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil gambar acak.' });
    }
});

// Jalankan server di port 3000
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
