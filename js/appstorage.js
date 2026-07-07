const Storage = {
    getFavs() {
        const favs = JSON.parse(localStorage.getItem('pokeFavs')) || [];
        return Array.isArray(favs) ? favs : [];
    },

    saveFav(pokemon) {
        const favs = this.getFavs();
        const exists = favs.some(p => p.id === pokemon.id);

        if (!exists) {
            favs.push(pokemon);
            localStorage.setItem('pokeFavs', JSON.stringify(favs));
            return true;
        }
        return false;
    },

    removeFav(id) {
        const favs = this.getFavs().filter(p => p.id !== id);
        localStorage.setItem('pokeFavs', JSON.stringify(favs));
    },

    setCache(key, data) {
        const cacheData = {
            timestamp: Date.now(),
            content: data
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    },

    getCache(key) {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const parsed = JSON.parse(cached);
        const isFresh = Date.now() - parsed.timestamp < 10 * 60 * 1000;

        if (!isFresh) {
            localStorage.removeItem(key);
            return null;
        }

        return parsed.content;
    }
};

//Gastly el mejor pokemon de todos los tiempos.