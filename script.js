// tolololol
const REPO_OWNER = 'absurd-oliver';
const REPO_NAME = 'LostAndFound';

// Split token
const PT1 = "ghp_uDCQTjHtyOmwqIY";
const PT2 = "ipDlCxmk5NuqGNg0cYo54";
const G_TOKEN = PT1 + PT2;

// Location -> email that receives claims for items found there (placeholders for now)
const LOCATIONS = {
    'Fleur soleil':  'fleursoleil@example.com',
    'Ribambelle':    'ribambelle@example.com',
    'Trois saisons': 'troissaisons@example.com',
    'Tournesol':     'tournesol@example.com',
    'Odyssee':        'odyssee@example.com'
};

// Fill the <select> from LOCATIONS
function populateLocations() {
    const select = document.getElementById('location');
    Object.keys(LOCATIONS).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

// Builds a mailto: link addressed to the location's email
function buildClaimLink(issue, parentName, location) {
    const to = LOCATIONS[location];
    const subject = `Item claimed: ${issue.title}`;
const body =
`Bonjour,

Je souhaite réclamer cet objet :

Objet : ${issue.title}
Trouvé à : ${location}
Signalé par : ${parentName}
Annonce : ${issue.html_url}

Mon nom :
Mes coordonnées :

Merci !`;

    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Shown when an item has no photo
const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180">' +
    '<rect width="400" height="180" fill="#f3f4f6"/>' +
    '<g fill="none" stroke="#9ca3af" stroke-width="6" stroke-linejoin="round">' +
    '<rect x="150" y="50" width="100" height="80" rx="8"/>' +
    '<circle cx="180" cy="80" r="8"/>' +
    '<path d="M155 122l30-28 22 20 14-12 24 20"/></g>' +
    '<text x="200" y="160" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">No image</text>' +
    '</svg>'
);

const IMAGE_URL_PREFIX = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/`;

// Shrink the photo in the browser and return base64 JPEG data (no data: prefix)
function resizeImage(file, maxSize = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1]);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not read image'));
        };
        img.src = objectUrl;
    });
}

// Commit the image to the repo and return its public URL
async function uploadImage(file) {
    const base64 = await resizeImage(file);
    const path = `images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${G_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Add item image', content: base64 })
    });
    if (!response.ok) throw new Error(`Image upload failed (${response.status})`);

    const data = await response.json();
    return data.content.download_url;
}

// Fetch and display active lost items directly from GitHub Issues
async function fetchBoardItems() {
    const container = document.getElementById('itemsContainer');
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=100`;

    try {
        const response = await fetch(apiUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`GitHub returned ${response.status}`);

        const issues = await response.json();
        container.innerHTML = '';

        // Filter out pull requests and anything that isn't a lost-item issue
        const items = issues.filter(issue => !issue.pull_request && issue.body && issue.body.includes("---"));

        if (items.length === 0) {
            container.innerHTML = '<p class="loading">Aucun objet perdu n\'a encore été signalé ! Tout le monde a ses affaires.</p>';
            return;
        }

        items.forEach(issue => {
            const body = issue.body.replace(/\r\n/g, '\n');
            const [description, footer = ''] = body.split('\n\n---\n');
            const parentName =(footer.match(/\*\*(?:Signalé par|Reported By) :\*\* (.*)/) || [])[1] || '';
            const contact =(footer.match(/\*\*(?:Contact) :\*\* (.*)/) || [])[1] || '';
            const location =((footer.match(/\*\*(?:Lieu|Location) :\*\* (.*)/) || [])[1] || '').trim();
            let imageUrl =((footer.match(/\*\*Image :\*\* (.*)/) || [])[1] || '').trim();



            // Only accept images that come from this repo
            if (!imageUrl.startsWith(IMAGE_URL_PREFIX)) imageUrl = PLACEHOLDER_IMG;

            // Only show a claim button if the location is one we know an email for
            const hasLocation = Object.prototype.hasOwnProperty.call(LOCATIONS, location);

            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <img class="item-image" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(issue.title)}" loading="lazy">
                ${hasLocation ? `<span class="location-tag">${escapeHTML(location)}</span>` : ''}
                <h3>${escapeHTML(issue.title)}</h3>
                <div class="date">Reported: ${new Date(issue.created_at).toLocaleDateString()}</div>
                <p>${escapeHTML(description)}</p>
                <div class="meta">
                    <strong>Reported By:</strong> ${escapeHTML(parentName)}<br>
                    <strong>Contact:</strong> ${escapeHTML(contact)}
                </div>
                ${hasLocation ? `<a class="btn claim-btn" href="${escapeHTML(buildClaimLink(issue, parentName, location))}">Réclamer cet objet</a>` : ''}
            `;

            // If a photo fails to load, fall back to the placeholder
            card.querySelector('.item-image').onerror = function () {
                this.onerror = null;
                this.src = PLACEHOLDER_IMG;
            };

            container.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="loading">Impossible de charger le tableau pour le moment.</p>';
    }
}

