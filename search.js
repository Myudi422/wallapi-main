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




app.get('/latest', async (req, res) => {
    const source = req.query.source;  // 'motionbg' or 'mylivewallpaper'
    const page = req.query.page || '1';  // Default to page 1 if no page is specified
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    };

    if (source === 'motionbg') {
        const baseUrl = "https://motionbgs.com/mobile/";
        const url = `${baseUrl}${page}/`;

        try {
            // Send HTTP request to MotionBG URL
            const response = await axios.get(url, { headers });

            if (response.status !== 200) {
                return res.status(500).json({ error: "Failed to fetch data from MotionBG" });
            }

            // Parse HTML with Cheerio
            const $ = cheerio.load(response.data);
            const wallpapers = [];

            // Debugging: Log the HTML to inspect the page structure
            console.log(response.data);  // This will help inspect the raw HTML response

            // Get container for wallpapers (adjust selector if necessary)
            const container = $('div.tmb.mtmb');
            if (!container.length) {
                return res.status(404).json({ error: "No wallpapers found on MotionBG" });
            }

            // Extract individual wallpaper items
            container.find('a[href]').each((_, element) => {
                const title = $(element).attr('title');
                const link = `https://motionbgs.com${$(element).attr('href')}`;
                const thumbnailTag = $(element).find('img');
                const thumbnail = thumbnailTag.length ? `https://motionbgs.com${thumbnailTag.attr('src')}` : null;

                if (title && link && thumbnail) {
                    wallpapers.push({
                        title,
                        link,
                        thumbnail
                    });
                }
            });

            return res.json({
                source: 'motionbg',
                page,
                wallpapers
            });
        } catch (error) {
            console.error('Error:', error.message);
            return res.status(500).json({ error: "There was an error fetching data from MotionBG." });
        }
    } else if (source === 'mylivewallpaper') {
        const baseUrl = "https://mylivewallpapers.com/";
        const url = `${baseUrl}page/${page}/`;

        try {
            // Send HTTP request to MyLiveWallpaper URL
            const response = await axios.get(url, { headers });

            if (response.status !== 200) {
                return res.status(500).json({ error: "Failed to fetch data from MyLiveWallpaper" });
            }

            // Parse HTML with Cheerio
            const $ = cheerio.load(response.data);
            const wallpapers = [];

            // Get container for wallpapers
            const container = $('main > div:nth-of-type(3) > div:nth-of-type(1)');
            if (!container.length) {
                return res.status(404).json({ error: "No wallpapers found on MyLiveWallpaper" });
            }

            // Extract individual wallpaper items
            container.find('a[href]').each((_, element) => {
                const title = link.split('/')[link.split('/').length - 2];  // Taking the second-to-last part of the URL as the title
                const link = $(element).attr('href');
                const thumbnailStyle = $(element).attr('style');
                const thumbnail = thumbnailStyle ? thumbnailStyle.match(/url\((.*?)\)/)[1] : null;

                if (title && link && thumbnail) {
                    wallpapers.push({
                        title,
                        link,
                        thumbnail
                    });
                }
            });

            return res.json({
                source: 'mylivewallpaper',
                page,
                wallpapers
            });
        } catch (error) {
            console.error('Error:', error.message);
            return res.status(500).json({ error: "There was an error fetching data from MyLiveWallpaper." });
        }
    } else {
        res.status(400).json({ error: 'Invalid source parameter' });
    }
});


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
