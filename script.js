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
  const sampleSize = 24;
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let animationFrameId;
  let lastSampleTime = 0;
  let smoothed = [103, 178, 255];

  function setGradientColor([r, g, b]) {
    document.documentElement.style.setProperty(
      '--top-bar-dynamic-rgb',
      `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`
    );
  }

  function sampleFrameColor() {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

    try {
      ctx.drawImage(video, 0, 0, sampleSize, sampleSize);
      const pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;
      let count = 0;

      for (let i = 0; i < pixels.length; i += 4) {
        redTotal += pixels[i];
        greenTotal += pixels[i + 1];
        blueTotal += pixels[i + 2];
        count += 1;
      }

      if (!count) return null;
      return [redTotal / count, greenTotal / count, blueTotal / count];
    } catch (_error) {
      return null;
    }
  }

  function tick(timestamp) {
    if (!video.paused && !video.ended && timestamp - lastSampleTime >= 120) {
      lastSampleTime = timestamp;
      const sampled = sampleFrameColor();

      if (sampled) {
        const smoothing = 0.26;
        smoothed = smoothed.map((value, index) => {
          return value + (sampled[index] - value) * smoothing;
        });
        setGradientColor(smoothed);
      }
    }

    animationFrameId = window.requestAnimationFrame(tick);
  }

  function startSampling() {
    if (animationFrameId) return;
    animationFrameId = window.requestAnimationFrame(tick);
  }

  function stopSampling() {
    if (!animationFrameId) return;
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }

  video.addEventListener('loadeddata', () => {
    const sampled = sampleFrameColor();
    if (sampled) {
      smoothed = sampled;
      setGradientColor(smoothed);
    }
  });
  video.addEventListener('play', startSampling);
  video.addEventListener('pause', stopSampling);
  video.addEventListener('ended', stopSampling);

  if (!video.paused) {
    startSampling();
  }
}

