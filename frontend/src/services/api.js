import { mockPapers } from '../data/mockPapers';

// Bu bir mock API servisidir.
// Kullanıcının isteği üzerine, herhangi bir sorgu veya filtreleme yapmadan
// her zaman tüm mock verilerini döndürecektir.

export const searchPapers = async (query) => {
    console.log("Always returning all mock papers, ignoring query:", query);

    // Ağ gecikmesini simüle et
    await new Promise(resolve => setTimeout(resolve, 750));

    // Kullanıcının isteği üzerine, herhangi bir filtreleme yapmadan tüm mock verilerini döndür.
    // Sadece mevcut 'rel' skoruna göre sıralama yap.
    const sortedPapers = [...mockPapers].sort((a, b) => b.rel - a.rel);

    return sortedPapers;
};
