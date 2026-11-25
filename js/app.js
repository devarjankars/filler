/**
 * app.js — Navigation & UI logic for the HA Filler Differentiator
 *
 * Responsibilities:
 *  - showView(viewId)       → switch between #home and #app
 *  - navigateTo(sectionId)  → from home cards, go to app + show section
 *  - showSection(id, event) → switch content section inside the app shell
 *  - switchTab / switchFillerTab / switchGraphTable — tab & toggle helpers
 *  - Modal open/close helpers
 *  - Sidebar mobile toggle
 *  - Filler Selection body-part interaction
 *  - Products bar toggle
 *
 * NOTE: product data, chart rendering, and product grid
 *       are handled by product.js (loaded before this file).
 */

"use strict";

/* ═════════════════════════════════════════════════
   View switching — Home ↔ App
   ═════════════════════════════════════════════════ */

/**
 * Show either the home page or the app shell.
 * @param {'home'|'app'} viewId
 */
function showView(viewId) {
  if (viewId === 'home' && document.getElementById('app').classList.contains('active') &&
      typeof resetProductSelection === 'function') {
    resetProductSelection();
  }
  if (viewId !== 'app') {
    closeRheologyPopups();
    resetOverviewVideos();
    resetCohesivityScroll();
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');

  // Close mobile sidebar when navigating
  closeMobileSidebar();
  if (viewId === 'home') window.scrollTo({ top: 0, behavior: 'instant' });
}

/**
 * Called from home-page cards. Switch to the app view
 * and activate the requested section.
 * @param {string} sectionId
 */
function navigateTo(sectionId) {
  showView('app');
  showSection(sectionId, null);
}

function resetOverviewVideos() {
  document.querySelectorAll('.overview-video').forEach(resetVideo);
}

function resetVideo(video) {
  if (!video.paused || video.currentTime > 0) video.load();
}

function resetCohesivityScroll() {
  const content = document.querySelector('#rheology-content .rheo-card-scroll-content');
  if (content) content.scrollTop = 0;
}

function switchOverviewPage(pageNumber) {
  const targetPage = document.getElementById(`overview-page-${pageNumber}`);
  if (!targetPage) {
    console.error(`Overview page could not be found: ${pageNumber}`);
    return;
  }

  if (pageNumber !== 1) resetOverviewVideos();
  const pageChanged = targetPage.hidden;

  document.querySelectorAll('.overview-page').forEach(page => {
    page.hidden = page !== targetPage;
  });

  document.querySelectorAll('[data-overview-footnote]').forEach(footnote => {
    footnote.hidden = Number(footnote.dataset.overviewFootnote) !== pageNumber;
  });

  document.querySelectorAll('[data-overview-page]').forEach(button => {
    const isActive = Number(button.dataset.overviewPage) === pageNumber;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const previousButton = document.querySelector('[data-overview-previous]');
  const nextButton = document.querySelector('[data-overview-next]');
  if (previousButton) previousButton.disabled = pageNumber === 1;
  if (nextButton) nextButton.disabled = pageNumber === 2;
  if (pageChanged) resetSectionScroll(targetPage);
}

function switchManufacturingPage(pageNumber) {
  const section = document.getElementById('properties-content');
  const targetPage = section?.querySelector(`#manufacturing-page-${pageNumber}`);
  if (!section || !targetPage) {
    console.error(`Manufacturing process page could not be found: ${pageNumber}`);
    return;
  }

  const pageChanged = targetPage.hidden;
  section.querySelectorAll('.manufacturing-page').forEach(page => {
    page.hidden = page !== targetPage;
  });
  section.querySelectorAll('[data-manufacturing-footnote]').forEach(footnote => {
    footnote.hidden = Number(footnote.dataset.manufacturingFootnote) !== pageNumber;
  });
  section.querySelectorAll('[data-manufacturing-page]').forEach(button => {
    const isActive = Number(button.dataset.manufacturingPage) === pageNumber;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const previousButton = section.querySelector('[data-manufacturing-previous]');
  const nextButton = section.querySelector('[data-manufacturing-next]');
  if (previousButton) previousButton.disabled = pageNumber === 1;
  if (nextButton) nextButton.disabled = pageNumber === section.querySelectorAll('.manufacturing-page').length;
  if (pageChanged) resetSectionScroll(targetPage);
}

function switchOverviewStressTab(button, panelId) {
  const tabs = button.closest('.overview-stress-tabs');
  const panel = tabs?.querySelector(`#${panelId}`);
  if (!tabs || !panel) {
    console.error(`Overview stress panel could not be found: ${panelId}`);
    return;
  }

  const panelChanged = panel.hidden;
  tabs.querySelectorAll('[role="tab"]').forEach(tab => {
    const isActive = tab === button;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  tabs.querySelectorAll('.overview-stress-panel').forEach(stressPanel => {
    const isActive = stressPanel === panel;
    stressPanel.classList.toggle('active', isActive);
    stressPanel.hidden = !isActive;
  });
  if (panelChanged) resetSectionScroll(panel);
}

let manufacturingModalTrigger = null;
let rheologyModalTrigger = null;
let physicochemicalModalTrigger = null;

function openRheologyPopup(trigger) {
  const modal = document.getElementById('rheologyInfoModal');
  const closeButton = modal?.querySelector('.rheology-popup-close');
  const topic = trigger.dataset.rheologyTopic;
  const selectedContent = modal?.querySelector(`[data-rheology-content="${topic}"]`);
  if (!modal || !closeButton || !topic || !selectedContent) {
    console.error('Rheology popup could not be found.');
    return;
  }

  modal.querySelectorAll('[data-rheology-content]').forEach(content => {
    content.hidden = content !== selectedContent;
    if (content.hidden) content.querySelectorAll('video').forEach(resetVideo);
  });
  rheologyModalTrigger = trigger;
  openModal('rheologyInfoModal');
  closeButton.focus();
}

function openPhysicochemicalPopup(trigger, playVideo = false) {
  const modal = document.getElementById('physicochemicalInfoModal');
  const closeButton = modal?.querySelector('.rheology-popup-close');
  if (!modal || !closeButton) {
    console.error('Physicochemical popup could not be found.');
    return;
  }

  physicochemicalModalTrigger = trigger;
  openModal('physicochemicalInfoModal');
  closeButton.focus();

  if (playVideo) {
    const video = modal.querySelector('video');
    if (!video) {
      console.error('Water uptake assay video could not be found.');
      return;
    }

    video.play().catch(error => {
      if (error.name !== 'AbortError') {
        console.error('Water uptake assay video could not be played.', error);
      }
    });
  }
}

function openManufacturingPopup(panelId, trigger) {
  const modal = document.getElementById('manufacturingInfoModal');
  const panel = document.getElementById(panelId);
  const tab = modal?.querySelector(`[aria-controls="${panelId}"]`);
  if (!modal || !panel || !tab) {
    console.error(`Manufacturing popup content could not be found: ${panelId}`);
    return;
  }

  const topicGroup = tab.dataset.manufacturingGroup;
  modal.querySelectorAll('.manufacturing-topic-tab').forEach(topicTab => {
    topicTab.hidden = topicTab.dataset.manufacturingGroup !== topicGroup;
  });
  manufacturingModalTrigger = trigger;
  switchManufacturingTopic(tab, panelId);
  openModal('manufacturingInfoModal');
  modal.querySelector('.manufacturing-modal-close')?.focus();
}

function switchManufacturingTopic(button, panelId) {
  const modal = document.getElementById('manufacturingInfoModal');
  const targetPanel = modal?.querySelector(`#${panelId}`);
  if (!targetPanel) {
    console.error(`Manufacturing topic panel could not be found: ${panelId}`);
    return;
  }

  const panelChanged = targetPanel.hidden;
  modal.querySelectorAll('.manufacturing-topic-tab').forEach(tab => {
    const isActive = tab === button;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  modal.querySelectorAll('.manufacturing-topic-panel').forEach(panel => {
    panel.hidden = panel.id !== panelId;
  });
  if (panelChanged) resetScrollPositions(modal.querySelector('.manufacturing-modal-content'));
}

function switchManufacturingDetail(button, panelId) {
  const topicPanel = button.closest('.manufacturing-topic-panel');
  const targetPanel = topicPanel?.querySelector(`#${panelId}`);
  if (!targetPanel) {
    console.error(`Manufacturing detail panel could not be found: ${panelId}`);
    return;
  }

  const panelChanged = targetPanel.hidden;
  topicPanel.querySelectorAll('.manufacturing-subtab').forEach(tab => {
    const isActive = tab === button;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
  topicPanel.querySelectorAll('.manufacturing-detail-panel').forEach(panel => {
    panel.hidden = panel.id !== panelId;
  });
  if (panelChanged) resetScrollPositions(topicPanel.closest('.manufacturing-modal-content'));
}


/* ═════════════════════════════════════════════════
   Section switching inside the App shell
   ═════════════════════════════════════════════════ */

/**
 * Activate a content section and update sidebar state.
 * @param {string} id       - section element ID
 * @param {Event|null} event - originating click event (may be null)
 */
function showSection(id, event) {
 
  if (id !== 'product-selection' && id !== 'graphContainer' &&
      document.querySelector('#product-selection.active, #graphContainer.active')) {
    resetProductSelection();
    
   
  }
  closeRheologyPopups();
  if (id !== 'mechanical') resetOverviewVideos();
  if (id !== 'rheology-content') resetCohesivityScroll();
  // 1. Hide all content sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

  // 2. Show the target section
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  if (id === 'mechanical') switchOverviewPage(1);
  if (id === 'properties-content') switchManufacturingPage(1);
  if (id === 'FillerSelection' && typeof syncFaceMarkerSize === 'function') {
    const defaultArea = target.querySelector('.bodypartcontainer[data-img="1"]');
    if (!defaultArea.classList.contains('active')) defaultArea.click();
    target.querySelector('#mobile-region-preview').hidden = true;
    syncFaceMarkerSize();
  }

  // 3. Update sidebar menu items (active state + icon swap)
  updateSidebarMenuItems(id);

  // 4. Update timeline items
  updateTimeline(id, event);

  // 5. Show/hide the Rheology timeline
  const rheologyTimeline = document.getElementById('rheology-timeline');
  const productSelection = document.getElementById('product-selection');
  const rheologyIds = ['mechanical', 'rheology-content', 'viscoelasticity', 'physiocochemical-features', 'properties-content'];
  // if (rheologyTimeline) {
  //   rheologyTimeline.style.display = rheologyIds.includes(id) ? 'flex' : 'none';
  // }
if (id === "product-selection") {
  document.querySelector('#sidebar').classList.remove('sidebar-active');
}else{
  document.querySelector('#sidebar').classList.add('sidebar-active');
}
  // 6. Section-specific side-effects
  if (id === 'graphContainer') {
  // resetTissueIntegrationtoggle();
    // Ensure chart section is visible and charts render properly
    setTimeout(() => {
      if (window.myChartInstance) window.myChartInstance.resize();
      if (window.liftChartInstance) window.liftChartInstance.resize();
      if (window.extrusionChartInstance) window.extrusionChartInstance.resize();
    }, 100);
  }

  // 7. Close mobile sidebar after navigating
  closeMobileSidebar();
  if (target) resetSectionScroll(target);
}

/**
 * Update sidebar menu-item active states and icon images.
 * @param {string} activeSectionId
 */
function updateSidebarMenuItems(activeSectionId) {
  const menuMap = {
    mechanical: 'mechanical',
    'rheology-content': 'mechanical',
    viscoelasticity: 'mechanical',
    'physiocochemical-features': 'mechanical',
    'properties-content': 'mechanical',
    FillerSelection: 'FillerSelection',
    'product-selection': 'product-selection',
    graphContainer: 'product-selection',
  };

  const activeMenu = menuMap[activeSectionId] || activeSectionId;

  document.querySelectorAll('.menu-item').forEach(item => {
    const section = item.dataset.section;
    const img = item.querySelector('img');
    const isActive = section === activeMenu;

    item.classList.toggle('active', isActive);
    if (img) {
      img.src = isActive
        ? (item.dataset.activeIcon || img.src)
        : (item.dataset.inactiveIcon || img.src);
    }
  });
}

/**
 * Update which timeline item is highlighted.
 * @param {string} id
 * @param {Event|null} event
 */
function updateTimeline(id, event) {
  document.querySelectorAll('.timeline-item').forEach(t => t.classList.remove('active'));

  // If user clicked a timeline item directly, use that
  let itemToActivate = null;
  if (event) {
    itemToActivate = event.target.closest('.timeline-item');
  }

  // Otherwise match by data-section attribute
  if (!itemToActivate) {
    itemToActivate = document.querySelector(`.timeline-item[data-section="${id}"]`);
  }

  if (itemToActivate) itemToActivate.classList.add('active');
}


/* ═════════════════════════════════════════════════
   Tab helpers
   ═════════════════════════════════════════════════ */

/**
 * Switch tabs within the mechanical stress section (Shear / Compression).
 * @param {HTMLElement} btn
 * @param {string} tabId - 'shear' | 'compression'
 */
function switchTab(btn, tabId) {
  // Button states
  btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Panel visibility
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('tab-' + tabId);
  if (panel) panel.classList.add('active');
}

/**
 * Switch top-level filler property tabs (Lift / Extrusion / Tissue).
 * @param {HTMLElement} btn
 * @param {string} tabId - 'lift' | 'extrusion' | 'tissue'
 */
function switchFillerTab(btn, tabId) {
  // resetTissueIntegrationtoggle();
  const pane = document.getElementById('pane-' + tabId);
  const paneChanged = pane && !pane.classList.contains('active');
  document.querySelectorAll('.filler-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('#fillerTabsContent .tab-pane').forEach(p => p.classList.remove('active'));
  if (pane) pane.classList.add('active');
  document.getElementById('graphContainer')?.classList.add('filler-pane-open');
  document.querySelector('.filler-body').style.display = "none";
  document.getElementById('GoBack').style.display = "";
  if (paneChanged) {
    if (tabId === 'tissue') document.getElementById('week1').click();
    resetSectionScroll(pane);
  }
  // Re-render / resize charts when their tab becomes visible
  // (canvas has 0 dimensions while the pane is hidden)
  setTimeout(() => {
    if (tabId === 'lift') {
      if (typeof liftChart !== 'undefined' && liftChart) {
        liftChart.resize();
      } else if (typeof renderLiftCapacityChart === 'function' && typeof selectedProducts !== 'undefined' && selectedProducts.length > 0) {
        renderLiftCapacityChart(selectedProducts);
      }
    } else if (tabId === 'extrusion') {
      if (typeof ExtrusionChart !== 'undefined' && ExtrusionChart) {
        ExtrusionChart.resize();
      }
    }
  }, 50);
}

// function resetswitchFillertab(){
//   document.querySelectorAll('.filler-tab-btn').forEach(b => b.classList.remove('active'));

// }



function resizeScatterChart(stopAnimation = false) {
  const graphEl = document.getElementById('scattergraphContainer');
  const canvas = graphEl?.querySelector('canvas');
  const chart = canvas && typeof Chart !== 'undefined' && typeof Chart.getChart === 'function'
    ? Chart.getChart(canvas)
    : null;
  if (!chart || graphEl.style.display === 'none') return;

  const graphStyle = getComputedStyle(graphEl);
  const width = graphEl.clientWidth
    - parseFloat(graphStyle.paddingLeft)
    - parseFloat(graphStyle.paddingRight);
  const height = graphEl.clientHeight
    - parseFloat(graphStyle.paddingTop)
    - parseFloat(graphStyle.paddingBottom);
  if (width <= 0 || height <= 0) return;

  if (stopAnimation) chart.stop();
  chart.resize(width, height);
}

/**
 * Toggle between Graph and Table view.
 * @param {'graph'|'table'} mode
 * @param {boolean} [inFullscreen=false]
 */
function switchGraphTable(mode, inFullscreen = false) {
  const graphEl = document.getElementById('scattergraphContainer');
  const tableEl = document.getElementById('tableContainer');
  const showBtn = document.getElementById('showGraph');
  const tableBtn = document.getElementById('showTable');
  const fsGraphBtn = document.getElementById('fsShowGraph');
  const fsTableBtn = document.getElementById('fsShowTable');

  const showGraph = mode === 'graph';

  if (graphEl) graphEl.style.display = showGraph ? 'block' : 'none';
  if (tableEl) tableEl.style.display = showGraph ? 'none' : 'block';

  // Normal toggle buttons
  if (showBtn) showBtn.classList.toggle('active', showGraph);
  if (tableBtn) tableBtn.classList.toggle('active', !showGraph);

  // Fullscreen toggle buttons
  if (fsGraphBtn) fsGraphBtn.classList.toggle('active', showGraph);
  if (fsTableBtn) fsTableBtn.classList.toggle('active', !showGraph);

  if (showGraph) resizeScatterChart(inFullscreen);
}


/* ═════════════════════════════════════════════════
   Modal helpers
   ═════════════════════════════════════════════════ */

/**
 * Open a modal overlay by ID.
 * @param {string} modalId
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('open');
  syncPopupScrollLock();
}

let popupPageScrollY = 0;

function syncPopupScrollLock() {
  const root = document.documentElement;
  const body = document.body;
  const hasPopup = Boolean(document.querySelector('.modal-overlay.open, .popup.open, .fullscreen-modal.open'));
  if (hasPopup === body.classList.contains('modal-open')) return;

  if (hasPopup) {
    popupPageScrollY = window.scrollY;
    body.style.setProperty('--popup-lock-scroll', `-${popupPageScrollY}px`);
    root.classList.add('modal-open');
    body.classList.add('modal-open');
  } else {
    body.classList.remove('modal-open');
    root.classList.remove('modal-open');
    body.style.removeProperty('--popup-lock-scroll');
    window.scrollTo({ top: popupPageScrollY, behavior: 'instant' });
  }
}

function closeRheologyPopups() {
  document.querySelectorAll('.rheology-modal-overlay.open').forEach(modal => closeModal(modal.id));
}

function resetSectionScroll(section) {
  section.closest('.main-content')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  resetScrollPositions(section);
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function resetScrollPositions(container) {
  for (const element of [container, ...container.querySelectorAll('*')]) {
    if (element.scrollTop || element.scrollLeft) {
      element.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }
}

/**
 * Close a modal overlay by ID.
 * @param {string} modalId
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    resetScrollPositions(modal);
    modal.classList.remove('open');
    modal.querySelectorAll('video').forEach(resetVideo);
  }
  syncPopupScrollLock();

  if (modalId === 'manufacturingInfoModal' && manufacturingModalTrigger instanceof HTMLElement) {
    manufacturingModalTrigger.focus({ preventScroll: true });
    manufacturingModalTrigger = null;
  }
  if (modalId === 'rheologyInfoModal' && rheologyModalTrigger instanceof HTMLElement) {
    rheologyModalTrigger.focus({ preventScroll: true });
    rheologyModalTrigger = null;
  }
  if (modalId === 'physicochemicalInfoModal' && physicochemicalModalTrigger instanceof HTMLElement) {
    physicochemicalModalTrigger.focus({ preventScroll: true });
    physicochemicalModalTrigger = null;
  }
}

document.addEventListener('dragstart', event => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});

// Escape closes fullscreen views, but modal dialogs stay open until dismissed explicitly.
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeFullscreen();
    return;
  }

  const modal = document.getElementById('manufacturingInfoModal');
  if (!modal?.classList.contains('open')) return;

  if (e.key === 'Tab') {
    const focusable = Array.from(modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const tablist = e.target.closest('.manufacturing-topic-tabs, .manufacturing-subtabs');
    if (!tablist) return;
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const currentIndex = tabs.indexOf(e.target);
    if (currentIndex < 0) return;

    e.preventDefault();
    const direction = e.key === 'ArrowRight' ? 1 : -1;
    const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
    nextTab.focus();
    nextTab.click();
  }
});


/* ═════════════════════════════════════════════════
   Clear All confirm
   ═════════════════════════════════════════════════ */

function confirmClearAll() {
  clearAllProducts();
  closeModal('confirmClearAllModal');
}


/* ═════════════════════════════════════════════════
   Fullscreen
   ═════════════════════════════════════════════════ */

let fullscreenElements = null;

function openFullscreen() {
  const modal = document.getElementById('fullscreenModal');
  const content = document.getElementById('fullscreenContent');
  const graphEl = document.getElementById('scattergraphContainer');
  const tableEl = document.getElementById('tableContainer');

  if (!modal || !content || !graphEl || !tableEl) {
    console.error('Fullscreen graph and table elements could not be found.');
    return;
  }

  if (fullscreenElements) return;

  const pageHeading = document.getElementById('filler-heading');
  const fullscreenHeading = modal.querySelector('.fullscreen-header h1');
  if (pageHeading && fullscreenHeading) {
    fullscreenHeading.textContent = pageHeading.textContent;
  }

  const elements = [graphEl, tableEl].map(element => {
    const placeholder = document.createComment('');
    const parent = element.parentNode;
    parent.insertBefore(placeholder, element);
    return { element, parent, placeholder };
  });

  fullscreenElements = elements;
  const chartCanvas = graphEl.querySelector('canvas');
  const chart = chartCanvas && typeof Chart !== 'undefined' && typeof Chart.getChart === 'function'
    ? Chart.getChart(chartCanvas)
    : null;
  if (chart) chart.stop();
  content.replaceChildren(...elements.map(({ element }) => element));
  modal.classList.add('open');
  syncPopupScrollLock();
  switchGraphTable(graphEl.style.display === 'none' ? 'table' : 'graph', true);
}

function closeFullscreen() {
  const modal = document.getElementById('fullscreenModal');
  const content = document.getElementById('fullscreenContent');
  if (!modal) return;

  if (modal.classList.contains('open')) resetScrollPositions(modal);
  fullscreenElements?.forEach(({ element, parent, placeholder }) => {
    if (placeholder.parentNode) {
      placeholder.replaceWith(element);
    } else {
      parent.append(element);
    }
  });
  fullscreenElements = null;
  content?.replaceChildren();
  modal.classList.remove('open');
  syncPopupScrollLock();
  resizeScatterChart(true);
}


/* ═════════════════════════════════════════════════
   Popup (proceed confirmation)
   ═════════════════════════════════════════════════ */

function closePopup() {
  closeModal('confirmPopup');
}

function continueAction() {
  closeModal('confirmPopup');
  resetTissueIntegrationtoggle();
  showSection('graphContainer', null);

  // Show the products bar when entering graph view
  const bar = document.getElementById('productsBar');
  if (bar) bar.style.display = 'none';

  // Show Go Back button
  const goBack = document.getElementById('GoBack');
  goBack.addEventListener('click', () => {
    showSection('graphContainer', null);
    // Hide the products bar when going back to product selection
    if (goBack) goBack.style.display = 'none';
    document.getElementById('graphContainer')?.classList.remove('filler-pane-open');
    document.querySelector('.filler-body').style.display = "block";
    document.querySelectorAll('#fillerTabsContent .tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.filler-tab-btn').forEach(b => b.classList.remove('active'));
    // document.querySelectorAll('.tab-pane tissue-btn').forEach(b => b.classList.remove('active'));
   resetTissueIntegrationtoggle();
    
    
  });
  // if (goBack) goBack.style.display = 'flex';

  // Render charts — this function is defined in product.js
  if (typeof renderChartsForSelected === 'function') {
    renderChartsForSelected();
  }
}

function onProceed() {
  openModal('confirmPopup');
}

function confirmProducts() {
  continueAction();
}


/* ═════════════════════════════════════════════════
   Products bar (sticky, expandable)
   ═════════════════════════════════════════════════ */

function toggleProductsBar() {
  const content = document.getElementById('productsBarContent');
  const arrow = document.getElementById('productsBarArrow');
  if (!content) return;
  const isOpen = content.classList.toggle('open');
  if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
}


/* ═════════════════════════════════════════════════
   Tissue Integration — week / type switches
   ═════════════════════════════════════════════════ */

let currentTissueWeek = 'Week1';
let currentTissueType = 'all';

function switchTissueWeek(btn, week) {
  document.querySelectorAll('.tissue-week-btns .tissue-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTissueWeek = week;
  if (typeof renderTissueImages === 'function') {
    renderTissueImages(currentTissueWeek, currentTissueType);
  }
}

function switchTissueType(btn, type) {
  document.querySelectorAll('.tissue-type-btns .tissue-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTissueType = type;
  if (typeof renderTissueImages === 'function') {
    renderTissueImages(currentTissueWeek, currentTissueType);
  }
  
}

function resetTissueIntegrationtoggle(){
  //  currentTissueWeek = 'Week1';
  //   currentTissueType = 'all';
   document.querySelector('.filler-body').style.display = 'block';

    // Remove filler expanded-pane state
    document.getElementById('graphContainer').classList.remove('filler-pane-open');

    // Hide Go Back button
    document.getElementById('GoBack').style.display = 'none';

    // Reset heading
    document.getElementById('filler-heading').textContent = 'Product Comparison';

    // Reset filler tab buttons
    document.querySelectorAll('.filler-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Hide Lift, Extrusion and Tissue panes
    document.querySelectorAll('#fillerTabsContent .tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    // Reset Graph / Table to Graph
    switchGraphTable('graph');

  activeWeek="Week1";
  activeLayer="All";
      document.querySelectorAll('.tissue-week-btns .tissue-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tissue-week-btns .tissue-btn')[0].classList.add('active')

    document.querySelectorAll('.tissue-type-btns .tissue-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tissue-type-btns .tissue-btn')[0].classList.add('active');
  document.querySelectorAll(' .tab-pane').forEach(p => p.classList.remove('active'));




    // Reset heading


    

 renderTissueIntefration(selectedProducts);

   

}





/* ═════════════════════════════════════════════════
   Filler Selection — body part interaction
   ═════════════════════════════════════════════════ */

/**
 * Called when a body-part button is clicked.
 * Updates the face marker overlay and the large area image.
 * @param {HTMLElement} btn
 */
function selectBodyPart(btn) {
  // Update active state
  document.querySelectorAll('.body-part-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Update marker image
  const markerImg = document.getElementById('image-marker');
  if (markerImg && btn.dataset.marker) {
    markerImg.src = btn.dataset.marker;
    markerImg.style.visibility = 'visible';
  }

  // Update the large area image shown to the right
  const areaImg = document.getElementById('selected-area-img');
  if (areaImg && btn.dataset.areaImg) {
    areaImg.src = btn.dataset.areaImg;
  }
}

// Initialise with forehead on load
document.addEventListener('DOMContentLoaded', () => {
  const defaultPart = document.querySelector('.body-part-btn[data-img="1"]');
  if (defaultPart) selectBodyPart(defaultPart);
});


/* ═════════════════════════════════════════════════
   Mobile sidebar toggle
   ═════════════════════════════════════════════════ */

const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const sidebarClose = document.getElementById('sidebarClose');
let mobileSidebarScrollY = 0;

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) closeMobileSidebar();
    else openMobileSidebar();
    
      document.getElementById("sidebarToggle").classList.remove("active");
  
  });
}
if (sidebarClose) sidebarClose.addEventListener('click', closeMobileSidebar);
if (sidebarBackdrop) {
  sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  //  document.getElementById("sidebarToggle").classList.add("active");
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && sidebar?.classList.contains('open')) closeMobileSidebar();
});

function openMobileSidebar() {
  if (sidebar) sidebar.classList.add('open');
  if (sidebarBackdrop) sidebarBackdrop.classList.add('open');
  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-expanded', 'true');
    sidebarToggle.setAttribute('aria-label', 'Close navigation menu');
  }
  if (!document.body.classList.contains('sidebar-open')) {
    mobileSidebarScrollY = window.scrollY;
    document.body.style.setProperty('--sidebar-lock-scroll', `-${mobileSidebarScrollY}px`);
    document.documentElement.classList.add('sidebar-open');
    document.body.classList.add('sidebar-open');
  }
}

function closeMobileSidebar() {
  if (sidebar) sidebar.classList.remove('open');
  if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
  if (sidebarToggle) {
    sidebarToggle.setAttribute('aria-expanded', 'false');
    sidebarToggle.setAttribute('aria-label', 'Open navigation menu');
  }
  if (document.body.classList.contains('sidebar-open')) {
    document.body.classList.remove('sidebar-open');
    document.documentElement.classList.remove('sidebar-open');
    document.body.style.removeProperty('--sidebar-lock-scroll');
    window.scrollTo(0, mobileSidebarScrollY);
  }
  if (sidebarToggle) sidebarToggle.classList.add('active');
}

/* ═════════════════════════════════════════════════
   Initialisation on page load
   ═════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Show the home view by default
  showView('home');

  document.querySelectorAll('#home .home-card').forEach(card => {
    card.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' && !card.disabled) card.classList.add('is-pressed');
    });
    const release = () => card.classList.remove('is-pressed');
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  });

  const phoneLandscapeQuery = window.matchMedia(
    '(orientation: landscape) and (max-width: 950px)'
  );
  const tabletPortraitQuery = window.matchMedia(
    '(orientation: portrait) and (min-width: 600px) and (width < 951px)'
  );
  const orientationLock = document.querySelector('.orientation-lock');
  let previouslyFocusedElement = null;

  const updateOrientationLock = () => {
    const isLocked = phoneLandscapeQuery.matches || tabletPortraitQuery.matches;
    document.querySelectorAll('.view').forEach(view => {
      view.inert = isLocked;
    });

    if (!orientationLock) return;

    if (isLocked && !orientationLock.classList.contains('is-active')) {
      previouslyFocusedElement = document.activeElement;
      orientationLock.classList.add('is-active');
      orientationLock.focus();
    } else if (!isLocked && orientationLock.classList.contains('is-active')) {
      orientationLock.classList.remove('is-active');
      if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
        previouslyFocusedElement.focus();
      }
    }
  };

  // const isFullscreen = () =>
  // !!(document.fullscreenElement || document.webkitFullscreenElement);

// const updateOrientationLock = () => {
//   // Fullscreen video rotates the device to landscape; don't lock then.
//   const isLocked = !isFullscreen() &&
//     (phoneLandscapeQuery.matches || tabletPortraitQuery.matches);

//   document.querySelectorAll('.view').forEach(view => {
//     view.inert = isLocked;
//   });

//   if (!orientationLock) return;

//   if (isLocked && !orientationLock.classList.contains('is-active')) {
//     previouslyFocusedElement = document.activeElement;
//     orientationLock.classList.add('is-active');
//     orientationLock.focus();
//   } else if (!isLocked && orientationLock.classList.contains('is-active')) {
//     orientationLock.classList.remove('is-active');
//     if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
//       previouslyFocusedElement.focus();
//     }
//   }
// };

// document.addEventListener('fullscreenchange', () => {
//   if (!isFullscreen()) setTimeout(updateOrientationLock, 300);
// });



document.addEventListener('fullscreenchange', updateOrientationLock);
document.addEventListener('webkitfullscreenchange', updateOrientationLock);
  phoneLandscapeQuery.addEventListener('change', updateOrientationLock);
  tabletPortraitQuery.addEventListener('change', updateOrientationLock);
  window.addEventListener('resize', updateOrientationLock);
  window.addEventListener('orientationchange', updateOrientationLock);
  updateOrientationLock();

//   video.addEventListener('play', () => {
//   if (video.paused || isFullscreen()) return;
//   // ...rest unchanged
// });
  const portraitLayout = window.matchMedia(
    '(orientation: portrait) and (min-width: 951px) and (max-width: 1366px)'
  );
  const viewport = window.visualViewport;
  if (viewport) {
    const syncPortraitViewport = () => {
      const root = document.documentElement;
      if (!portraitLayout.matches || viewport.scale !== 1) {
        root.style.removeProperty('--portrait-viewport-inset');
        return;
      }
      // Safari's toolbars can cover part of the layout viewport.
      const inset = Math.max(0, root.clientHeight - viewport.height - viewport.offsetTop);
      root.style.setProperty('--portrait-viewport-inset', `${inset}px`);
    };
    viewport.addEventListener('resize', syncPortraitViewport);
    viewport.addEventListener('scroll', syncPortraitViewport);
    portraitLayout.addEventListener('change', syncPortraitViewport);
    syncPortraitViewport();
  }

  const touchVideoPreview = window.matchMedia('(any-pointer: coarse)');
  const phoneVideoPreview = window.matchMedia('(max-width: 599px) and (orientation: portrait)');

  document.querySelectorAll('video').forEach(video => {
    const player = document.createElement('div');
    player.className = 'video-player';
    video.parentNode.insertBefore(player, video);
    player.appendChild(video);

    const playButton = document.createElement('button');
    playButton.type = 'button';
    playButton.className = 'video-play-overlay';
    playButton.setAttribute('aria-label', `Play ${video.getAttribute('aria-label') || 'video'}`);
    playButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8v16.4L21 12 7 3.8Z" fill="currentColor"/></svg>';
    player.appendChild(playButton);

    const duration = video.closest('#physicochemicalInfoModal') ? document.createElement('span') : null;
    if (duration) {
      duration.className = 'video-preview-duration';
      duration.hidden = true;
      player.appendChild(duration);
    }

    function updateVideoControls() {
  const useCustomPlay = touchVideoPreview.matches || phoneVideoPreview.matches;

  // Custom overlay only before playback starts (or after it ends).
  // Never while the user is scrubbing or has paused mid-video.
  const isInitialOrEnded =
    video.ended || (video.paused && video.currentTime === 0 && !video.seeking);
  const showPlay = useCustomPlay && isInitialOrEnded;

  video.controls = !showPlay;
  playButton.hidden = !showPlay;

  if (duration) {
    duration.hidden = !showPlay || video.ended || !Number.isFinite(video.duration);
    if (!duration.hidden) {
      const seconds = Math.floor(video.duration);
      duration.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }
  }
}

    // function updateVideoControls() {
    //   const useCustomPlay = touchVideoPreview.matches || phoneVideoPreview.matches;
    //   const showPlay = video.paused || video.ended;
    //   video.controls = !useCustomPlay || !showPlay;
    //   playButton.hidden = !showPlay;
    //   if (duration) {
    //     duration.hidden = !useCustomPlay || !showPlay || video.currentTime !== 0 ||
    //       video.ended || !Number.isFinite(video.duration);
    //     if (!duration.hidden) {
    //       const seconds = Math.floor(video.duration);
    //       duration.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    //     }
    //   }
    // }
    // ['loadedmetadata', 'play', 'pause', 'ended', 'emptied', 'seeked'].forEach(event => {
    //   video.addEventListener(event, updateVideoControls);
    // });
    ['loadedmetadata', 'play', 'pause', 'ended', 'emptied'].forEach(event => {
      video.addEventListener(event, updateVideoControls);
    });
    touchVideoPreview.addEventListener('change', updateVideoControls);
    phoneVideoPreview.addEventListener('change', updateVideoControls);
    updateVideoControls();

    playButton.addEventListener('click', () => {
      video.play().catch(error => {
        updateVideoControls();
        if (error.name !== 'AbortError') {
          console.error('Video playback could not be started.', error);
        }
      });
      updateVideoControls();
    });
    video.addEventListener('play', () => {
      if (video.paused) return;
      if (video.classList.contains('overview-video')) {
        document.querySelectorAll('.overview-video').forEach(other => {
          if (other !== video) other.pause();
        });
        const main = video.closest('.main-content').getBoundingClientRect();
        const header = document.querySelector('.sideBarmobileheader').getBoundingClientRect();
        const footer = document.querySelector('#mechanical > .overview-footer').getBoundingClientRect();
        const frame = player.getBoundingClientRect();
        const top = Math.max(0, main.top, header.bottom);
        const bottom = Math.min(window.innerHeight, main.bottom, footer.top);
        if (frame.top < top || frame.bottom > bottom) {
          player.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      }
    });
  });

  // Default section inside app shell
  const firstTimeline = document.querySelector('.timeline-item');
  if (firstTimeline) firstTimeline.classList.add('active');

  // Make rheology timeline visible by default
  const rheologyTimeline = document.getElementById('rheology-timeline');
  if (rheologyTimeline) rheologyTimeline.style.display = 'flex';
});
