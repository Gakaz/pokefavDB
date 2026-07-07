const POKE_API = 'https://pokeapi.co/api/v2/pokemon';
const listContainer = document.getElementById('pokemon-list');
const statusMsg = document.getElementById('status-message');
const searchInput = document.getElementById('search-input');
const pushStatus = document.getElementById('push-status');
const pushSubscriptionInfo = document.getElementById('push-subscription-info');
const pushPermissionButton = document.getElementById('push-permission-button');
const pushTestButton = document.getElementById('push-test-button');

let currentOffset = 0;
const limit = 20;
let currentSearch = null;

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!window.location.protocol.startsWith('http')) return;

    window.addEventListener('load', () => {
        const serviceWorkerUrl = new URL('./js/service-worker.js', window.location.href);
        navigator.serviceWorker.register(serviceWorkerUrl).catch(error => {
            console.warn('No se pudo registrar el service worker:', error);
        });
    });
}

registerServiceWorker();

function setPushStatus(message) {
    if (pushStatus) {
        pushStatus.textContent = message;
    }
}

function showPushSubscription(subscription) {
    if (!pushSubscriptionInfo) return;
    if (!subscription) {
        pushSubscriptionInfo.textContent = 'Sin suscripción activa.';
        return;
    }

    const data = subscription.toJSON ? subscription.toJSON() : subscription;
    pushSubscriptionInfo.textContent = JSON.stringify(data, null, 2);
}

async function enablePushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushStatus('Tu navegador no admite notificaciones push.');
        return;
    }

    if (Notification.permission === 'denied') {
        setPushStatus('Las notificaciones están bloqueadas. Actívalas desde la configuración del navegador.');
        return;
    }

    if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            setPushStatus('No se concedieron las notificaciones.');
            return;
        }
    }

    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();

    if (existingSubscription) {
        showPushSubscription(existingSubscription);
        setPushStatus('Ya estás suscrito a notificaciones push.');
        return;
    }

    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true
    });

    localStorage.setItem('push-subscription', JSON.stringify(subscription.toJSON()));
    showPushSubscription(subscription);
    setPushStatus('Suscripción creada correctamente.');
}

async function sendPushTest() {
    if (!('serviceWorker' in navigator)) {
        setPushStatus('El navegador no admite service workers.');
        return;
    }

    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
        registration.active.postMessage({
            type: 'TEST_PUSH',
            title: 'PokeFav',
            body: 'Mensaje de prueba recibido por el service worker.'
        });
        setPushStatus('Mensaje de prueba enviado al service worker.');
    } else {
        setPushStatus('El service worker aún no está listo.');
    }
}

function initializePushUI() {
    const storedSubscription = localStorage.getItem('push-subscription');
    if (storedSubscription) {
        try {
            const parsed = JSON.parse(storedSubscription);
            showPushSubscription(parsed);
            setPushStatus('Hay una suscripción guardada. Puedes volver a enviar una prueba.');
        } catch (error) {
            console.warn('No se pudo leer la suscripción guardada:', error);
        }
    }

    pushPermissionButton?.addEventListener('click', enablePushNotifications);
    pushTestButton?.addEventListener('click', sendPushTest);
}

initializePushUI();

