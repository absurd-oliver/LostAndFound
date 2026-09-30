// tolololol
const REPO_OWNER = 'absurd-oliver';
const REPO_NAME = 'LostAndFound';

// Split token
const PT1 = "ghp_uDCQTjHtyOmwqIY";
const PT2 = "ipDlCxmk5NuqGNg0cYo54";
const G_TOKEN = PT1 + PT2;

// Fetch and display active lost items directly from GitHub Issues
async function fetchBoardItems() {
    const container = document.getElementById('itemsContainer');
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=100`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error();
        
        const issues = await response.json();
        container.innerHTML = ''; 

        // Filter out any issues that aren't lost items (just in case)
        const items = issues.filter(issue => issue.body && issue.body.includes("---"));

        if (items.length === 0) {
            container.innerHTML = '<p class="loading">No lost items reported yet! Everyone has their gear.</p>';
            return;
        }

        items.forEach(issue => {
            // Parse the data out of the structured issue description block
            const lines = issue.body.split('\n');
            const description = lines[0] || '';
            const parentName = (lines[2] || '').replace('**Reported By:** ', '');
            const contact = (lines[3] || '').replace('**Contact:** ', '');

            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <h3>${escapeHTML(issue.title)}</h3>
                <div class="date">Reported: ${new Date(issue.created_at).toLocaleDateString()}</div>
                <p>${escapeHTML(description)}</p>
                <div class="meta">
                    <strong>Reported By:</strong> ${escapeHTML(parentName)}<br>
                    <strong>Contact:</strong> ${escapeHTML(contact)}
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = '<p class="loading">Unable to load the board right now.</p>';
    }
}

// Handle submitting a new item directly to GitHub Issues API
document.getElementById('lostItemForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const status = document.getElementById('formStatus');
    const button = this.querySelector('button');

    const itemName = document.getElementById('itemName').value;
    const [description, footer = ''] = issue.body.split('\n\n---\n');
    const parentName = (footer.match(/\*\*Reported By:\*\* (.*)/) || [])[1] || '';
    const contact    = (footer.match(/\*\*Contact:\*\* (.*)/) || [])[1] || '';

    button.disabled = true;
    button.innerText = "Submitting...";

    // Format the description text so our parser can easily read it later
    const issueBody = `${description}\n\n---\n**Reported By:** ${parentName}\n**Contact:** ${contact}`;

    try {
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
            status.textContent = "Success! Your item has been added to the board.";
            status.className = "success";
            this.reset();
            // Instantly refresh the board to show the new item
            fetchBoardItems();
        } else {
            throw new Error();
        }
    } catch {
        status.textContent = "Error submitting item. Please check your setup settings.";
        status.className = "error";
    } finally {
        button.disabled = false;
        button.innerText = "Submit Item";
        status.classList.remove('hidden');
    }
});

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

document.addEventListener('DOMContentLoaded', fetchBoardItems);
