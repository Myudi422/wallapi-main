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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
    };

    if (source === 'motionbg') {
        // URL for MotionBG
        const base_url = "https://motionbgs.com/latest/page/";
        const url = `${base_url}${page}`;

        try {
            const response = await axios.get(url, { headers });
            const $ = cheerio.load(response.data);
            const wallpapers = [];

            $('div.wp-block-post-template a').each((index, element) => {
                const thumbnail = $(element).find('img').attr('src');
                const title = $(element).find('h2').text().trim();
                const link = $(element).attr('href');

                if (title && link && thumbnail) {
                    wallpapers.push({ title, link, thumbnail });
                }
            });

            res.json({
                source: 'motionbg',
                page,
                wallpapers
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch data from MotionBG' });
        }

    } else if (source === 'mylivewallpaper') {
        // URL for MyLiveWallpaper
        const base_url = "https://mylivewallpapers.com/";
        const url = `${base_url}page/${page}/`;

        try {
            const response = await axios.get(url, { headers });
            const $ = cheerio.load(response.data);
            const wallpapers = [];

            $('main > div:nth-of-type(3) > div:nth-of-type(1) a').each((index, element) => {
                const link = $(element).attr('href');
                const title = link.split('/').slice(-2, -1)[0];  // Extract title from URL
                const thumbnailStyle = $(element).attr('style');
                const thumbnailMatch = thumbnailStyle ? thumbnailStyle.match(/url\((.*?)\)/) : null;
                const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null;

                if (title && link && thumbnail) {
                    wallpapers.push({ title, link, thumbnail });
                }
            });

            res.json({
                source: 'mylivewallpaper',
                page,
                wallpapers
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch data from MyLiveWallpaper' });
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
