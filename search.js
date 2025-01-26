const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { AnimeWallpaper, AnimeSource } = require("./dist"); // Sesuaikan path ini sesuai dengan lokasi anime-wallpaper.js atau library yang digunakan
const app = express();
const port = 3000;
const cors = require('cors'); // Import middleware cors


app.use(cors());

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


app.get('/kategori', async (req, res) => {
    const base_url = "https://mylivewallpapers.com/category/";
    const category = req.query.category || "anime"; // Default to 'anime' if no category is specified
    const page = req.query.page || "1"; // Default to page 1 if no page is specified
    const url = `${base_url}${category}/page/${page}/`;

    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
    };

    try {
        const response = await axios.get(url, { headers });
        const html = response.data;
        const $ = cheerio.load(html);

        const wallpapers = [];

        // Get the container with wallpapers
        const container = $('main > div:nth-of-type(3) > div:nth-of-type(1)');
        if (!container.length) {
            return res.status(404).json({ error: "No wallpapers found on the page" });
        }

        // Extract individual wallpaper items
        container.find('a[href]').each((index, element) => {
            const link = $(element).attr('href');
            const title = link.split('/').slice(-2, -1)[0]; // Extract the second-to-last part of the path as title
            const thumbnailStyle = $(element).attr('style') || "";

            // Extract thumbnail URL from style attribute
            const thumbnailStart = thumbnailStyle.indexOf('url(') + 4;
            const thumbnailEnd = thumbnailStyle.indexOf(')', thumbnailStart);
            const thumbnail = thumbnailStyle.substring(thumbnailStart, thumbnailEnd).trim();

            if (title && link && thumbnail) {
                wallpapers.push({
                    title,
                    link,
                    thumbnail
                });
            }
        });

        return res.json({
            category,
            page,
            wallpapers
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        return res.status(500).json({ error: "Failed to fetch data from the website" });
    }
});

// Endpoint untuk pencarian
app.get('/search', async (req, res) => {
    const baseUrl = "https://mylivewallpapers.com/";
    const query = req.query.query; // Ambil parameter query dari request
    const page = req.query.page || '1'; // Default ke halaman 1 jika tidak ada parameter page

    if (!query) {
        return res.status(400).json({ error: "Parameter query diperlukan" });
    }

    // Buat URL pencarian
    const searchUrl = `${baseUrl}page/${page}/?s=${encodeURIComponent(query)}&search_category=all_except_specific`;

    try {
        const { data } = await axios.get(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
            }
        });

        const $ = cheerio.load(data);
        const wallpapers = [];

        // Cari container utama yang berisi wallpaper
        const container = $('body > main > div:nth-of-type(3) > div:nth-of-type(1)');
        if (!container.length) {
            return res.status(404).json({ error: "Tidak ada wallpaper ditemukan di halaman ini" });
        }

        // Ekstrak data setiap item wallpaper
        container.find('a[href]').each((_, element) => {
            const link = $(element).attr('href');
            const title = $(element).find('h2.archive-post-title').text().trim();
            const thumbnailStyle = $(element).attr('style') || '';
            const thumbnailStart = thumbnailStyle.indexOf('url(') + 4;
            const thumbnailEnd = thumbnailStyle.indexOf(')', thumbnailStart);
            const thumbnail = thumbnailStyle.substring(thumbnailStart, thumbnailEnd).trim();

            if (title && link && thumbnail) {
                wallpapers.push({
                    title,
                    link,
                    thumbnail
                });
            }
        });

        // Kirim respons JSON
        res.json({
            page,
            query,
            wallpapers
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: "Gagal mengambil data dari situs web" });
    }
});

