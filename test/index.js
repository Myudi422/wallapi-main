const { AnimeWallpaper, AnimeSource } = require("../dist");
const wall = new AnimeWallpaper();

async function WallpaperSearch() {
    // Pencarian gambar dari WallHaven dengan properti 'thumbnail' dan 'full'
    const wallpaper = await wall.search({ title: "shorekeeper", page: 1, type: "both", aiArt: true }, AnimeSource.WallHaven);
    
    // Tampilkan hasil dengan format thumbnail dan full
    wallpaper.forEach(img => {
        console.log(`Thumbnail: ${img.thumbnail}`);
        console.log(`Full: ${img.image}`);
    });
}


WallpaperSearch();



/**
* Uncomment the snippets below to try out new configurations
*/
//async function WallpaperSearch() {
    // const wallpaper = await wall.hoyolab({ game: "ZenlessZoneZero", postType: "Trending" });
    //const wallpaper = await wall.search({ title: "shorekeeper", page: 1, type: "both", aiArt: true }, AnimeSource.WallHaven);
    //const wallpaper = await wall.search({ title: "Wuthering Waves" }, AnimeSource.Wallpapers);
    // const wallpaper = await wall.search({ title: "robin honkai star rail" }, AnimeSource.ZeroChan);
    // const wallpaper = await wall.random();
    //const wallpaper = await wall.pinterest("ellen joe");
    //return console.log(wallpaper);
//}