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
initHeaderDynamicGradientColor();

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


function initHeaderDynamicGradientColor() {
  const video = document.querySelector('.games-video');
  if (!(video instanceof HTMLVideoElement)) return;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  function applyAverageColor() {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    try {
      ctx.drawImage(video, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      document.documentElement.style.setProperty('--top-bar-dynamic-rgb', `${r}, ${g}, ${b}`);
    } catch (_error) {
      // Ignore frame sampling errors and keep the fallback color variable.
    }
  }

  let colorInterval;

  function startSampling() {
    applyAverageColor();
    if (colorInterval) return;
    colorInterval = window.setInterval(applyAverageColor, 700);
  }

  function stopSampling() {
    if (!colorInterval) return;
    window.clearInterval(colorInterval);
    colorInterval = undefined;
  }

  video.addEventListener('loadeddata', applyAverageColor);
  video.addEventListener('play', startSampling);
  video.addEventListener('pause', stopSampling);
  video.addEventListener('ended', stopSampling);

  if (!video.paused) {
    startSampling();
  } else {
    applyAverageColor();
  }
}