async function fetchPokemon() {
    try {
        if (statusMsg) {
            statusMsg.innerHTML = 'Cargando...';
        }

        if (!currentSearch && currentOffset === 0) {
            const cachedData = Storage.getCache('main_list');
            if (cachedData) {
                renderList(cachedData);
                if (statusMsg) {
                    statusMsg.innerHTML = '';
                }
                updatePagination();
                return;
            }
        }

        const url = currentSearch
            ? `${POKE_API}/${encodeURIComponent(currentSearch)}`
            : `${POKE_API}?limit=${limit}&offset=${currentOffset}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('No se encontró el Pokémon o la API falló');

        const data = await response.json();

        if (data.results) {
            const detailPromises = data.results.map(p => fetch(p.url).then(res => res.json()));
            const detailedPokemons = await Promise.all(detailPromises);
            if (!currentSearch && currentOffset === 0) {
                Storage.setCache('main_list', detailedPokemons);
            }
            renderList(detailedPokemons);
        } else {
            renderList([data]);
        }

        if (statusMsg) {
            statusMsg.innerHTML = '';
        }
        updatePagination();
    } catch (error) {
        if (statusMsg) {
            statusMsg.innerHTML = `<p class="error-msg">⚠️ Error: ${error.message}. Verifica tu conexión.</p>`;
        }
        if (listContainer) {
            listContainer.innerHTML = '';
        }
    }
}

function renderList(pokemons) {
    if (!listContainer) return;

    listContainer.innerHTML = '';
    if (pokemons.length === 0) {
        if (statusMsg) {
            statusMsg.innerHTML = 'No se encontraron resultados.';
        }
        return;
    }

    pokemons.forEach(poke => {
        const card = document.createElement('article');
        card.className = 'poke-card';
        card.innerHTML = `
            <img src="${poke.sprites?.front_default || './pokeapi_256.png'}" alt="${poke.name}">
            <h3>${poke.name.toUpperCase()}</h3>
            <button type="button" onclick="verDetalle(${poke.id})">Ver Detalle</button>
        `;
        listContainer.appendChild(card);
    });
}

function updatePagination() {
    const pageInfo = document.getElementById('page-info');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    if (!pageInfo || !prevButton || !nextButton) return;

    if (currentSearch) {
        pageInfo.textContent = `Buscando: ${currentSearch}`;
        prevButton.disabled = true;
        nextButton.disabled = true;
        return;
    }

    const currentPage = Math.floor(currentOffset / limit) + 1;
    pageInfo.textContent = `Página ${currentPage}`;

    prevButton.disabled = currentOffset === 0;
    nextButton.disabled = false;
}

function nextPage() {
    if (currentSearch) return;
    currentOffset += limit;
    fetchPokemon();
}

function prevPage() {
    if (currentSearch || currentOffset < limit) return;
    currentOffset -= limit;
    fetchPokemon();
}

function searchPokemon(term) {
    const cleanTerm = term?.toLowerCase().trim();
    if (!cleanTerm) {
        currentSearch = null;
        currentOffset = 0;
        fetchPokemon();
        return;
    }

    currentSearch = cleanTerm;
    fetchPokemon();
}

async function verDetalle(id) {
    try {
        const response = await fetch(`${POKE_API}/${id}`);
        if (!response.ok) throw new Error('No se pudo cargar el detalle');

        const poke = await response.json();
        const modal = document.getElementById('modal-detalle');
        const info = document.getElementById('detalle-info');

        if (!modal || !info) return;

        info.innerHTML = `
            <h2>${poke.name.toUpperCase()}</h2>
            <img src="${poke.sprites?.other?.['official-artwork']?.front_default || poke.sprites?.front_default || './pokeapi_256.png'}" width="150" alt="${poke.name}">
            <p><strong>Altura:</strong> ${poke.height / 10} m</p>
            <p><strong>Peso:</strong> ${poke.weight / 10} kg</p>
            <p><strong>Tipos:</strong> ${poke.types.map(t => t.type.name).join(', ')}</p>
            <button id="add-fav" type="button">Añadir a Favoritos</button>
        `;

        modal.classList.remove('hidden');

        document.getElementById('add-fav').onclick = () => {
            const success = Storage.saveFav({
                id: poke.id,
                name: poke.name,
                img: poke.sprites?.front_default || 'pokeapi_256.png'
            });
            alert(success ? '¡Guardado!' : 'Ya está en favoritos');
        };
    } catch (e) {
        alert('Error al cargar el detalle');
    }
}

function closeModal() {
    document.getElementById('modal-detalle')?.classList.add('hidden');
}

document.getElementById('search-button')?.addEventListener('click', () => {
    searchPokemon(searchInput?.value);
});

searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        event.preventDefault();
        searchPokemon(searchInput.value);
    }
});

document.getElementById('next-button')?.addEventListener('click', nextPage);
document.getElementById('prev-button')?.addEventListener('click', prevPage);

document.getElementById('modal-detalle')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) {
        closeModal();
    }
});

document.querySelector('.close-button')?.addEventListener('click', closeModal);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeModal();
    }
});

if (listContainer) {
    fetchPokemon();
    updatePagination();
}

function renderizarFavoritos() {
    const favContainer = document.getElementById('favs-list');
    if (!favContainer) return;

    const favs = Storage.getFavs();
    favContainer.innerHTML = '';

    if (favs.length === 0) {
        favContainer.innerHTML = '<p>No tienes favoritos guardados.</p>';
        return;
    }

    favs.forEach(poke => {
        const card = document.createElement('article');
        card.className = 'poke-card';
        card.innerHTML = `
            <img src="${poke.img}" alt="${poke.name}">
            <h3>${poke.name.toUpperCase()}</h3>
            <button class="btn-remove" type="button" onclick="eliminarFav(${poke.id})">Quitar</button>
        `;
        favContainer.appendChild(card);
    });
}

function eliminarFav(id) {
    Storage.removeFav(id);
    renderizarFavoritos();
}

//Gastly el mejor pokemon de todos los tiempos.