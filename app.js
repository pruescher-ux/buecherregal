/**
 * Bücher-Tracker Single Page Application
 * Speichert Daten in localStorage und greift auf Google Books & Open Library APIs zu.
 */

const STORAGE_KEY = 'buecher_tracker_data_v1';

// Initial state
let state = {
  activeTab: 'wantToRead', // 'wantToRead' | 'read' | 'search'
  books: [],
  searchResults: [],
  editingBookId: null,
};

// --- INITIALISIERUNG ---
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  updateBadgeCounts();
  switchTab('wantToRead');
  
  // Gespeicherten Google API Key laden (falls vorhanden)
  const savedApiKey = localStorage.getItem('google_books_api_key') || '';
  const apiKeyInput = document.getElementById('google-api-key-input');
  if (apiKeyInput) apiKeyInput.value = savedApiKey;

  lucide.createIcons();
});

function saveApiKey() {
  const input = document.getElementById('google-api-key-input');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    localStorage.setItem('google_books_api_key', val);
    showToast('API-Schlüssel gespeichert!');
  } else {
    localStorage.removeItem('google_books_api_key');
    showToast('API-Schlüssel entfernt.');
  }
}

// --- LOCAL STORAGE & STATE ---
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state.books = JSON.parse(raw);
    } else {
      state.books = [];
    }
  } catch (e) {
    console.error('Fehler beim Laden von localStorage:', e);
    state.books = [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.books));
    updateBadgeCounts();
  } catch (e) {
    console.error('Fehler beim Speichern in localStorage:', e);
    showToast('Fehler beim Speichern!', true);
  }
}

function updateBadgeCounts() {
  const wantToReadCount = state.books.filter(b => b.status === 'wantToRead').length;
  const readCount = state.books.filter(b => b.status === 'read').length;

  // Desktop Badges
  const badgeWant = document.getElementById('badge-want-to-read');
  const badgeRead = document.getElementById('badge-read');
  if (badgeWant) badgeWant.textContent = wantToReadCount;
  if (badgeRead) badgeRead.textContent = readCount;

  // Mobile Badges
  const mBadgeWant = document.getElementById('m-badge-want-to-read');
  const mBadgeRead = document.getElementById('m-badge-read');
  if (mBadgeWant) mBadgeWant.textContent = wantToReadCount;
  if (mBadgeRead) mBadgeRead.textContent = readCount;
}

// --- TABS & NAVIGATION ---
function switchTab(tab) {
  state.activeTab = tab;

  const viewSearch = document.getElementById('view-search');
  const viewList = document.getElementById('view-list');

  // Update button highlights
  const navIds = ['wantToRead', 'read', 'search'];
  navIds.forEach(t => {
    const dBtn = document.getElementById(`nav-${camelToKebab(t)}`);
    const mBtn = document.getElementById(`m-nav-${camelToKebab(t)}`);
    if (dBtn) {
      if (t === tab) {
        dBtn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 bg-white text-slate-900 shadow-sm';
      } else {
        dBtn.className = 'tab-btn px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-slate-600 hover:text-slate-900';
      }
    }
    if (mBtn) {
      if (t === tab) {
        mBtn.classList.add('text-sky-600', 'font-bold');
        mBtn.classList.remove('text-slate-600');
      } else {
        mBtn.classList.remove('text-sky-600', 'font-bold');
        mBtn.classList.add('text-slate-600');
      }
    }
  });

  if (tab === 'search') {
    viewSearch.classList.remove('hidden');
    viewList.classList.add('hidden');
    document.getElementById('search-input').focus();
  } else {
    viewSearch.classList.add('hidden');
    viewList.classList.remove('hidden');
    renderCurrentList();
  }

  lucide.createIcons();
}

