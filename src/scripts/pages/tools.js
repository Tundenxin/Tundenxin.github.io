const searchInput = document.getElementById('toolSearchInput');
const clearBtn = document.getElementById('clearSearchBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const cards = document.querySelectorAll('.utility-card');
const noResults = document.getElementById('noResultsMsg');

let currentFilter = 'all';

function applyFilterAndSearch() {
  const query = (searchInput.value || '').trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach(card => {
    const categories = (card.dataset.category || '').toLowerCase().split(' ');
    const text = (card.textContent || '').toLowerCase();

    const matchesFilter = (currentFilter === 'all') || categories.includes(currentFilter);
    const matchesSearch = !query || text.includes(query);

    if (matchesFilter && matchesSearch) {
      card.classList.remove('is-hidden');
      visibleCount++;
    } else {
      card.classList.add('is-hidden');
    }
  });

  if (noResults) {
    noResults.hidden = visibleCount > 0;
  }
  if (clearBtn) {
    clearBtn.hidden = !query;
  }
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    applyFilterAndSearch();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', applyFilterAndSearch);
}

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    applyFilterAndSearch();
    searchInput.focus();
  });
}
