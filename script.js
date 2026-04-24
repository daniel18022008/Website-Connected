const searchInput = document.getElementById('site-search');
const resultsList = document.getElementById('search-results');
const searchRoot = document.getElementById('page-content');

const escapedRegex = /[.*+?^${}()|[\]\\]/g;

function setActivePageLink() {
  const pageLinks = document.querySelectorAll('.page-btn');
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';

  pageLinks.forEach((link) => {
    const linkPath = link.getAttribute('href');
    const isActive = linkPath === currentPath;
    link.classList.toggle('active', isActive);
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function clearHighlights() {
  if (!searchRoot) return;

  const highlighted = searchRoot.querySelectorAll('mark.search-hit');

  highlighted.forEach((mark) => {
    const textNode = document.createTextNode(mark.textContent || '');
    mark.replaceWith(textNode);
  });

  searchRoot.normalize();
}

function getSearchableNodes() {
  if (!searchRoot) return [];

  const walker = document.createTreeWalker(searchRoot, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.textContent?.trim() ?? '';

      if (!value) {
        return NodeFilter.FILTER_REJECT;
      }

      if (node.parentElement?.closest('mark.search-hit')) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  let current;

  while ((current = walker.nextNode())) {
    nodes.push(current);
  }

  return nodes;
}

function buildMatches(query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const nodes = getSearchableNodes();
  const matches = [];

  nodes.forEach((node) => {
    const text = node.textContent || '';
    const index = text.toLowerCase().indexOf(normalizedQuery);

    if (index !== -1) {
      matches.push({
        node,
        preview: text.trim().slice(0, 90)
      });
    }
  });

  return matches;
}

function renderResults(matches, query) {
  resultsList.innerHTML = '';

  if (!query || matches.length === 0) {
    resultsList.hidden = true;
    return;
  }

  matches.forEach((match, i) => {
    const li = document.createElement('li');
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = `${i + 1}. ${match.preview}`;
    button.addEventListener('click', () => {
      jumpToMatch(match, query);
      resultsList.hidden = true;
    });

    li.appendChild(button);
    resultsList.appendChild(li);
  });

  resultsList.hidden = false;
}

function jumpToMatch(match, query) {
  clearHighlights();

  const sourceText = match.node.textContent || '';
  const safeQuery = query.replace(escapedRegex, '\\$&');
  const matcher = new RegExp(safeQuery, 'i');
  const found = sourceText.match(matcher);

  if (!found) return;

  const start = found.index || 0;
  const end = start + found[0].length;

  const range = document.createRange();
  range.setStart(match.node, start);
  range.setEnd(match.node, end);

  const mark = document.createElement('mark');
  mark.className = 'search-hit';

  range.surroundContents(mark);
  mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

setActivePageLink();

if (searchInput && resultsList) {
  searchInput.addEventListener('input', (event) => {
    const query = event.target.value;
    clearHighlights();
    const matches = buildMatches(query);
    renderResults(matches, query);
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && !target.closest('.search-wrap')) {
      resultsList.hidden = true;
    }
  });
}

function setRandomHeroImages() {
  const heroImages = document.querySelectorAll('.js-hero-image');
  if (heroImages.length === 0) return;

  const imagePool = Array.from({ length: 16 }, (_, i) => `Images/Games/img${i + 1}.jpg`);
  const shuffled = imagePool.sort(() => Math.random() - 0.5);

  heroImages.forEach((image, index) => {
    image.src = shuffled[index % shuffled.length];
  });
}

setRandomHeroImages();

function startHeroStripRotation() {
  const heroImages = Array.from(document.querySelectorAll('.js-hero-image'));
  const heroVideos = Array.from(document.querySelectorAll('.js-strip-video'));
  if (heroImages.length === 0) return;

  heroVideos.forEach((video) => {
    if (video instanceof HTMLVideoElement) {
      video.pause();
      video.currentTime = 0;
    }
  });

  window.setInterval(() => {
    const available = heroImages.filter((image) => !image.classList.contains('is-transparent'));
    if (available.length === 0) return;

    const strip = available[Math.floor(Math.random() * available.length)];
    const stripIndex = heroImages.indexOf(strip);
    const stripVideo = heroVideos[stripIndex];
    const invisiblePause = 5000 + Math.floor(Math.random() * 5001);

    if (stripVideo instanceof HTMLVideoElement) {
      const duration = Number.isFinite(stripVideo.duration) ? stripVideo.duration : 0;
      stripVideo.currentTime = duration > 0 ? Math.random() * duration : 0;
      stripVideo.classList.add('is-active');
      stripVideo.play().catch(() => {});
    }

    strip.classList.add('is-transparent');
    window.setTimeout(() => {
      strip.classList.remove('is-transparent');
      if (stripVideo instanceof HTMLVideoElement) {
        stripVideo.classList.remove('is-active');
        stripVideo.pause();
      }
    }, 2000 + invisiblePause);
  }, 5000);
}

startHeroStripRotation();

const reelModal = document.getElementById('reel-modal');
const openReelButton = document.querySelector('.js-open-reel');
const closeReelButtons = document.querySelectorAll('.js-close-reel');
const reelVideo = reelModal?.querySelector('.reel-video');

function closeReel() {
  if (!reelModal) return;
  reelModal.hidden = true;
  if (reelVideo instanceof HTMLVideoElement) {
    reelVideo.pause();
  }
}

function openReel() {
  if (!reelModal) return;
  reelModal.hidden = false;
  if (reelVideo instanceof HTMLVideoElement) {
    reelVideo.currentTime = 0;
    reelVideo.play().catch(() => {});
  }
}

if (openReelButton) {
  openReelButton.addEventListener('click', openReel);
}

closeReelButtons.forEach((button) => {
  button.addEventListener('click', closeReel);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeReel();
  }
});
