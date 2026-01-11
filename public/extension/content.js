// Video Player Helper - Content Script
// Bu script "Edit with Lovable" badge'ini sayfadan kaldırır

(function() {
  'use strict';

  // Lovable badge'ini kaldıran fonksiyon
  function removeLovableBadge() {
    // Lovable badge için olası seçiciler
    const selectors = [
      '[data-lovable-badge]',
      '[class*="lovable-badge"]',
      '[id*="lovable-badge"]',
      'a[href*="lovable.dev"][target="_blank"]',
      '[class*="EditInLovable"]',
      '[data-testid*="lovable"]',
      // iframe içindeki badge
      'iframe[src*="lovable"]'
    ];

    let removed = false;

    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          // "Edit with Lovable" veya "Lovable" içeren elementleri kontrol et
          const text = el.textContent || el.innerText || '';
          const hasLovableText = text.toLowerCase().includes('lovable') || 
                                  text.toLowerCase().includes('edit with');
          
          if (hasLovableText || selector.includes('lovable')) {
            el.remove();
            removed = true;
            console.log('[Video Player Helper] Lovable badge kaldırıldı:', selector);
          }
        });
      } catch (e) {
        // Seçici hatası, devam et
      }
    });

    // Genel arama: "Edit with Lovable" içeren tüm elementler
    const allElements = document.querySelectorAll('a, button, div, span');
    allElements.forEach(el => {
      const text = (el.textContent || '').trim();
      if (text === 'Edit with Lovable' || text === 'Edit in Lovable') {
        // Parent element'i de kontrol et ve kaldır
        const parent = el.closest('div[style*="position: fixed"], div[style*="position:fixed"]');
        if (parent) {
          parent.remove();
          removed = true;
          console.log('[Video Player Helper] Lovable badge parent kaldırıldı');
        } else {
          el.remove();
          removed = true;
          console.log('[Video Player Helper] Lovable badge element kaldırıldı');
        }
      }
    });

    // Fixed position'lı Lovable badge'lerini bul
    const fixedElements = document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]');
    fixedElements.forEach(el => {
      const links = el.querySelectorAll('a[href*="lovable"]');
      if (links.length > 0) {
        el.remove();
        removed = true;
        console.log('[Video Player Helper] Fixed Lovable badge kaldırıldı');
      }
    });

    return removed;
  }

  // Sayfa yüklendiğinde çalıştır
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      removeLovableBadge();
    });
  } else {
    removeLovableBadge();
  }

  // DOM değişikliklerini izle (dinamik olarak eklenen badge'ler için)
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldCheck = true;
      }
    });

    if (shouldCheck) {
      // Debounce ile çalıştır
      clearTimeout(window._lovableBadgeTimeout);
      window._lovableBadgeTimeout = setTimeout(() => {
        removeLovableBadge();
      }, 100);
    }
  });

  // Body'yi izlemeye başla
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // Periyodik kontrol (bazı durumlarda gerekli olabilir)
  setInterval(() => {
    removeLovableBadge();
  }, 2000);

  console.log('[Video Player Helper] Lovable badge temizleyici aktif');
})();
