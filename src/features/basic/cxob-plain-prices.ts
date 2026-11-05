import $style from './cxob-plain-prices.module.css';

// Offer and request prices in the normal text color, so changes and marks stand out.
// Offers stay above the spread and requests below it.
function init() {
  applyCssRule(
    [`.${C.ComExOrderBookPanel.offerPrice}`, `.${C.ComExOrderBookPanel.requestPrice}`],
    $style.plain,
  );
}

features.add(import.meta.url, init, 'CXOB: Shows offer and request prices in the normal color.');
