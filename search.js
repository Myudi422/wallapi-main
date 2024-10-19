const express = require('express');
const { AnimeWallpaper, AnimeSource } = require("./dist");
const app = express();
const port = 3000;

// Inisialisasi AnimeWallpaper
const wall = new AnimeWallpaper();

/**
 * API Endpoint untuk mencari gambar di WallHaven berdasarkan judul
 * Contoh: http://localhost:3000/wallhaven?title=shorekeeper
 */
app.get('/wallhaven', async (req, res) => {
    const title = req.query.title;
    const page = req.query.page || 1;
    const type = req.query.type || 'both';
    const aiArt = req.query.aiArt === 'true' || false;

    if (!title) {
        return res.status(400).json({ error: "Parameter 'title' harus disertakan." });
    }

    try {
        // Pencarian gambar dari WallHaven
        const wallpaper = await wall.search({ title, page, type, aiArt }, AnimeSource.WallHaven);

        // Format hasil pencarian menjadi JSON
        const result = wallpaper.map(img => ({
            thumbnail: img.thumbnail || null,
            full: img.image || null,
        }));

        if (result.length === 0) {
            return res.status(404).json({ message: 'Gambar tidak ditemukan' });
        }

        // Kirim hasil sebagai respon
        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat pencarian gambar.' });
    }
});

/**
 * API Endpoint untuk mendapatkan gambar secara acak dari WallHaven
 * Contoh: http://localhost:3000/homepage
 */
app.get('/homepage', async (req, res) => {
    try {
        // Mengambil gambar dari WallHaven
        const wallpapers = await wall.scrapeFromWallHaven({
            title: "", // Kosongkan untuk mendapatkan acak
            page: 1,
            type: "both",
            aiArt: true // Selalu aktifkan AI Art untuk homepage
        });

        // Tentukan jumlah gambar yang ingin diambil, misalnya 5
        const numImages = 24; // Ganti sesuai kebutuhan
        const result = [];

        // Pilih gambar secara acak
        for (let i = 0; i < numImages; i++) {
            const randomImage = wallpapers[Math.floor(Math.random() * wallpapers.length)];
            result.push({
                thumbnail: randomImage.thumbnail || null,
                full: randomImage.image || null,
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Terjadi kesalahan saat mengambil gambar acak.' });
    }
});

// Jalankan server di port 3000
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
