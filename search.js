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
    const source = req.query.source;  // 'motionbg' atau 'mylivewallpaper'
    const page = req.query.page || '1';  // Default halaman 1 jika tidak ada parameter
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    };

    if (source === 'motionbg') {
        const baseUrl = "https://motionbgs.com/mobile/";
        const url = `${baseUrl}${page}/`;

        try {
            // Kirim permintaan HTTP ke URL MotionBG
            const response = await axios.get(url, { headers });

            if (response.status !== 200) {
                return res.status(500).json({ error: "Gagal mengambil data dari MotionBG" });
            }

            // Parsing HTML dengan Cheerio
            const $ = cheerio.load(response.data);
            const wallpapers = [];

            // Ambil container untuk wallpaper (sesuaikan selector jika perlu)
            const container = $('div.tmb.mtmb');
            if (!container.length) {
                return res.status(404).json({ error: "Tidak ditemukan wallpaper di MotionBG" });
            }

            // Ekstrak item wallpaper
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
            return res.status(500).json({ error: "Terjadi kesalahan saat mengambil data dari MotionBG." });
        }
    } else if (source === 'mylivewallpaper') {
        const baseUrl = "https://mylivewallpapers.com/";
        const url = `${baseUrl}page/${page}/`;

        try {
            // Kirim permintaan HTTP ke URL MyLiveWallpaper
            const response = await axios.get(url, { headers });

            if (response.status !== 200) {
                return res.status(500).json({ error: "Gagal mengambil data dari MyLiveWallpaper" });
            }

            // Parsing HTML dengan Cheerio
            const $ = cheerio.load(response.data);
            const wallpapers = [];

            // Ambil container untuk wallpaper
            const container = $('main > div:nth-of-type(3) > div:nth-of-type(1)');
            if (!container.length) {
                return res.status(404).json({ error: "Tidak ditemukan wallpaper di MyLiveWallpaper" });
            }

            // Ekstrak item wallpaper
            container.find('a[href]').each((_, element) => {
                const link = $(element).attr('href');
                const title = link.split('/')[link.split('/').length - 2];  // Ambil title dari URL
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
            return res.status(500).json({ error: "Terjadi kesalahan saat mengambil data dari MyLiveWallpaper." });
        }
    } else {
        res.status(400).json({ error: 'Parameter sumber tidak valid' });
    }
});



// Fungsi untuk mengambil detail dari MotionBG
async function getMotionBGDetails(url) {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G975F Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36"
    };

    const response = await axios.get(url, { headers });
    if (response.status !== 200) {
        throw new Error("Gagal mengambil data dari MotionBG");
    }

    const $ = cheerio.load(response.data);

    // Extract title
    const title = $('h1 span').text().trim();
    // Extract video wallpaper link
    const videoWallpaperElement = $('a[rel="nofollow"][target="_blank"]');
    const videoWallpaper = videoWallpaperElement.length ? `https://motionbgs.com${videoWallpaperElement.attr('href')}` : null;
    // Extract preview video link
    const previewElement = $('video source');
    const previewVideo = previewElement.length ? `https://motionbgs.com${previewElement.attr('src')}` : null;

    if (!title || !videoWallpaper || !previewVideo) {
        throw new Error("Gagal mengambil detail yang diperlukan dari MotionBG");
    }

    return {
        title,
        video_wallpaper: videoWallpaper,
        preview_video: previewVideo
    };
}

// Fungsi untuk mengambil detail dari MyLiveWallpaper
async function getMyLiveWallpaperDetails(url) {
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
    };

    const response = await axios.get(url, { headers });
    if (response.status !== 200) {
        throw new Error("Gagal mengambil data dari MyLiveWallpaper");
    }

    const $ = cheerio.load(response.data);

    // Extract title
    const title = $('main > div:nth-of-type(3) > div:nth-of-type(2) > div > div:nth-of-type(2) > h1').text().trim();
    // Extract video wallpaper link from mobile section
    const mobileSection = $('img[src="https://mylivewallpapers.com/wp-content/uploads/site-essentials/ico-mobile-blue.png"]');
    let videoWallpaper = null;
    if (mobileSection.length) {
        const videoElement = mobileSection.next('a.wpdm-download-link');
        videoWallpaper = videoElement.length ? videoElement.attr('data-downloadurl') : null;
    }
    // Extract preview video link (video tag for preview)
    const previewElement = $('video source');
    const previewVideo = previewElement.length ? previewElement.attr('src') : null;

    if (!title || !videoWallpaper || !previewVideo) {
        throw new Error("Gagal mengambil detail yang diperlukan dari MyLiveWallpaper");
    }

    return {
        title,
        video_wallpaper: videoWallpaper,
        preview_video: previewVideo
    };
}

// Endpoint /detail untuk menangani dua sumber
app.get('/detail', async (req, res) => {
    const url = req.query.url;
    const source = req.query.source;

    if (!url || !source) {
        return res.status(400).json({ error: "URL dan source parameter diperlukan" });
    }

    try {
        let data;

        // Pilih fungsi berdasarkan sumber
        if (source === 'motionbg') {
            data = await getMotionBGDetails(url);
        } else if (source === 'mylivewallpaper') {
            data = await getMyLiveWallpaperDetails(url);
        } else {
            return res.status(400).json({ error: "Sumber tidak valid, pilih antara 'motionbg' atau 'mylivewallpaper'" });
        }

        return res.json(data);

    } catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ error: error.message });
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