app.get('/random', async (req, res) => {
    const sources = ['motionbg', 'mylivewallpaper'];
    const randomSource = sources[Math.floor(Math.random() * sources.length)]; // Pilih sumber secara acak
    const randomPage = Math.floor(Math.random() * 10) + 1; // Pilih halaman acak (1-10)
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    };

    if (randomSource === 'motionbg') {
        const baseUrl = "https://motionbgs.com/mobile/";
        const url = `${baseUrl}${randomPage}/`;

        try {
            const response = await axios.get(url, { headers });

            if (response.status !== 200) {
                return res.status(500).json({ error: "Gagal mengambil data dari MotionBG" });
            }

            const $ = cheerio.load(response.data);
            const wallpapers = [];
            const container = $('div.tmb.mtmb');

            if (!container.length) {
                return res.status(404).json({ error: "Tidak ditemukan wallpaper di MotionBG" });
            }

            container.find('a[href]').each((_, element) => {
                const title = $(element).attr('title');
                const link = `https://motionbgs.com${$(element).attr('href')}`;
                const thumbnailTag = $(element).find('img');
                const thumbnail = thumbnailTag.length ? `https://motionbgs.com${thumbnailTag.attr('src')}` : null;

                if (title && link && thumbnail) {
                    wallpapers.push({
                        title,
                        link,
                        thumbnail,
                        type: 'live'
                    });
                }
            });

            return res.json({
                source: 'motionbg',
                page: randomPage,
                wallpapers
            });
        } catch (error) {
            console.error('Error:', error.message);
            return res.status(500).json({ error: "Terjadi kesalahan saat mengambil data dari MotionBG." });
        }
    } else if (randomSource === 'mylivewallpaper') {
        const baseUrl = "https://mylivewallpapers.com/";
        const url = `${baseUrl}page/${randomPage}/`;
    
        try {
            const response = await axios.get(url, { headers });
    
            if (response.status !== 200) {
                return res.status(500).json({ error: "Gagal mengambil data dari MyLiveWallpaper" });
            }
    
            const $ = cheerio.load(response.data);
            const wallpapers = [];
            const container = $('main > div:nth-of-type(3) > div:nth-of-type(1)');
    
            if (!container.length) {
                return res.status(404).json({ error: "Tidak ditemukan wallpaper di MyLiveWallpaper" });
            }
    
            container.find('a[href]').each((_, element) => {
                const link = $(element).attr('href');
                const title = link.split('/')[link.split('/').length - 2];
                const thumbnailStyle = $(element).attr('style');
                let thumbnail = thumbnailStyle ? thumbnailStyle.match(/url\((.*?)\)/)[1] : null;
    
                // Trim spasi di thumbnail URL jika ada
                if (thumbnail) {
                    thumbnail = thumbnail.trim();
                }
    
                if (title && link && thumbnail) {
                    wallpapers.push({
                        title,
                        link,
                        thumbnail,
                        type: 'live'
                    });
                }
            });
    
            return res.json({
                source: 'mylivewallpaper',
                page: randomPage,
                wallpapers
            });
        } catch (error) {
            console.error('Error:', error.message);
            return res.status(500).json({ error: "Terjadi kesalahan saat mengambil data dari MyLiveWallpaper." });
        }
    } else {
        res.status(400).json({ error: 'Sumber tidak valid' });
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
                        thumbnail,
                        type: 'live'
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
                let thumbnail = thumbnailStyle ? thumbnailStyle.match(/url\((.*?)\)/)[1] : null;
    
                // Trim spasi di thumbnail URL jika ada
                if (thumbnail) {
                    thumbnail = thumbnail.trim();
                }
    
                if (title && link && thumbnail) {
                    wallpapers.push({
                        title,
                        link,
                        thumbnail,
                        type: 'live'
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

    // Extract video wallpaper link (prioritize 'mobile')
    const downloadLinks = $('a.wpdm-download-link[data-downloadurl]');
    let videoWallpaper = null;

    downloadLinks.each((_, element) => {
        const url = $(element).attr('data-downloadurl');
        if (url.includes('mobile')) {
            videoWallpaper = url;
        }
    });

    // Extract preview video link
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


// Endpoint /detail untuk menangani dua sumber tanpa parameter source
app.get('/detail', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({ error: "Parameter URL diperlukan" });
    }

    try {
        let data;

        // Deteksi sumber berdasarkan URL
        if (url.includes('motionbgs.com')) {
            data = await getMotionBGDetails(url);
        } else if (url.includes('mylivewallpaper.com') || url.includes('mylivewallpapers.com')) {
            data = await getMyLiveWallpaperDetails(url);
        } else {
            return res.status(400).json({ error: "URL tidak valid, pastikan berasal dari 'motionbgs.com' atau 'mylivewallpaper(s).com'" });
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