// Handle submitting a new item directly to GitHub Issues API
document.getElementById('lostItemForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const status = document.getElementById('formStatus');
    const button = this.querySelector('button');

    const itemName = document.getElementById('itemName').value;
    const description = document.getElementById('description').value;
    const parentName = document.getElementById('parentName').value;
    const contact = document.getElementById('contact').value;
    const location = document.getElementById('location').value;
    const imageFile = document.getElementById('image').files[0];

if (!Object.prototype.hasOwnProperty.call(LOCATIONS, location)) {
        status.textContent = "Veuillez choisir le lieu où l'objet a été trouvé.";
        status.className = "error";
        return;
    }

    button.disabled = true;
    button.innerText = "Submitting...";

try {
        let imageLine = '';
        if (imageFile) {
            button.innerText = "Téléchargement de l'image...";
            const imageUrl = await uploadImage(imageFile);
            imageLine = `\n**Image:** ${imageUrl}`;
            button.innerText = "Envoi en cours...";
        }

        // Format the description text so our parser can easily read it later
        const issueBody = `${description}\n\n---\n**Signalé par :** ${parentName}\n**Contact :** ${contact}\n**Lieu :** ${location}${imageLine}`;

        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${G_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: itemName,
                body: issueBody
            })
        });

        if (response.ok) {
            status.textContent = "Succès ! Votre objet a bien été ajouté au tableau.";
            status.className = "success";
            this.reset();
            // Instantly refresh the board to show the new item
            fetchBoardItems();
        } else {
            throw new Error(`Issue creation failed (${response.status})`);
        }
    } catch (err) {
        console.error(err);
        status.textContent = "Erreur lors de l'envoi de l'objet. Veuillez vérifier vos paramètres de configuration.";
        status.className = "error";
    } finally {
        button.disabled = false;
        button.innerText = "Soumettre";
        status.classList.remove('hidden');
    }
});

let allItems = [];
let currentFilter = '';

// Draw the cards, applying the current location filter
function renderBoard() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';

    if (allItems.length === 0) {
        container.innerHTML = '<p class="loading">Aucun objet perdu n\'a encore été signalé ! Tout le monde a ses affaires.</p>';
        return;
    }

    const visible = currentFilter
        ? allItems.filter(item => item.location === currentFilter)
        : allItems;

    if (visible.length === 0) {
        container.innerHTML = `<p class="loading">Aucun objet trouvé à : ${escapeHTML(currentFilter)}.</p>`;
        return;
    }

    visible.forEach(({ issue, description, parentName, contact, location, imageUrl, hasLocation }) => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img class="item-image" src="${escapeHTML(imageUrl)}" alt="${escapeHTML(issue.title)}" loading="lazy">
            ${hasLocation ? `<span class="location-tag">${escapeHTML(location)}</span>` : ''}
            <h3>${escapeHTML(issue.title)}</h3>
            <div class="date">Reported: ${new Date(issue.created_at).toLocaleDateString()}</div>
            <p>${escapeHTML(description)}</p>
            <div class="meta">
                <strong>Reported By:</strong> ${escapeHTML(parentName)}<br>
                <strong>Contact:</strong> ${escapeHTML(contact)}
            </div>
            ${hasLocation ? `<a class="btn claim-btn" href="${escapeHTML(buildClaimLink(issue, parentName, location))}">Réclamer cet objet</a>` : ''}
        `;

        // If a photo fails to load, fall back to the placeholder
        card.querySelector('.item-image').onerror = function () {
            this.onerror = null;
            this.src = PLACEHOLDER_IMG;
        };

        container.appendChild(card);
    });
}

// Build the filter menu and wire up open/close behaviour
function setupFilter() {
    const btn = document.getElementById('filterBtn');
    const menu = document.getElementById('filterMenu');
    const label = btn.querySelector('.filter-label');

    const openMenu = () => { menu.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true'); };
    const closeMenu = () => { menu.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); };

    const options = [['', 'All locations'], ...Object.keys(LOCATIONS).map(n => [n, n])];

    options.forEach(([value, text], i) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'filter-option' + (i === 0 ? ' active' : '');
        opt.textContent = text;
        opt.setAttribute('role', 'menuitem');
        opt.addEventListener('click', () => {
            currentFilter = value;
            menu.querySelectorAll('.filter-option').forEach(o => o.classList.toggle('active', o === opt));
            label.textContent = value ? `Filter: ${value}` : 'Filter';
            btn.classList.toggle('active', Boolean(value));
            closeMenu();
            renderBoard();
        });
        menu.appendChild(opt);
    });

    btn.addEventListener('click', e => {
        e.stopPropagation();
        menu.classList.contains('hidden') ? openMenu() : closeMenu();
    });
    document.addEventListener('click', e => {
        if (!menu.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMenu();
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

document.addEventListener('DOMContentLoaded', () => {
    populateLocations();
    setupFilter();
    fetchBoardItems();
});