function camelToKebab(string) {
  return string.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// --- BUCH-SUCHE (Google Books & Open Library) ---
async function handleSearch(event) {
  event.preventDefault();
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  const searchField = document.querySelector('input[name="searchField"]:checked')?.value || 'all';
  const source = document.getElementById('search-source').value;

  const loadingEl = document.getElementById('search-loading');
  const emptyEl = document.getElementById('search-empty');
  const resultsContainer = document.getElementById('search-results-container');
  const submitBtn = document.getElementById('search-submit-btn');

  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  resultsContainer.innerHTML = '';
  submitBtn.disabled = true;

  try {
    let items = [];
    if (source === 'google') {
      try {
        items = await searchGoogleBooks(query, searchField);
      } catch (gErr) {
        console.warn('Google Books fehlgeschlagen, wechsle automatisch zu Open Library:', gErr);
        showToast('Google Books API überlastet/blockiert. Suche über Open Library...');
        const sourceSelect = document.getElementById('search-source');
        if (sourceSelect) sourceSelect.value = 'openlibrary';
        items = await searchOpenLibrary(query, searchField);
      }
    } else {
      items = await searchOpenLibrary(query, searchField);
    }

    state.searchResults = items;

    loadingEl.classList.add('hidden');
    if (items.length === 0) {
      emptyEl.classList.remove('hidden');
    } else {
      renderSearchResults(items);
    }
  } catch (error) {
    console.error('Suchfehler:', error);
    loadingEl.classList.add('hidden');
    showToast('Fehler bei der Suche. Bitte später erneut versuchen.', true);
  } finally {
    submitBtn.disabled = false;
    lucide.createIcons();
  }
}

// Google Books Suche
async function searchGoogleBooks(query, searchField) {
  let q = query;
  if (searchField === 'title') q = `intitle:${query}`;
  else if (searchField === 'author') q = `inauthor:${query}`;
  else if (searchField === 'isbn') q = `isbn:${query}`;

  const apiKey = localStorage.getItem('google_books_api_key') || '';
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=16`;
  if (apiKey) {
    url += `&key=${encodeURIComponent(apiKey)}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Google Books API Fehler: HTTP ${res.status}`);
  }
  const data = await res.json();

  if (!data.items || data.items.length === 0) return [];

  return data.items.map(item => {
    const info = item.volumeInfo || {};
    const isbnObj = (info.industryIdentifiers || []).find(id => id.type === 'ISBN_13' || id.type === 'ISBN_10');
    const isbn = isbnObj ? isbnObj.identifier : (info.industryIdentifiers?.[0]?.identifier || 'Keine ISBN');

    let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
    if (coverUrl.startsWith('http://')) {
      coverUrl = coverUrl.replace('http://', 'https://');
    }

    return {
      sourceId: item.id,
      workKey: null,
      title: info.title || 'Ohne Titel',
      authors: (info.authors && info.authors.length) ? info.authors.join(', ') : 'Unbekannter Autor',
      publishYear: info.publishedDate ? info.publishedDate.substring(0, 4) : 'K.A.',
      isbn: isbn,
      coverUrl: coverUrl,
      summary: info.description || 'Keine Inhaltszusammenfassung verfügbar.',
      pageCount: info.pageCount || null,
      categories: info.categories ? info.categories.join(', ') : ''
    };
  });
}

// Open Library Suche
async function searchOpenLibrary(query, searchField) {
  let param = 'q';
  if (searchField === 'title') param = 'title';
  else if (searchField === 'author') param = 'author';
  else if (searchField === 'isbn') param = 'isbn';

  const url = `https://openlibrary.org/search.json?${param}=${encodeURIComponent(query)}&limit=16`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open Library API fehlgeschlagen');
  const data = await res.json();

  if (!data.docs || data.docs.length === 0) return [];

  return data.docs.map(doc => {
    const isbn = (doc.isbn && doc.isbn[0]) ? doc.isbn[0] : 'Keine ISBN';
    let coverUrl = '';
    if (doc.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    } else if (doc.isbn && doc.isbn[0]) {
      coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
    }

    let summary = 'Klassiker aus der Open Library Datenbank.';
    if (doc.first_sentence) {
      summary = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : doc.first_sentence;
    } else if (doc.subtitle) {
      summary = doc.subtitle;
    }

    const year = doc.first_publish_year
      ? String(doc.first_publish_year)
      : (doc.publish_year && doc.publish_year[0] ? String(doc.publish_year[0]) : 'K.A.');

    return {
      sourceId: doc.key,
      workKey: doc.key,
      title: doc.title || 'Ohne Titel',
      authors: (doc.author_name && doc.author_name.length) ? doc.author_name.join(', ') : 'Unbekannter Autor',
      publishYear: year,
      isbn: isbn,
      coverUrl: coverUrl,
      summary: summary,
      pageCount: doc.number_of_pages_median || null,
      categories: ''
    };
  });
}

// Suchergebnisse darstellen
function renderSearchResults(items) {
  const container = document.getElementById('search-results-container');
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

  items.forEach((item, index) => {
    const existingBook = state.books.find(b =>
      (b.isbn && item.isbn !== 'Keine ISBN' && b.isbn === item.isbn) ||
      (b.title.toLowerCase() === item.title.toLowerCase() && b.authors.toLowerCase() === item.authors.toLowerCase())
    );

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row gap-4 hover:border-slate-300 transition-all';

    const coverHtml = item.coverUrl
      ? `<img src="${item.coverUrl}" alt="Cover" class="w-24 h-36 object-cover rounded-lg shadow-sm flex-shrink-0 bg-slate-100 mx-auto sm:mx-0" onerror="this.onerror=null; this.src='https://placehold.co/100x150/e2e8f0/64748b?text=Kein+Cover';">`
      : `<div class="w-24 h-36 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center flex-shrink-0 mx-auto sm:mx-0">
           <i data-lucide="book" class="w-6 h-6 mb-1"></i>
           <span class="text-[10px] leading-tight">Kein Cover</span>
         </div>`;

    card.innerHTML = `
      ${coverHtml}
      <div class="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-bold text-slate-900 text-base leading-snug line-clamp-2" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
          </div>
          <p class="text-xs font-medium text-slate-600 mt-1">${escapeHtml(item.authors)}</p>
          <div class="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
            <span>Jahr: ${escapeHtml(item.publishYear)}</span>
            <span>•</span>
            <span class="font-mono">ISBN: ${escapeHtml(item.isbn)}</span>
          </div>
          <p class="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">${escapeHtml(item.summary)}</p>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          ${existingBook
            ? `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${existingBook.status === 'read' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
                 <i data-lucide="${existingBook.status === 'read' ? 'check-circle-2' : 'bookmark'}" class="w-3.5 h-3.5"></i>
                 <span>Bereits in ${existingBook.status === 'read' ? '„Gelesen“' : '„Leseliste“'}</span>
               </span>`
            : `
               <button onclick="addSearchResult(${index}, 'wantToRead')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium text-xs transition-colors">
                 <i data-lucide="bookmark" class="w-3.5 h-3.5 text-amber-600"></i>
                 <span>Auf Leseliste</span>
               </button>
               <button onclick="addSearchResult(${index}, 'read')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-medium text-xs transition-colors">
                 <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-600"></i>
                 <span>Als Gelesen</span>
               </button>
              `
          }
        </div>
      </div>
    `;

    grid.appendChild(card);
  });

  container.appendChild(grid);
}

function addSearchResult(resultIndex, status) {
  const item = state.searchResults[resultIndex];
  if (!item) return;

  const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const newBook = {
    id: bookId,
    title: item.title,
    authors: item.authors,
    publishYear: item.publishYear,
    isbn: item.isbn,
    coverUrl: item.coverUrl,
    summary: item.summary,
    comment: '',
    rating: 0,
    status: status,
    dateAdded: new Date().toISOString()
  };

  state.books.unshift(newBook);
  saveToStorage();

  showToast(`„${item.title}“ wurde hinzugefügt!`);
  renderSearchResults(state.searchResults);

  // Falls es sich um ein Open Library Buch handelt, versuche ausführlichen Klappentext nachzuladen
  if (item.workKey && item.workKey.startsWith('/works/')) {
    fetch(`https://openlibrary.org${item.workKey}.json`)
      .then(res => res.json())
      .then(data => {
        let desc = '';
        if (typeof data.description === 'string') {
          desc = data.description;
        } else if (data.description && typeof data.description.value === 'string') {
          desc = data.description.value;
        }
        if (desc) {
          const target = state.books.find(b => b.id === bookId);
          if (target) {
            target.summary = desc;
            saveToStorage();
            if (state.activeTab !== 'search') {
              renderCurrentList();
            }
          }
        }
      })
      .catch(e => console.log('Hintergrund-Zusammenfassung übersprungen:', e));
  }
}

// --- LISTEN DARSTELLUNG (Leseliste / Gelesen) ---
function renderCurrentList() {
  const isWantToRead = state.activeTab === 'wantToRead';
  const listTitle = document.getElementById('list-title');
  const listSubtitle = document.getElementById('list-subtitle');
  const booksGrid = document.getElementById('books-grid');
  const emptyState = document.getElementById('list-empty-state');

  // Update Header Text
  if (isWantToRead) {
    listTitle.innerHTML = `<i data-lucide="bookmark" class="w-6 h-6 text-amber-500"></i><span>Meine Leseliste</span>`;
    listSubtitle.textContent = 'Bücher, die du als Nächstes lesen möchtest.';
  } else {
    listTitle.innerHTML = `<i data-lucide="check-circle-2" class="w-6 h-6 text-emerald-500"></i><span>Bereits gelesene Bücher</span>`;
    listSubtitle.textContent = 'Bücher, die du beendet und bewertet hast.';
  }

  // Filter books by status
  let books = state.books.filter(b => b.status === state.activeTab);

  // Search filter inside current list
  const filterVal = (document.getElementById('list-search-input')?.value || '').toLowerCase().trim();
  if (filterVal) {
    books = books.filter(b =>
      b.title.toLowerCase().includes(filterVal) ||
      b.authors.toLowerCase().includes(filterVal) ||
      (b.isbn && b.isbn.toLowerCase().includes(filterVal)) ||
      (b.comment && b.comment.toLowerCase().includes(filterVal))
    );
  }

  // Sorting
  const sortVal = document.getElementById('list-sort-select')?.value || 'date-desc';
  books.sort((a, b) => {
    if (sortVal === 'date-desc') return new Date(b.dateAdded) - new Date(a.dateAdded);
    if (sortVal === 'date-asc') return new Date(a.dateAdded) - new Date(b.dateAdded);
    if (sortVal === 'title-asc') return a.title.localeCompare(b.title);
    if (sortVal === 'rating-desc') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  // Render cards
  booksGrid.innerHTML = '';
  if (books.length === 0) {
    emptyState.classList.remove('hidden');
    const emptyIcon = document.getElementById('list-empty-icon');
    const emptyTitle = document.getElementById('list-empty-title');
    const emptyText = document.getElementById('list-empty-text');

    if (filterVal) {
      emptyTitle.textContent = 'Keine Treffer für deinen Suchbegriff';
      emptyText.textContent = `Kein Buch entspricht „${filterVal}“.`;
    } else if (isWantToRead) {
      emptyIcon.className = 'w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3';
      emptyIcon.innerHTML = '<i data-lucide="bookmark" class="w-7 h-7"></i>';
      emptyTitle.textContent = 'Deine Leseliste ist noch leer';
      emptyText.textContent = 'Suche nach Büchern und speichere sie, um den Überblick über deine Wunschlektüre zu behalten.';
    } else {
      emptyIcon.className = 'w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3';
      emptyIcon.innerHTML = '<i data-lucide="check-circle-2" class="w-7 h-7"></i>';
      emptyTitle.textContent = 'Noch keine gelesenen Bücher erfasst';
      emptyText.textContent = 'Sobald du ein Buch beendet hast, kannst du es hierher verschieben und bewerten.';
    }
  } else {
    emptyState.classList.add('hidden');
    books.forEach(book => {
      booksGrid.appendChild(createBookCard(book));
    });
  }

  lucide.createIcons();
}

function createBookCard(book) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between';

  const starsHtml = renderStarRating(book.rating || 0);

  const coverHtml = book.coverUrl
    ? `<img src="${book.coverUrl}" alt="Cover" class="w-20 h-28 object-cover rounded-lg shadow-sm flex-shrink-0 bg-slate-100" onerror="this.onerror=null; this.src='https://placehold.co/80x120/e2e8f0/64748b?text=Cover';">`
    : `<div class="w-20 h-28 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-400 p-2 text-center flex-shrink-0">
         <i data-lucide="book" class="w-5 h-5 mb-1"></i>
         <span class="text-[9px]">Kein Cover</span>
       </div>`;

  const dateAddedFormatted = new Date(book.dateAdded).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  card.innerHTML = `
    <div>
      <div class="flex gap-4">
        ${coverHtml}
        <div class="flex-1 min-w-0">
          <h3 class="font-bold text-slate-900 text-base leading-snug line-clamp-2" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
          <p class="text-xs font-semibold text-slate-600 mt-1">${escapeHtml(book.authors)}</p>
          <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
            <span>${escapeHtml(book.publishYear || '')}</span>
            <span>•</span>
            <span class="font-mono text-[10px]">ISBN: ${escapeHtml(book.isbn || 'K.A.')}</span>
          </div>

          <!-- Sterne-Bewertung -->
          <div class="mt-2.5 flex items-center gap-1">
            ${starsHtml}
          </div>
        </div>
      </div>

      <!-- Inhaltszusammenfassung (Akkordeon / Vorschau) -->
      ${book.summary ? `
        <div class="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs text-slate-600">
          <div class="font-semibold text-slate-700 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
            <i data-lucide="file-text" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>Zusammenfassung</span>
          </div>
          <p class="line-clamp-3 hover:line-clamp-none transition-all cursor-pointer leading-relaxed" title="Klicken für gesamten Text">
            ${escapeHtml(book.summary)}
          </p>
        </div>
      ` : ''}

      <!-- Persönlicher Kommentar / Notiz -->
      <div class="mt-3 p-3 rounded-xl ${book.comment ? 'bg-amber-50/50 border border-amber-200/60' : 'bg-slate-50 border border-dashed border-slate-200'}">
        <div class="flex items-center justify-between text-[11px] mb-1">
          <span class="font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <i data-lucide="message-square" class="w-3.5 h-3.5 ${book.comment ? 'text-amber-500' : 'text-slate-400'}"></i>
            <span>Persönlicher Kommentar</span>
          </span>
          <button onclick="openEditModal('${book.id}')" class="text-sky-600 hover:text-sky-700 text-xs font-medium">
            ${book.comment ? 'Bearbeiten' : '+ Kommentar verfassen'}
          </button>
        </div>
        ${book.comment
          ? `<p class="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed mt-1">${escapeHtml(book.comment)}</p>`
          : `<p class="text-[11px] text-slate-400 italic">Noch keine persönlichen Notizen hinzugefügt.</p>`
        }
      </div>
    </div>

    <!-- Fußzeile / Aktionen -->
    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
      <span class="text-[11px] text-slate-400">Hinzugefügt: ${dateAddedFormatted}</span>

      <div class="flex items-center gap-1.5">
        <!-- Status Toggle Button -->
        ${book.status === 'wantToRead'
          ? `<button onclick="toggleBookStatus('${book.id}', 'read')" title="Als gelesen markieren" class="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium flex items-center gap-1 transition-colors">
               <i data-lucide="check" class="w-3.5 h-3.5"></i>
               <span>Gelesen</span>
             </button>`
          : `<button onclick="toggleBookStatus('${book.id}', 'wantToRead')" title="Zurück auf Leseliste" class="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium flex items-center gap-1 transition-colors">
               <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
               <span>Zurück zur Leseliste</span>
             </button>`
        }

        <!-- Edit Button -->
        <button onclick="openEditModal('${book.id}')" title="Details & Kommentar bearbeiten" class="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <i data-lucide="edit-3" class="w-4 h-4"></i>
        </button>

        <!-- Delete Button -->
        <button onclick="deleteBook('${book.id}')" title="Buch löschen" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;

  return card;
}

function renderStarRating(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= rating;
    html += `<i data-lucide="star" class="w-4 h-4 ${filled ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'}"></i>`;
  }
  return html;
}

// --- STATUS ÄNDERN & LÖSCHEN ---
function toggleBookStatus(id, newStatus) {
  const book = state.books.find(b => b.id === id);
  if (!book) return;

  book.status = newStatus;
  saveToStorage();
  renderCurrentList();
  showToast(newStatus === 'read' ? 'Zu „Gelesen“ verschoben!' : 'Zurück auf die „Leseliste“ gesetzt!');
}

function deleteBook(id) {
  const book = state.books.find(b => b.id === id);
  if (!book) return;

  if (confirm(`Möchtest du „${book.title}“ wirklich löschen?`)) {
    state.books = state.books.filter(b => b.id !== id);
    saveToStorage();
    renderCurrentList();
    showToast('Buch wurde gelöscht.');
  }
}

// --- MODAL & BEARBEITEN ---
function openModal(modalId) {
  document.getElementById(modalId)?.classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

function openEditModal(bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;

  state.editingBookId = bookId;
  document.getElementById('edit-book-id').value = book.id;
  document.getElementById('edit-modal-title').textContent = `„${book.title}“ bearbeiten`;

  if (book.status === 'read') {
    document.getElementById('status-read').checked = true;
  } else {
    document.getElementById('status-want-to-read').checked = true;
  }

  setRating(book.rating || 0);
  document.getElementById('edit-comment').value = book.comment || '';
  document.getElementById('edit-summary').value = book.summary || '';

  openModal('editModal');
  lucide.createIcons();
}

function setRating(val) {
  document.getElementById('edit-rating').value = val;
  const starButtons = document.querySelectorAll('#rating-stars .star-btn');
  starButtons.forEach((btn, idx) => {
    const icon = btn.querySelector('i');
    if (idx < val) {
      icon.className = 'w-6 h-6 text-amber-400 fill-amber-400';
    } else {
      icon.className = 'w-6 h-6 text-slate-300';
    }
  });
}

function saveBookEdits(event) {
  event.preventDefault();
  const id = state.editingBookId;
  const book = state.books.find(b => b.id === id);
  if (!book) return;

  const newStatus = document.querySelector('input[name="editStatus"]:checked')?.value || book.status;
  const newRating = parseInt(document.getElementById('edit-rating').value, 10) || 0;
  const newComment = document.getElementById('edit-comment').value.trim();
  const newSummary = document.getElementById('edit-summary').value.trim();

  book.status = newStatus;
  book.rating = newRating;
  book.comment = newComment;
  book.summary = newSummary;

  saveToStorage();
  closeModal('editModal');
  renderCurrentList();
  showToast('Änderungen gespeichert!');
}

function deleteCurrentEditingBook() {
  if (!state.editingBookId) return;
  closeModal('editModal');
  deleteBook(state.editingBookId);
}

// --- EXPORT & IMPORT (BACKUP) ---
function exportData() {
  const jsonStr = JSON.stringify(state.books, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const now = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buecher-tracker-backup-${now}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Backup erfolgreich exportiert!');
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) {
        throw new Error('Datei enthält keine Buchliste.');
      }

      if (confirm(`${imported.length} Bücher gefunden. Sollen diese importiert werden? (Bestehende Daten werden ergänzt)`)) {
        // Zusammenführen ohne Duplikate (nach id oder ISBN)
        const currentIds = new Set(state.books.map(b => b.id));
        imported.forEach(item => {
          if (!item.id || currentIds.has(item.id)) {
            item.id = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
          }
          state.books.push(item);
        });

        saveToStorage();
        closeModal('backupModal');
        renderCurrentList();
        showToast(`${imported.length} Bücher importiert!`);
      }
    } catch (err) {
      console.error(err);
      alert('Ungültige JSON-Datei! Bitte wähle ein gültiges Backup aus.');
    }
  };
  reader.readAsText(file);
}

// --- BEISPIELDATEN LADEN ---
function loadSampleData() {
  const sampleBooks = [
    {
      id: 'sample_1',
      title: 'Der Steppenwolf',
      authors: 'Hermann Hesse',
      publishYear: '1927',
      isbn: '9783518366752',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9783518366752-M.jpg',
      summary: 'Die Geschichte von Harry Haller, einem Intellektuellen in tiefer Lebenskrise, der sich zwischen seiner bürgerlichen Existenz und seiner wilden, ungezähmten Natur als Wolf hin- und hergerissen fühlt.',
      comment: 'Ein zeitloser Klassiker über die innere Zerrissenheit des modernen Menschen.',
      rating: 5,
      status: 'read',
      dateAdded: new Date(Date.now() - 86400000 * 5).toISOString()
    },
    {
      id: 'sample_2',
      title: 'Klara und die Sonne',
      authors: 'Kazuo Ishiguro',
      publishYear: '2021',
      isbn: '9783453273399',
      coverUrl: 'https://covers.openlibrary.org/b/isbn/9783453273399-M.jpg',
      summary: 'Klara ist eine künstliche Gefährtin mit herausragender Beobachtungsgabe, die von ihrem Platz im Geschäft aus das Verhalten der Kunden studiert. Eine bewegende Geschichte über Liebe, Menschlichkeit und Technologie.',
      comment: 'Wurde mir von Freunden empfohlen. Freue mich sehr darauf!',
      rating: 0,
      status: 'wantToRead',
      dateAdded: new Date().toISOString()
    }
  ];

  state.books = [...state.books, ...sampleBooks];
  saveToStorage();
  renderCurrentList();
  showToast('Beispieldaten wurden geladen!');
}

// --- TOAST NOTIFICATION ---
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 2800);
}

// --- HELPER ---
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
